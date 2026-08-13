import json
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.models.campaign import Campaign
from app.models.operations import Call
from app.models.persona import Persona
from app.models.script import Script
from app.core.time import utcnow
from app.schemas.campaign import CAMPAIGN_STATUSES, CampaignCreate, CampaignOut, CampaignUpdate

router = APIRouter(prefix="/campaigns")


def _require_valid_status(status_value: str) -> None:
    if status_value not in CAMPAIGN_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid campaign status: {status_value}")


def _validate_references(db: Session, script_id: str | None, persona_id: str | None) -> None:
    if script_id and not db.query(Script).filter(Script.id == script_id).first():
        raise HTTPException(status_code=404, detail="Script not found")
    if persona_id and not db.query(Persona).filter(Persona.id == persona_id).first():
        raise HTTPException(status_code=404, detail="Persona not found")


def _validate_activation(db: Session, campaign: Campaign) -> None:
    if not campaign.script_id or not campaign.persona_id:
        raise HTTPException(status_code=409, detail="An active campaign requires an attached script and persona")
    if not all(value.strip() for value in (campaign.product, campaign.audience, campaign.goal, campaign.context)):
        raise HTTPException(status_code=409, detail="An active campaign requires product, audience, goal, and call context")
    if not all(value.strip() for value in (campaign.product, campaign.audience, campaign.goal, campaign.context)):
        raise HTTPException(status_code=409, detail="An active campaign requires product, audience, goal, and call context")
    script = db.query(Script).filter(Script.id == campaign.script_id).first()
    persona = db.query(Persona).filter(Persona.id == campaign.persona_id).first()
    if not script or not script.is_active:
        raise HTTPException(status_code=409, detail="An active campaign requires an active script")
    try:
        parsed = json.loads(script.content)
        nodes = parsed if isinstance(parsed, list) else parsed.get("nodes", [])
    except (TypeError, json.JSONDecodeError):
        nodes = []
    node_ids = [node.get("id") for node in nodes if isinstance(node, dict)]
    valid_types = {"opening", "discovery", "pitch", "objection", "closing"}
    valid_nodes = (
        len(nodes) >= 2
        and len(node_ids) == len(nodes)
        and all(isinstance(node_id, str) for node_id in node_ids)
        and len(set(node_ids)) == len(node_ids)
        and isinstance(nodes[0], dict)
        and nodes[0].get("type") == "opening"
        and all(
            isinstance(node, dict)
            and node.get("type") in valid_types
            and isinstance(node.get("id"), str)
            and isinstance(node.get("goal"), str) and node["goal"].strip()
            and isinstance(node.get("prompt"), str) and node["prompt"].strip()
            and isinstance(node.get("next_node_ids", []), list)
            and all(next_id in node_ids for next_id in node.get("next_node_ids", []))
            for node in nodes
        )
    )
    if not valid_nodes:
        raise HTTPException(status_code=409, detail="An active campaign requires a valid ordered node-based script")
    if not persona or not persona.is_active:
        raise HTTPException(status_code=409, detail="An active campaign requires an active persona")


def _transition(db: Session, campaign: Campaign, target: str) -> Campaign:
    allowed = {
        "draft": {"active"},
        "active": {"paused", "completed"},
        "paused": {"active", "completed"},
        "completed": {"archived"},
        "archived": set(),
    }
    if target not in allowed.get(campaign.status, set()):
        raise HTTPException(status_code=409, detail=f"Campaign cannot move from {campaign.status} to {target}")
    if target == "active":
        _validate_activation(db, campaign)
        script = db.query(Script).filter(Script.id == campaign.script_id).first()
        persona = db.query(Persona).filter(Persona.id == campaign.persona_id).first()
        campaign.script_snapshot_json = json.dumps({
            "id": script.id,
            "title": script.title,
            "summary": script.summary,
            "content": script.content,
        })
        campaign.persona_snapshot_json = json.dumps({
            "id": persona.id,
            "name": persona.name,
            "tone": persona.tone,
            "description": persona.description,
        })
    campaign.status = target
    now = utcnow()
    if target == "active":
        campaign.activated_at = now
    elif target == "completed":
        campaign.completed_at = now
    elif target == "archived":
        campaign.archived_at = now
    return campaign


def _stop_active_calls(db: Session, campaign: Campaign) -> None:
    """End live work when a campaign closes without deleting its audit history."""
    if campaign.status != "completed":
        return
    now = utcnow()
    active_calls = db.query(Call).filter(Call.campaign_id == campaign.id, Call.status == "active").all()
    for call in active_calls:
        call.status = "stopped"
        call.completed_at = now
        call.outcome = "campaign_ended"
        if not call.summary:
            call.summary = "Call stopped because the campaign was completed."


@router.get("", response_model=list[CampaignOut])
def list_campaigns(db: Session = Depends(get_db), _user=Depends(require_admin)):
    return db.query(Campaign).order_by(Campaign.created_at.desc()).all()


@router.post("", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
def create_campaign(payload: CampaignCreate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    _require_valid_status(payload.status)
    if payload.status != "draft":
        raise HTTPException(status_code=422, detail="New campaigns must begin as draft")
    _validate_references(db, payload.script_id, payload.persona_id)
    campaign = Campaign(
        id=str(uuid4()),
        name=payload.name,
        product=payload.product,
        audience=payload.audience,
        goal=payload.goal,
        script_id=payload.script_id,
        persona_id=payload.persona_id,
        context=payload.context,
        status=payload.status,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(campaign_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign


@router.put("/{campaign_id}", response_model=CampaignOut)
def update_campaign(campaign_id: str, payload: CampaignUpdate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    configuration_fields = (
        "name", "product", "audience", "goal", "script_id", "persona_id", "context",
    )
    has_configuration_change = any(getattr(payload, field) is not None for field in configuration_fields)
    if campaign.status in {"completed", "archived"} and has_configuration_change:
        raise HTTPException(
            status_code=409,
            detail="Completed and archived campaign configuration is read-only history",
        )
    if campaign.status == "active" and has_configuration_change:
        raise HTTPException(
            status_code=409,
            detail="Pause or complete the active campaign before changing its configuration",
        )
    _validate_references(db, payload.script_id, payload.persona_id)

    if payload.name is not None:
        campaign.name = payload.name
    if payload.product is not None:
        campaign.product = payload.product
    if payload.audience is not None:
        campaign.audience = payload.audience
    if payload.goal is not None:
        campaign.goal = payload.goal
    if payload.script_id is not None:
        campaign.script_id = payload.script_id
    if payload.persona_id is not None:
        campaign.persona_id = payload.persona_id
    if payload.context is not None:
        campaign.context = payload.context
    if payload.status is not None:
        _require_valid_status(payload.status)
        if payload.status != campaign.status:
            _transition(db, campaign, payload.status)
            _stop_active_calls(db, campaign)

    db.commit()
    db.refresh(campaign)
    return campaign


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(campaign_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    raise HTTPException(
        status_code=409,
        detail="Campaigns are retained for audit history. Complete and archive the campaign instead.",
    )


@router.post("/{campaign_id}/activate", response_model=CampaignOut)
def activate_campaign(campaign_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    _transition(db, campaign, "active")
    db.commit()
    db.refresh(campaign)
    return campaign


@router.post("/{campaign_id}/pause", response_model=CampaignOut)
def pause_campaign(campaign_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    _transition(db, campaign, "paused")
    db.commit()
    db.refresh(campaign)
    return campaign


@router.post("/{campaign_id}/complete", response_model=CampaignOut)
def complete_campaign(campaign_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    _transition(db, campaign, "completed")
    _stop_active_calls(db, campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.post("/{campaign_id}/archive", response_model=CampaignOut)
def archive_campaign(campaign_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    _transition(db, campaign, "archived")
    db.commit()
    db.refresh(campaign)
    return campaign

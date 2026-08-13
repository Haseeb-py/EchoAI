import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.campaign import Campaign
from app.models.persona import Persona
from app.models.script import Script
from app.models.operations import Call, Lead
from app.models.user import User
from app.schemas.operations import LeadUpdate
from app.schemas.agent import AgentCampaignOut

router = APIRouter(prefix="/agent")


@router.get("/campaigns", response_model=list[AgentCampaignOut])
def list_agent_campaigns(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Campaign).filter(Campaign.status == "active")
    if user.role == "agent":
        assigned_campaign_ids = db.query(Lead.campaign_id).filter(Lead.assigned_agent_id == user.id).distinct()
        query = query.filter(Campaign.id.in_(assigned_campaign_ids))
    elif user.role not in {"admin", "supervisor"}:
        raise HTTPException(status_code=403, detail="Campaign access is not available for this role")
    campaigns = query.order_by(Campaign.created_at.desc()).all()

    script_ids = {campaign.script_id for campaign in campaigns if campaign.script_id}
    persona_ids = {campaign.persona_id for campaign in campaigns if campaign.persona_id}

    scripts = db.query(Script).filter(Script.id.in_(script_ids)).all() if script_ids else []
    personas = db.query(Persona).filter(Persona.id.in_(persona_ids)).all() if persona_ids else []

    script_map = {script.id: script for script in scripts}
    persona_map = {persona.id: persona for persona in personas}

    return [
        AgentCampaignOut(
            id=campaign.id,
            name=campaign.name,
            product=campaign.product,
            audience=campaign.audience,
            goal=campaign.goal,
            status=campaign.status,
            script=script_map.get(campaign.script_id),
            persona=persona_map.get(campaign.persona_id),
        )
        for campaign in campaigns
    ]


@router.get("/leads")
def list_agent_leads(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Agent CRM read model, including post-call outputs needed for follow-up."""
    query = db.query(Lead)
    if user.role == "agent":
        query = query.filter(Lead.assigned_agent_id == user.id)
    elif user.role not in {"admin", "supervisor"}:
        raise HTTPException(status_code=403, detail="Lead access is not available for this role")
    leads = query.order_by(Lead.created_at.desc()).all()
    campaigns = {campaign.id: campaign.name for campaign in db.query(Campaign).all()}
    latest_calls: dict[str, Call] = {}
    calls = db.query(Call).filter(Call.lead_id.is_not(None)).order_by(Call.completed_at.desc(), Call.started_at.desc()).all()
    for call in calls:
        if call.lead_id:
            latest_calls.setdefault(call.lead_id, call)
    return [
        {
            "id": lead.id, "name": lead.name, "contact": lead.contact, "score": lead.score, "status": lead.status,
            "assigned_agent_id": lead.assigned_agent_id,
            "campaign_id": lead.campaign_id, "campaign_name": campaigns.get(lead.campaign_id, "Unknown campaign"),
            "summary": lead.summary,
            "latest_call": {
                "id": call.id, "outcome": call.outcome, "summary": call.summary,
                "analysis": json.loads(call.analysis_json or "{}"), "follow_up_recommendation": call.follow_up_recommendation,
                "completed_at": call.completed_at,
            } if (call := latest_calls.get(lead.id)) else None,
        }
        for lead in leads
    ]


@router.put("/leads/{lead_id}")
def update_agent_lead(lead_id: str, payload: LeadUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Agents can maintain CRM disposition and score, not campaign ownership or identity."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if user.role != "admin" and (user.role != "agent" or lead.assigned_agent_id != user.id):
        raise HTTPException(status_code=403, detail="You can only update leads assigned to you")
    updates = payload.model_dump(exclude_unset=True)
    for field in {"status", "score"} & updates.keys():
        setattr(lead, field, updates[field])
    db.commit()
    db.refresh(lead)
    return {"id": lead.id, "status": lead.status, "score": lead.score}


@router.get("/leads/{lead_id}")
def get_agent_lead(lead_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if user.role != "admin" and (user.role != "agent" or lead.assigned_agent_id != user.id):
        raise HTTPException(status_code=403, detail="You do not have access to this lead")
    campaign = db.query(Campaign).filter(Campaign.id == lead.campaign_id).first()
    calls = db.query(Call).filter(Call.lead_id == lead.id).order_by(Call.completed_at.desc(), Call.started_at.desc()).all()
    return {
        "id": lead.id, "name": lead.name, "contact": lead.contact, "score": lead.score, "status": lead.status,
        "assigned_agent_id": lead.assigned_agent_id,
        "campaign_id": lead.campaign_id, "campaign_name": campaign.name if campaign else "Unknown campaign", "summary": lead.summary,
        "calls": [
            {
                "id": call.id, "status": call.status, "outcome": call.outcome, "summary": call.summary,
                "analysis": json.loads(call.analysis_json or "{}"), "follow_up_recommendation": call.follow_up_recommendation,
                "started_at": call.started_at, "completed_at": call.completed_at,
            }
            for call in calls
        ],
    }

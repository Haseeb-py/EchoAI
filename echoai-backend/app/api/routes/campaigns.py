from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.models.campaign import Campaign
from app.schemas.campaign import CampaignCreate, CampaignOut, CampaignUpdate

router = APIRouter(prefix="/campaigns")


@router.get("", response_model=list[CampaignOut])
def list_campaigns(db: Session = Depends(get_db), _user=Depends(require_admin)):
    return db.query(Campaign).order_by(Campaign.created_at.desc()).all()


@router.post("", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
def create_campaign(payload: CampaignCreate, db: Session = Depends(get_db), _user=Depends(require_admin)):
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
        campaign.status = payload.status

    db.commit()
    db.refresh(campaign)
    return campaign


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(campaign_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return None


@router.post("/{campaign_id}/activate", response_model=CampaignOut)
def activate_campaign(campaign_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    campaign.status = "active"
    campaign.activated_at = datetime.utcnow()
    db.commit()
    db.refresh(campaign)
    return campaign


@router.post("/{campaign_id}/pause", response_model=CampaignOut)
def pause_campaign(campaign_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    campaign.status = "paused"
    db.commit()
    db.refresh(campaign)
    return campaign

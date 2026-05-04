from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.campaign import Campaign
from app.models.persona import Persona
from app.models.script import Script
from app.schemas.agent import AgentCampaignOut

router = APIRouter(prefix="/agent")


@router.get("/campaigns", response_model=list[AgentCampaignOut])
def list_agent_campaigns(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    campaigns = (
        db.query(Campaign)
        .filter(Campaign.status == "active")
        .order_by(Campaign.created_at.desc())
        .all()
    )

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

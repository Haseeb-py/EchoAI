from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.models.persona import Persona
from app.schemas.persona import PersonaCreate, PersonaOut, PersonaUpdate

router = APIRouter(prefix="/personas")


@router.get("", response_model=list[PersonaOut])
def list_personas(db: Session = Depends(get_db), _user=Depends(require_admin)):
    return db.query(Persona).order_by(Persona.created_at.desc()).all()


@router.post("", response_model=PersonaOut, status_code=status.HTTP_201_CREATED)
def create_persona(payload: PersonaCreate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    persona = Persona(
        id=str(uuid4()),
        name=payload.name,
        tone=payload.tone,
        description=payload.description,
        is_active=payload.is_active,
    )
    db.add(persona)
    db.commit()
    db.refresh(persona)
    return persona


@router.get("/{persona_id}", response_model=PersonaOut)
def get_persona(persona_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")
    return persona


@router.put("/{persona_id}", response_model=PersonaOut)
def update_persona(persona_id: str, payload: PersonaUpdate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")

    if payload.name is not None:
        persona.name = payload.name
    if payload.tone is not None:
        persona.tone = payload.tone
    if payload.description is not None:
        persona.description = payload.description
    if payload.is_active is not None:
        persona.is_active = payload.is_active

    db.commit()
    db.refresh(persona)
    return persona


@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_persona(persona_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")
    db.delete(persona)
    db.commit()
    return None

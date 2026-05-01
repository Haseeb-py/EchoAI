from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.models.script import Script
from app.schemas.script import ScriptCreate, ScriptOut, ScriptUpdate

router = APIRouter(prefix="/scripts")


@router.get("", response_model=list[ScriptOut])
def list_scripts(db: Session = Depends(get_db), _user=Depends(require_admin)):
    return db.query(Script).order_by(Script.created_at.desc()).all()


@router.post("", response_model=ScriptOut, status_code=status.HTTP_201_CREATED)
def create_script(payload: ScriptCreate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    script = Script(
        id=str(uuid4()),
        title=payload.title,
        summary=payload.summary,
        content=payload.content,
        is_active=payload.is_active,
    )
    db.add(script)
    db.commit()
    db.refresh(script)
    return script


@router.get("/{script_id}", response_model=ScriptOut)
def get_script(script_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Script not found")
    return script


@router.put("/{script_id}", response_model=ScriptOut)
def update_script(script_id: str, payload: ScriptUpdate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Script not found")

    if payload.title is not None:
        script.title = payload.title
    if payload.summary is not None:
        script.summary = payload.summary
    if payload.content is not None:
        script.content = payload.content
    if payload.is_active is not None:
        script.is_active = payload.is_active

    db.commit()
    db.refresh(script)
    return script


@router.delete("/{script_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_script(script_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Script not found")
    db.delete(script)
    db.commit()
    return None

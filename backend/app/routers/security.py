import json
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import SecurityEvent, User
from app.schemas.schemas import SecurityEventResponse, SecurityStatusResponse
from app.services.security_service import SecurityService
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/security", tags=["Security Monitoring"])

@router.get("/status", response_model=SecurityStatusResponse)
def get_security_status(db: Session = Depends(get_db)):
    status_data = SecurityService.get_system_security_status(db)
    unresolved_resp = []

    for ev in status_data["unresolved_events"]:
        try:
            details_dict = json.loads(ev.details_json) if ev.details_json else {}
        except Exception:
            details_dict = {}

        unresolved_resp.append(SecurityEventResponse(
            id=ev.id,
            timestamp=ev.timestamp,
            risk_level=ev.risk_level,
            category=ev.category,
            title=ev.title,
            what_happened=ev.what_happened,
            why_it_matters=ev.why_it_matters,
            what_to_do=ev.what_to_do,
            actor_name=ev.actor_name,
            case_id=ev.case_id,
            document_id=ev.document_id,
            is_resolved=ev.is_resolved,
            resolved_at=ev.resolved_at,
            details=details_dict
        ))

    return SecurityStatusResponse(
        status=status_data["status"],
        headline=status_data["headline"],
        description=status_data["description"],
        active_incidents_count=status_data["active_incidents_count"],
        unresolved_events=unresolved_resp
    )

@router.get("/events", response_model=List[SecurityEventResponse])
def get_security_events(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    events = db.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).limit(limit).all()
    results = []

    for ev in events:
        try:
            details_dict = json.loads(ev.details_json) if ev.details_json else {}
        except Exception:
            details_dict = {}

        results.append(SecurityEventResponse(
            id=ev.id,
            timestamp=ev.timestamp,
            risk_level=ev.risk_level,
            category=ev.category,
            title=ev.title,
            what_happened=ev.what_happened,
            why_it_matters=ev.why_it_matters,
            what_to_do=ev.what_to_do,
            actor_name=ev.actor_name,
            case_id=ev.case_id,
            document_id=ev.document_id,
            is_resolved=ev.is_resolved,
            resolved_at=ev.resolved_at,
            details=details_dict
        ))

    return results

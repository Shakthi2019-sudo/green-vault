import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.models import SecurityEvent, User, Document
from app.services.blockchain_service import BlockchainService

class SecurityService:
    @classmethod
    def log_security_event(
        cls,
        db: Session,
        category: str,
        title: str,
        risk_level: str,
        what_happened: str,
        why_it_matters: str,
        what_to_do: str,
        actor_user: Optional[User] = None,
        case_id: Optional[str] = None,
        document_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> SecurityEvent:
        """
        Record and evaluate security event, logging to DB and Blockchain ledger.
        """
        event_id = f"SEC-{uuid.uuid4().hex[:8].upper()}"
        details = details or {}

        event = SecurityEvent(
            id=event_id,
            timestamp=datetime.utcnow(),
            risk_level=risk_level,
            category=category,
            title=title,
            what_happened=what_happened,
            why_it_matters=why_it_matters,
            what_to_do=what_to_do,
            actor_user_id=actor_user.id if actor_user else None,
            actor_name=actor_user.full_name if actor_user else "Unknown / Anonymous",
            case_id=case_id,
            document_id=document_id,
            is_resolved=False,
            details_json=json.dumps(details)
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        # Record to Blockchain
        BlockchainService.recordSecurityIncident(
            db=db,
            incident_id=event_id,
            incident_type=title,
            risk_level=risk_level,
            actor_name=actor_user.full_name if actor_user else "Security System",
            actor_role=actor_user.sub_role if actor_user else "Automated Monitor",
            case_id=case_id,
            document_id=document_id,
            details={
                "what_happened": what_happened,
                "why_it_matters": why_it_matters,
                "risk_level": risk_level,
                **details
            }
        )

        return event

    @classmethod
    def get_system_security_status(cls, db: Session) -> Dict[str, Any]:
        """
        Calculate overall system security health:
        GREEN: No unresolved HIGH or CRITICAL events.
        YELLOW: Active MEDIUM risk events or recent alerts.
        RED: Active HIGH or CRITICAL unresolved incidents (e.g. document tampering, unauthorized mass access).
        """
        unresolved = db.query(SecurityEvent).filter(SecurityEvent.is_resolved == False).order_by(SecurityEvent.timestamp.desc()).all()

        has_critical = any(e.risk_level == "CRITICAL" for e in unresolved)
        has_high = any(e.risk_level == "HIGH" for e in unresolved)
        has_medium = any(e.risk_level == "MEDIUM" for e in unresolved)

        if has_critical or has_high:
            status = "RED"
            headline = "Immediate attention is required."
            description = "One or more high-priority security incidents have been detected. Affected documents have been restricted and isolated recovery copies are available."
        elif has_medium or len(unresolved) > 0:
            status = "YELLOW"
            headline = "Something unusual was detected."
            description = "Security monitoring flagged unusual access or login patterns. Review recent incidents below."
        else:
            status = "GREEN"
            headline = "Everything looks normal."
            description = "All legal records verified. No security anomalies or unauthorized modifications detected."

        return {
            "status": status,
            "headline": headline,
            "description": description,
            "active_incidents_count": len(unresolved),
            "unresolved_events": unresolved
        }

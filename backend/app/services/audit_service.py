import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.models import AuditEvent, User

class AuditService:
    @classmethod
    def log_event(
        cls,
        db: Session,
        actor: Optional[User],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        outcome: str = "SUCCESS",
        ip_address: str = "127.0.0.1",
        details: Optional[Dict[str, Any]] = None
    ) -> AuditEvent:
        event = AuditEvent(
            id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
            timestamp=datetime.now(timezone.utc),
            actor_id=actor.id if actor else None,
            actor_name=actor.full_name if actor else "System",
            actor_role=actor.sub_role if actor else "Automated Process",
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            outcome=outcome,
            details_json=json.dumps(details or {})
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @classmethod
    def get_logs(cls, db: Session, limit: int = 100) -> List[AuditEvent]:
        return db.query(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(limit).all()

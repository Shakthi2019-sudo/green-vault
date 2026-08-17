from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import ConnectedSystem

class IntegrationService:
    @classmethod
    def get_all_systems(cls, db: Session) -> List[ConnectedSystem]:
        return db.query(ConnectedSystem).all()

    @classmethod
    def sync_mock_system(cls, db: Session, system_id: str) -> Dict[str, Any]:
        """Trigger simulated synchronization with mock legal system."""
        sys_obj = db.query(ConnectedSystem).filter(ConnectedSystem.id == system_id).first()
        if not sys_obj:
            return {"success": False, "message": "System not found"}

        sys_obj.last_sync = datetime.now(timezone.utc)
        sys_obj.records_count += 3
        db.commit()
        db.refresh(sys_obj)

        return {
            "success": True,
            "system_name": sys_obj.system_name,
            "status": sys_obj.status,
            "records_count": sys_obj.records_count,
            "last_sync": sys_obj.last_sync.isoformat(),
            "disclaimer": "Demo integration — no live government API connection."
        }

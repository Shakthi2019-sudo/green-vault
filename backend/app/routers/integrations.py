from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import ConnectedSystem
from app.schemas.schemas import ConnectedSystemResponse
from app.services.integration_service import IntegrationService

router = APIRouter(prefix="/integrations", tags=["Connected Legal Systems"])

@router.get("/systems", response_model=List[ConnectedSystemResponse])
def get_connected_systems(db: Session = Depends(get_db)):
    systems = IntegrationService.get_all_systems(db)
    return [ConnectedSystemResponse.from_orm(s) for s in systems]

@router.post("/sync/{system_id}")
def sync_connected_system(system_id: str, db: Session = Depends(get_db)):
    return IntegrationService.sync_mock_system(db, system_id)

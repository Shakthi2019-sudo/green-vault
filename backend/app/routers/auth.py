from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.models import User
from app.schemas.schemas import LoginRequest, TokenResponse, UserResponse, DemoUserItem
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_user_assigned_cases,
    get_user_permissions_list
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.username, request.password)
    if not user:
        AuditService.log_event(
            db=db,
            actor=None,
            action="LOGIN_FAILED",
            resource_type="AUTH",
            resource_id=request.username,
            outcome="DENIED",
            details={"username_attempted": request.username}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})

    AuditService.log_event(
        db=db,
        actor=user,
        action="LOGIN_SUCCESS",
        resource_type="AUTH",
        resource_id=user.username,
        outcome="SUCCESS"
    )

    assigned_cases = get_user_assigned_cases(db, user.id)
    permissions = get_user_permissions_list(db, user.id)

    user_resp = UserResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        sub_role=user.sub_role,
        assigned_cases=assigned_cases,
        permissions=permissions
    )

    return TokenResponse(access_token=access_token, token_type="bearer", user=user_resp)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    assigned_cases = get_user_assigned_cases(db, current_user.id)
    permissions = get_user_permissions_list(db, current_user.id)

    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        full_name=current_user.full_name,
        email=current_user.email,
        role=current_user.role,
        sub_role=current_user.sub_role,
        assigned_cases=assigned_cases,
        permissions=permissions
    )

@router.get("/demo-users", response_model=list[DemoUserItem])
def get_demo_users(db: Session = Depends(get_db)):
    """
    Returns public demo user roles for quick demo switching in UI.
    Does NOT return passwords.
    """
    users = db.query(User).filter(User.is_active == True).all()
    results = []
    for u in users:
        assigned = get_user_assigned_cases(db, u.id)
        results.append(DemoUserItem(
            username=u.username,
            role=u.role,
            sub_role=u.sub_role,
            full_name=u.full_name,
            assigned_cases=assigned
        ))
    return results

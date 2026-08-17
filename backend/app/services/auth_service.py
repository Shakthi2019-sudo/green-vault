from datetime import datetime, timedelta, timezone
from typing import Optional, List
import jwt
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import settings
from app.database.database import get_db
from app.models.models import User, CaseAssignment, Permission
from app.utils.crypto import verify_password, hash_password

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

def get_current_user(
    auth_header_token: Optional[str] = Depends(oauth2_scheme),
    token_param: Optional[str] = Query(None, alias="token"),
    query_token: Optional[str] = Query(None, alias="query_token"),
    db: Session = Depends(get_db)
) -> User:
    """
    Validates JWT credentials from Authorization: Bearer header or fallback query param (?token= or ?query_token=).
    Enforces strict signature verification and expiration checks.
    """
    token = auth_header_token or token_param or query_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication session token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def get_user_assigned_cases(db: Session, user_id: int) -> List[str]:
    assignments = db.query(CaseAssignment).filter(CaseAssignment.user_id == user_id).all()
    return [a.case_id for a in assignments]

def get_user_permissions_list(db: Session, user_id: int) -> List[str]:
    perms = db.query(Permission).filter(Permission.user_id == user_id).all()
    # List format: "PERM_TYPE:CASE_ID" or "PERM_TYPE:CASE_ID:DOC_ID"
    result = []
    for p in perms:
        if p.document_id:
            result.append(f"{p.permission_type}:{p.case_id}:{p.document_id}")
        else:
            result.append(f"{p.permission_type}:{p.case_id}")
    return result

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from sqlalchemy.orm import Session

from app import models
from app.core.config import settings
from app.core.db import get_db

auth_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """
    Validate Clerk JWT and return the current user.
    Creates the user in the local database if they don't exist.
    """
    token = credentials.credentials

    try:
        # Decode without verification for demo purposes
        # In production, you should verify the JWT signature using Clerk's JWKS
        payload = jwt.get_unverified_claims(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    clerk_user_id = payload.get("sub")
    email = payload.get("email") or payload.get("email_addresses", [{}])[0].get("email_address")

    if clerk_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing user ID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing email",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Find or create user
    user = db.query(models.User).filter_by(clerk_user_id=clerk_user_id).first()

    if not user:
        # Get full name from various possible claim locations
        full_name = payload.get("name") or payload.get("full_name")
        if not full_name:
            first = payload.get("first_name", "")
            last = payload.get("last_name", "")
            full_name = f"{first} {last}".strip() or None

        user = models.User(
            clerk_user_id=clerk_user_id,
            email=email,
            full_name=full_name,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user

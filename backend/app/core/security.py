from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from clerk_backend_api import Clerk, authenticate_request, AuthenticateRequestOptions
from sqlalchemy.orm import Session

from app import models
from app.core.config import settings
from app.core.db import get_db

auth_scheme = HTTPBearer()


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """
    Validate Clerk JWT and return the current user.
    Creates the user in the local database if they don't exist.
    """
    try:
        result = authenticate_request(
            request,
            AuthenticateRequestOptions(
                secret_key=settings.clerk_secret_key,
                authorized_parties=settings.clerk_authorized_parties,
            ),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Error verifying Clerk token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not result.is_signed_in:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result.message or "Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    clerk_user_id = result.payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing user ID in Clerk token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Find or create user
    user = db.query(models.User).filter_by(clerk_user_id=clerk_user_id).first()

    if not user:
        # Fetch user details from Clerk API
        email = None
        full_name = None

        try:
            with Clerk(bearer_auth=settings.clerk_secret_key) as clerk:
                clerk_user = clerk.users.get(user_id=clerk_user_id)
                if clerk_user:
                    # Get primary email
                    if clerk_user.email_addresses:
                        primary_email = next(
                            (e for e in clerk_user.email_addresses if e.id == clerk_user.primary_email_address_id),
                            clerk_user.email_addresses[0] if clerk_user.email_addresses else None,
                        )
                        if primary_email:
                            email = primary_email.email_address

                    # Get full name
                    first = clerk_user.first_name or ""
                    last = clerk_user.last_name or ""
                    full_name = f"{first} {last}".strip() or None
        except Exception:
            # If we can't fetch from Clerk, try to get from JWT claims
            email = result.payload.get("email")
            full_name = result.payload.get("name")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not determine user email",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = models.User(
            clerk_user_id=clerk_user_id,
            email=email,
            full_name=full_name,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user

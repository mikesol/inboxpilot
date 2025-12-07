from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas import MeResponse, UserResponse, WorkspaceWithRole

router = APIRouter()


@router.get("", response_model=MeResponse)
async def get_me(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> MeResponse:
    """Get current user info and their workspaces."""
    # Get user's workspaces with roles
    memberships = (
        db.query(models.WorkspaceMember)
        .filter_by(user_id=current_user.id)
        .all()
    )

    workspaces_with_roles = []
    for membership in memberships:
        workspace = membership.workspace
        workspaces_with_roles.append(
            WorkspaceWithRole(
                id=workspace.id,
                name=workspace.name,
                created_at=workspace.created_at,
                role=membership.role,
            )
        )

    return MeResponse(
        user=UserResponse(
            id=current_user.id,
            email=current_user.email,
            full_name=current_user.full_name,
            clerk_user_id=current_user.clerk_user_id,
            created_at=current_user.created_at,
        ),
        workspaces=workspaces_with_roles,
    )

from uuid import UUID

from fastapi import Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models
from app.core.db import get_db
from app.core.security import get_current_user


async def get_current_workspace(
    workspace_id: UUID = Query(..., description="The workspace ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> models.Workspace:
    """
    Get the current workspace and verify the user has access to it.
    """
    # Check if user is a member of this workspace
    membership = (
        db.query(models.WorkspaceMember)
        .filter_by(workspace_id=workspace_id, user_id=current_user.id)
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this workspace",
        )

    workspace = db.query(models.Workspace).filter_by(id=workspace_id).first()

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )

    return workspace


def log_activity(
    db: Session,
    workspace_id: UUID,
    user_id: UUID | None,
    activity_type: str,
    payload: dict,
) -> models.ActivityLog:
    """
    Helper function to log an activity event.
    """
    activity = models.ActivityLog(
        workspace_id=workspace_id,
        user_id=user_id,
        type=activity_type,
        payload=payload,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity

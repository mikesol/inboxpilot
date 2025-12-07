from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app import models
from app.api.deps import get_current_workspace
from app.core.db import get_db
from app.schemas import ActivityLogResponse

router = APIRouter()


@router.get("", response_model=list[ActivityLogResponse])
async def list_activity(
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[ActivityLogResponse]:
    """List recent activity in a workspace."""
    activities = (
        db.query(models.ActivityLog)
        .options(joinedload(models.ActivityLog.user))
        .filter_by(workspace_id=workspace.id)
        .order_by(models.ActivityLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return activities

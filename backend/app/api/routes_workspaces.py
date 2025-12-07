from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models
from app.api.deps import log_activity
from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas import WorkspaceCreate, WorkspaceResponse, WorkspaceUpdate

router = APIRouter()


@router.get("", response_model=list[WorkspaceResponse])
async def list_workspaces(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[WorkspaceResponse]:
    """List all workspaces the current user is a member of."""
    memberships = (
        db.query(models.WorkspaceMember)
        .filter_by(user_id=current_user.id)
        .all()
    )

    workspaces = [membership.workspace for membership in memberships]
    return workspaces


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> WorkspaceResponse:
    """Create a new workspace. The creating user becomes the owner."""
    # Create workspace
    workspace = models.Workspace(name=data.name)
    db.add(workspace)
    db.flush()

    # Add creating user as owner
    membership = models.WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(membership)

    # Log activity
    log_activity(
        db=db,
        workspace_id=workspace.id,
        user_id=current_user.id,
        activity_type="workspace.created",
        payload={"workspace_name": workspace.name},
    )

    db.commit()
    db.refresh(workspace)

    return workspace


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> WorkspaceResponse:
    """Get workspace details."""
    # Verify user has access
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


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: UUID,
    data: WorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> WorkspaceResponse:
    """Update workspace details. Only owners can update."""
    membership = (
        db.query(models.WorkspaceMember)
        .filter_by(workspace_id=workspace_id, user_id=current_user.id)
        .first()
    )

    if not membership or membership.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners can update workspace settings",
        )

    workspace = db.query(models.Workspace).filter_by(id=workspace_id).first()

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )

    if data.name is not None:
        workspace.name = data.name

    db.commit()
    db.refresh(workspace)

    return workspace

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_workspace, log_activity
from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas import ContactCreate, ContactResponse, ContactUpdate

router = APIRouter()


@router.get("", response_model=list[ContactResponse])
async def list_contacts(
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
    search: str | None = Query(None, description="Search by email, name, or company"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[ContactResponse]:
    """List contacts in a workspace with optional filtering."""
    query = db.query(models.Contact).filter_by(workspace_id=workspace.id)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (models.Contact.email.ilike(search_term))
            | (models.Contact.first_name.ilike(search_term))
            | (models.Contact.last_name.ilike(search_term))
            | (models.Contact.company.ilike(search_term))
        )

    if status_filter:
        query = query.filter_by(status=status_filter)

    contacts = query.order_by(models.Contact.created_at.desc()).offset(offset).limit(limit).all()

    return contacts


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    data: ContactCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> ContactResponse:
    """Create a new contact."""
    # Verify user has access to the workspace
    membership = (
        db.query(models.WorkspaceMember)
        .filter_by(workspace_id=data.workspace_id, user_id=current_user.id)
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this workspace",
        )

    # Check if contact with this email already exists in workspace
    existing = (
        db.query(models.Contact)
        .filter_by(workspace_id=data.workspace_id, email=data.email)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A contact with this email already exists in this workspace",
        )

    contact = models.Contact(
        workspace_id=data.workspace_id,
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
        company=data.company,
        title=data.title,
    )
    db.add(contact)
    db.flush()

    # Log activity
    log_activity(
        db=db,
        workspace_id=data.workspace_id,
        user_id=current_user.id,
        activity_type="contact.created",
        payload={
            "contact_id": str(contact.id),
            "contact_email": contact.email,
            "contact_name": f"{contact.first_name or ''} {contact.last_name or ''}".strip(),
        },
    )

    db.commit()
    db.refresh(contact)

    return contact


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: UUID,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
) -> ContactResponse:
    """Get a specific contact."""
    contact = (
        db.query(models.Contact)
        .filter_by(id=contact_id, workspace_id=workspace.id)
        .first()
    )

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    return contact


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: UUID,
    data: ContactUpdate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> ContactResponse:
    """Update a contact."""
    contact = (
        db.query(models.Contact)
        .filter_by(id=contact_id, workspace_id=workspace.id)
        .first()
    )

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    # Update fields if provided
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)

    db.commit()
    db.refresh(contact)

    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: UUID,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> None:
    """Delete a contact."""
    contact = (
        db.query(models.Contact)
        .filter_by(id=contact_id, workspace_id=workspace.id)
        .first()
    )

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    # Log activity before deletion
    log_activity(
        db=db,
        workspace_id=workspace.id,
        user_id=current_user.id,
        activity_type="contact.deleted",
        payload={
            "contact_id": str(contact.id),
            "contact_email": contact.email,
        },
    )

    db.delete(contact)
    db.commit()

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app import models
from app.api.deps import get_current_workspace, log_activity
from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas import (
    EnrollmentCreate,
    EnrollmentResponse,
    SequenceCreate,
    SequenceResponse,
    SequenceStepCreate,
    SequenceStepResponse,
    SequenceStepUpdate,
    SequenceUpdate,
    SequenceWithSteps,
)

router = APIRouter()


# ============ Sequences ============


@router.get("", response_model=list[SequenceResponse])
async def list_sequences(
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
) -> list[SequenceResponse]:
    """List all sequences in a workspace."""
    sequences = (
        db.query(models.Sequence)
        .filter_by(workspace_id=workspace.id)
        .order_by(models.Sequence.created_at.desc())
        .all()
    )
    return sequences


@router.post("", response_model=SequenceResponse, status_code=status.HTTP_201_CREATED)
async def create_sequence(
    data: SequenceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> SequenceResponse:
    """Create a new sequence."""
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

    sequence = models.Sequence(
        workspace_id=data.workspace_id,
        name=data.name,
        description=data.description,
    )
    db.add(sequence)
    db.flush()

    log_activity(
        db=db,
        workspace_id=data.workspace_id,
        user_id=current_user.id,
        activity_type="sequence.created",
        payload={
            "sequence_id": str(sequence.id),
            "sequence_name": sequence.name,
        },
    )

    db.commit()
    db.refresh(sequence)

    return sequence


@router.get("/{sequence_id}", response_model=SequenceWithSteps)
async def get_sequence(
    sequence_id: UUID,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
) -> SequenceWithSteps:
    """Get a sequence with its steps."""
    sequence = (
        db.query(models.Sequence)
        .options(joinedload(models.Sequence.steps))
        .filter_by(id=sequence_id, workspace_id=workspace.id)
        .first()
    )

    if not sequence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sequence not found",
        )

    return sequence


@router.put("/{sequence_id}", response_model=SequenceResponse)
async def update_sequence(
    sequence_id: UUID,
    data: SequenceUpdate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
) -> SequenceResponse:
    """Update a sequence."""
    sequence = (
        db.query(models.Sequence)
        .filter_by(id=sequence_id, workspace_id=workspace.id)
        .first()
    )

    if not sequence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sequence not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sequence, field, value)

    db.commit()
    db.refresh(sequence)

    return sequence


@router.delete("/{sequence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sequence(
    sequence_id: UUID,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> None:
    """Delete a sequence."""
    sequence = (
        db.query(models.Sequence)
        .filter_by(id=sequence_id, workspace_id=workspace.id)
        .first()
    )

    if not sequence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sequence not found",
        )

    log_activity(
        db=db,
        workspace_id=workspace.id,
        user_id=current_user.id,
        activity_type="sequence.deleted",
        payload={
            "sequence_id": str(sequence.id),
            "sequence_name": sequence.name,
        },
    )

    db.delete(sequence)
    db.commit()


# ============ Steps ============


@router.post("/{sequence_id}/steps", response_model=SequenceStepResponse, status_code=status.HTTP_201_CREATED)
async def add_step(
    sequence_id: UUID,
    data: SequenceStepCreate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
) -> SequenceStepResponse:
    """Add a step to a sequence."""
    sequence = (
        db.query(models.Sequence)
        .filter_by(id=sequence_id, workspace_id=workspace.id)
        .first()
    )

    if not sequence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sequence not found",
        )

    step = models.SequenceStep(
        sequence_id=sequence_id,
        step_order=data.step_order,
        subject_template=data.subject_template,
        body_template=data.body_template,
        delay_days=data.delay_days,
    )
    db.add(step)
    db.commit()
    db.refresh(step)

    return step


@router.put("/{sequence_id}/steps/{step_id}", response_model=SequenceStepResponse)
async def update_step(
    sequence_id: UUID,
    step_id: UUID,
    data: SequenceStepUpdate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
) -> SequenceStepResponse:
    """Update a step in a sequence."""
    step = (
        db.query(models.SequenceStep)
        .join(models.Sequence)
        .filter(
            models.SequenceStep.id == step_id,
            models.SequenceStep.sequence_id == sequence_id,
            models.Sequence.workspace_id == workspace.id,
        )
        .first()
    )

    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Step not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(step, field, value)

    db.commit()
    db.refresh(step)

    return step


@router.delete("/{sequence_id}/steps/{step_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_step(
    sequence_id: UUID,
    step_id: UUID,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
) -> None:
    """Delete a step from a sequence."""
    step = (
        db.query(models.SequenceStep)
        .join(models.Sequence)
        .filter(
            models.SequenceStep.id == step_id,
            models.SequenceStep.sequence_id == sequence_id,
            models.Sequence.workspace_id == workspace.id,
        )
        .first()
    )

    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Step not found",
        )

    db.delete(step)
    db.commit()


# ============ Enrollments ============


@router.post("/{sequence_id}/enroll", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def enroll_contact(
    sequence_id: UUID,
    data: EnrollmentCreate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> EnrollmentResponse:
    """Enroll a contact into a sequence."""
    # Verify sequence exists and belongs to workspace
    sequence = (
        db.query(models.Sequence)
        .filter_by(id=sequence_id, workspace_id=workspace.id)
        .first()
    )

    if not sequence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sequence not found",
        )

    # Verify contact exists and belongs to workspace
    contact = (
        db.query(models.Contact)
        .filter_by(id=data.contact_id, workspace_id=workspace.id)
        .first()
    )

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    # Check if already enrolled
    existing = (
        db.query(models.SequenceEnrollment)
        .filter_by(sequence_id=sequence_id, contact_id=data.contact_id)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Contact is already enrolled in this sequence",
        )

    # Get first step to schedule
    first_step = (
        db.query(models.SequenceStep)
        .filter_by(sequence_id=sequence_id)
        .order_by(models.SequenceStep.step_order)
        .first()
    )

    next_scheduled = None
    if first_step:
        next_scheduled = datetime.now(timezone.utc) + timedelta(days=first_step.delay_days)

    enrollment = models.SequenceEnrollment(
        sequence_id=sequence_id,
        contact_id=data.contact_id,
        next_scheduled_at=next_scheduled,
    )
    db.add(enrollment)
    db.flush()

    log_activity(
        db=db,
        workspace_id=workspace.id,
        user_id=current_user.id,
        activity_type="contact.enrolled",
        payload={
            "enrollment_id": str(enrollment.id),
            "sequence_id": str(sequence_id),
            "sequence_name": sequence.name,
            "contact_id": str(contact.id),
            "contact_email": contact.email,
        },
    )

    db.commit()
    db.refresh(enrollment)

    return enrollment


@router.get("/{sequence_id}/enrollments", response_model=list[EnrollmentResponse])
async def list_enrollments(
    sequence_id: UUID,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
) -> list[EnrollmentResponse]:
    """List all enrollments for a sequence."""
    # Verify sequence exists
    sequence = (
        db.query(models.Sequence)
        .filter_by(id=sequence_id, workspace_id=workspace.id)
        .first()
    )

    if not sequence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sequence not found",
        )

    enrollments = (
        db.query(models.SequenceEnrollment)
        .options(joinedload(models.SequenceEnrollment.contact))
        .filter_by(sequence_id=sequence_id)
        .order_by(models.SequenceEnrollment.created_at.desc())
        .all()
    )

    return enrollments


@router.post("/{sequence_id}/enrollments/{enrollment_id}/stop", response_model=EnrollmentResponse)
async def stop_enrollment(
    sequence_id: UUID,
    enrollment_id: UUID,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> EnrollmentResponse:
    """Stop an enrollment."""
    enrollment = (
        db.query(models.SequenceEnrollment)
        .join(models.Sequence)
        .filter(
            models.SequenceEnrollment.id == enrollment_id,
            models.SequenceEnrollment.sequence_id == sequence_id,
            models.Sequence.workspace_id == workspace.id,
        )
        .first()
    )

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found",
        )

    enrollment.status = "stopped"
    enrollment.next_scheduled_at = None

    db.commit()
    db.refresh(enrollment)

    return enrollment

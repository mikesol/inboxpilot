from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models
from app.api.deps import log_activity
from app.core.db import get_db
from app.core.email import send_email
from app.core.security import get_current_user
from app.schemas import OutboundEmailResponse, SendTestEmailRequest

router = APIRouter()


@router.post("/send-test", response_model=OutboundEmailResponse, status_code=status.HTTP_201_CREATED)
async def send_test_email(
    data: SendTestEmailRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> OutboundEmailResponse:
    """
    Send a test email.
    This creates or uses an existing contact and sends an email via SMTP.
    """
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

    # Find or create contact
    contact = (
        db.query(models.Contact)
        .filter_by(workspace_id=data.workspace_id, email=data.contact_email)
        .first()
    )

    if not contact:
        contact = models.Contact(
            workspace_id=data.workspace_id,
            email=data.contact_email,
        )
        db.add(contact)
        db.flush()

    # Create outbound email record
    outbound_email = models.OutboundEmail(
        workspace_id=data.workspace_id,
        contact_id=contact.id,
        subject=data.subject,
        body=data.body,
        status="queued",
    )
    db.add(outbound_email)
    db.flush()

    # Send the email
    success = send_email(
        to_email=data.contact_email,
        subject=data.subject,
        body=data.body,
    )

    if success:
        outbound_email.status = "sent"
        outbound_email.sent_at = datetime.now(timezone.utc)
    else:
        outbound_email.status = "failed"
        outbound_email.error_message = "Failed to send email via SMTP"

    # Log activity
    log_activity(
        db=db,
        workspace_id=data.workspace_id,
        user_id=current_user.id,
        activity_type="email.sent" if success else "email.failed",
        payload={
            "email_id": str(outbound_email.id),
            "contact_email": data.contact_email,
            "subject": data.subject,
        },
    )

    db.commit()
    db.refresh(outbound_email)

    return outbound_email

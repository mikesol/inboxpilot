from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


# ============ User Schemas ============
class UserBase(BaseModel):
    email: str
    full_name: str | None = None


class UserCreate(UserBase):
    clerk_user_id: str


class UserResponse(UserBase):
    id: UUID
    clerk_user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Workspace Schemas ============
class WorkspaceBase(BaseModel):
    name: str


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceUpdate(BaseModel):
    name: str | None = None


class WorkspaceResponse(WorkspaceBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class WorkspaceWithRole(WorkspaceResponse):
    role: str


# ============ Contact Schemas ============
class ContactBase(BaseModel):
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None
    company: str | None = None
    title: str | None = None


class ContactCreate(ContactBase):
    workspace_id: UUID


class ContactUpdate(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    company: str | None = None
    title: str | None = None
    status: str | None = None


class ContactResponse(ContactBase):
    id: UUID
    workspace_id: UUID
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Sequence Step Schemas ============
class SequenceStepBase(BaseModel):
    step_order: int
    subject_template: str
    body_template: str
    delay_days: int = 0


class SequenceStepCreate(SequenceStepBase):
    pass


class SequenceStepUpdate(BaseModel):
    step_order: int | None = None
    subject_template: str | None = None
    body_template: str | None = None
    delay_days: int | None = None


class SequenceStepResponse(SequenceStepBase):
    id: UUID
    sequence_id: UUID

    class Config:
        from_attributes = True


# ============ Sequence Schemas ============
class SequenceBase(BaseModel):
    name: str
    description: str | None = None


class SequenceCreate(SequenceBase):
    workspace_id: UUID


class SequenceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class SequenceResponse(SequenceBase):
    id: UUID
    workspace_id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SequenceWithSteps(SequenceResponse):
    steps: list[SequenceStepResponse] = []


# ============ Enrollment Schemas ============
class EnrollmentCreate(BaseModel):
    contact_id: UUID


class EnrollmentResponse(BaseModel):
    id: UUID
    sequence_id: UUID
    contact_id: UUID
    status: str
    last_step_sent: int | None
    last_sent_at: datetime | None
    next_scheduled_at: datetime | None
    created_at: datetime
    contact: ContactResponse | None = None

    class Config:
        from_attributes = True


# ============ Email Schemas ============
class SendTestEmailRequest(BaseModel):
    contact_email: EmailStr
    subject: str
    body: str
    workspace_id: UUID


class OutboundEmailResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    contact_id: UUID
    sequence_id: UUID | None
    step_id: UUID | None
    subject: str
    body: str
    status: str
    sent_at: datetime | None
    error_message: str | None
    created_at: datetime

    class Config:
        from_attributes = True


# ============ AI Schemas ============
class RewriteRequest(BaseModel):
    text: str
    tone: str = "professional"  # 'friendly' | 'professional' | 'punchy'
    purpose: str = "cold_outreach"  # 'cold_outreach' | 'follow_up'


class RewriteResponse(BaseModel):
    rewritten: str


# ============ Activity Schemas ============
class ActivityLogResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    user_id: UUID | None
    type: str
    payload: dict
    created_at: datetime
    user: UserResponse | None = None

    class Config:
        from_attributes = True


# ============ Me/Identity Schemas ============
class MeResponse(BaseModel):
    user: UserResponse
    workspaces: list[WorkspaceWithRole]


# ============ Health Schemas ============
class HealthResponse(BaseModel):
    status: str = "ok"

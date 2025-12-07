// ============ User Types ============
export interface User {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

// ============ Workspace Types ============
export interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

export interface WorkspaceWithRole extends Workspace {
  role: string;
}

export interface WorkspaceCreate {
  name: string;
}

export interface WorkspaceUpdate {
  name?: string;
}

// ============ Contact Types ============
export interface Contact {
  id: string;
  workspace_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  title: string | null;
  status: "active" | "bounced" | "unsubscribed";
  created_at: string;
}

export interface ContactCreate {
  workspace_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  title?: string;
}

export interface ContactUpdate {
  email?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  title?: string;
  status?: string;
}

// ============ Sequence Types ============
export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  subject_template: string;
  body_template: string;
  delay_days: number;
}

export interface SequenceStepCreate {
  step_order: number;
  subject_template: string;
  body_template: string;
  delay_days?: number;
}

export interface SequenceStepUpdate {
  step_order?: number;
  subject_template?: string;
  body_template?: string;
  delay_days?: number;
}

export interface Sequence {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SequenceWithSteps extends Sequence {
  steps: SequenceStep[];
}

export interface SequenceCreate {
  workspace_id: string;
  name: string;
  description?: string;
}

export interface SequenceUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// ============ Enrollment Types ============
export interface Enrollment {
  id: string;
  sequence_id: string;
  contact_id: string;
  status: "active" | "completed" | "stopped";
  last_step_sent: number | null;
  last_sent_at: string | null;
  next_scheduled_at: string | null;
  created_at: string;
  contact?: Contact;
}

export interface EnrollmentCreate {
  contact_id: string;
}

// ============ Email Types ============
export interface OutboundEmail {
  id: string;
  workspace_id: string;
  contact_id: string;
  sequence_id: string | null;
  step_id: string | null;
  subject: string;
  body: string;
  status: "queued" | "sent" | "failed";
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface SendTestEmailRequest {
  contact_email: string;
  subject: string;
  body: string;
  workspace_id: string;
}

// ============ AI Types ============
export interface RewriteRequest {
  text: string;
  tone?: "friendly" | "professional" | "punchy";
  purpose?: "cold_outreach" | "follow_up";
}

export interface RewriteResponse {
  rewritten: string;
}

// ============ Activity Types ============
export interface ActivityLog {
  id: string;
  workspace_id: string;
  user_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
  user: User | null;
}

// ============ Me/Identity Types ============
export interface MeResponse {
  user: User;
  workspaces: WorkspaceWithRole[];
}

// ============ Health Types ============
export interface HealthResponse {
  status: string;
}

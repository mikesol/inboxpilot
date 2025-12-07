import { API_BASE_URL } from "./config";
import type {
  ActivityLog,
  Contact,
  ContactCreate,
  ContactUpdate,
  Enrollment,
  EnrollmentCreate,
  MeResponse,
  OutboundEmail,
  RewriteRequest,
  RewriteResponse,
  SendTestEmailRequest,
  Sequence,
  SequenceCreate,
  SequenceStepCreate,
  SequenceStepUpdate,
  SequenceUpdate,
  SequenceWithSteps,
  SequenceStep,
  Workspace,
  WorkspaceCreate,
  WorkspaceUpdate,
} from "./types";

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (this.token) {
      (headers as Record<string, string>)["Authorization"] =
        `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP error ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // ============ Me ============
  async getMe(): Promise<MeResponse> {
    return this.request<MeResponse>("/me");
  }

  // ============ Workspaces ============
  async getWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>("/workspaces");
  }

  async createWorkspace(data: WorkspaceCreate): Promise<Workspace> {
    return this.request<Workspace>("/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    return this.request<Workspace>(`/workspaces/${workspaceId}`);
  }

  async updateWorkspace(
    workspaceId: string,
    data: WorkspaceUpdate
  ): Promise<Workspace> {
    return this.request<Workspace>(`/workspaces/${workspaceId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ============ Contacts ============
  async getContacts(
    workspaceId: string,
    params?: { search?: string; status?: string }
  ): Promise<Contact[]> {
    const searchParams = new URLSearchParams({ workspace_id: workspaceId });
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    return this.request<Contact[]>(`/contacts?${searchParams.toString()}`);
  }

  async createContact(data: ContactCreate): Promise<Contact> {
    return this.request<Contact>("/contacts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getContact(contactId: string, workspaceId: string): Promise<Contact> {
    return this.request<Contact>(
      `/contacts/${contactId}?workspace_id=${workspaceId}`
    );
  }

  async updateContact(
    contactId: string,
    workspaceId: string,
    data: ContactUpdate
  ): Promise<Contact> {
    return this.request<Contact>(
      `/contacts/${contactId}?workspace_id=${workspaceId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteContact(contactId: string, workspaceId: string): Promise<void> {
    return this.request<void>(
      `/contacts/${contactId}?workspace_id=${workspaceId}`,
      {
        method: "DELETE",
      }
    );
  }

  // ============ Sequences ============
  async getSequences(workspaceId: string): Promise<Sequence[]> {
    return this.request<Sequence[]>(
      `/sequences?workspace_id=${workspaceId}`
    );
  }

  async createSequence(data: SequenceCreate): Promise<Sequence> {
    return this.request<Sequence>("/sequences", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getSequence(
    sequenceId: string,
    workspaceId: string
  ): Promise<SequenceWithSteps> {
    return this.request<SequenceWithSteps>(
      `/sequences/${sequenceId}?workspace_id=${workspaceId}`
    );
  }

  async updateSequence(
    sequenceId: string,
    workspaceId: string,
    data: SequenceUpdate
  ): Promise<Sequence> {
    return this.request<Sequence>(
      `/sequences/${sequenceId}?workspace_id=${workspaceId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteSequence(sequenceId: string, workspaceId: string): Promise<void> {
    return this.request<void>(
      `/sequences/${sequenceId}?workspace_id=${workspaceId}`,
      {
        method: "DELETE",
      }
    );
  }

  // ============ Sequence Steps ============
  async addStep(
    sequenceId: string,
    workspaceId: string,
    data: SequenceStepCreate
  ): Promise<SequenceStep> {
    return this.request<SequenceStep>(
      `/sequences/${sequenceId}/steps?workspace_id=${workspaceId}`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async updateStep(
    sequenceId: string,
    stepId: string,
    workspaceId: string,
    data: SequenceStepUpdate
  ): Promise<SequenceStep> {
    return this.request<SequenceStep>(
      `/sequences/${sequenceId}/steps/${stepId}?workspace_id=${workspaceId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteStep(
    sequenceId: string,
    stepId: string,
    workspaceId: string
  ): Promise<void> {
    return this.request<void>(
      `/sequences/${sequenceId}/steps/${stepId}?workspace_id=${workspaceId}`,
      {
        method: "DELETE",
      }
    );
  }

  // ============ Enrollments ============
  async enrollContact(
    sequenceId: string,
    workspaceId: string,
    data: EnrollmentCreate
  ): Promise<Enrollment> {
    return this.request<Enrollment>(
      `/sequences/${sequenceId}/enroll?workspace_id=${workspaceId}`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async getEnrollments(
    sequenceId: string,
    workspaceId: string
  ): Promise<Enrollment[]> {
    return this.request<Enrollment[]>(
      `/sequences/${sequenceId}/enrollments?workspace_id=${workspaceId}`
    );
  }

  async stopEnrollment(
    sequenceId: string,
    enrollmentId: string,
    workspaceId: string
  ): Promise<Enrollment> {
    return this.request<Enrollment>(
      `/sequences/${sequenceId}/enrollments/${enrollmentId}/stop?workspace_id=${workspaceId}`,
      {
        method: "POST",
      }
    );
  }

  // ============ Emails ============
  async sendTestEmail(data: SendTestEmailRequest): Promise<OutboundEmail> {
    return this.request<OutboundEmail>("/emails/send-test", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ============ AI ============
  async rewriteText(data: RewriteRequest): Promise<RewriteResponse> {
    return this.request<RewriteResponse>("/ai/rewrite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ============ Activity ============
  async getActivity(workspaceId: string): Promise<ActivityLog[]> {
    return this.request<ActivityLog[]>(
      `/activity?workspace_id=${workspaceId}`
    );
  }
}

export const api = new ApiClient(API_BASE_URL);

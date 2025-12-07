"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace, useApi } from "@/lib/hooks";
import { Users, Mail, Send, Activity } from "lucide-react";
import type { Contact, Sequence, ActivityLog } from "@/lib/types";

export default function DashboardPage() {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const { fetchWithAuth, api } = useApi();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!workspace) return;

      try {
        const [contactsData, sequencesData, activitiesData] = await Promise.all(
          [
            fetchWithAuth(() => api.getContacts(workspace.id)),
            fetchWithAuth(() => api.getSequences(workspace.id)),
            fetchWithAuth(() => api.getActivity(workspace.id)),
          ]
        );
        setContacts(contactsData);
        setSequences(sequencesData);
        setActivities(activitiesData.slice(0, 10));
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    if (workspace) {
      fetchData();
    }
  }, [workspace, fetchWithAuth, api]);

  if (workspaceLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </AppShell>
    );
  }

  if (!workspace) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">
            No workspace found
          </h2>
          <p className="mt-2 text-gray-500">
            Create a workspace to get started.
          </p>
        </div>
      </AppShell>
    );
  }

  const activeSequences = sequences.filter((s) => s.is_active).length;
  const emailsSent = activities.filter((a) => a.type === "email.sent").length;

  return (
    <AppShell workspaceName={workspace.name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Welcome back! Here&apos;s an overview of your workspace.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Contacts
              </CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : contacts.length}
              </div>
              <p className="text-xs text-gray-500">
                {contacts.filter((c) => c.status === "active").length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sequences</CardTitle>
              <Mail className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : sequences.length}
              </div>
              <p className="text-xs text-gray-500">{activeSequences} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
              <Send className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : emailsSent}
              </div>
              <p className="text-xs text-gray-500">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activity</CardTitle>
              <Activity className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : activities.length}
              </div>
              <p className="text-xs text-gray-500">Recent events</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-gray-500">Loading...</div>
            ) : activities.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No activity yet. Start by adding contacts or creating sequences.
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-3 text-sm"
                  >
                    <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500" />
                    <div className="flex-1">
                      <p className="text-gray-900">
                        {formatActivityType(activity.type)}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {formatPayload(activity.payload)}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function formatActivityType(type: string): string {
  const typeMap: Record<string, string> = {
    "contact.created": "Contact created",
    "contact.deleted": "Contact deleted",
    "sequence.created": "Sequence created",
    "sequence.deleted": "Sequence deleted",
    "contact.enrolled": "Contact enrolled in sequence",
    "email.sent": "Email sent",
    "email.failed": "Email failed to send",
    "workspace.created": "Workspace created",
  };
  return typeMap[type] || type;
}

function formatPayload(payload: Record<string, unknown>): string {
  if (payload.contact_email) {
    return `to ${payload.contact_email}`;
  }
  if (payload.sequence_name) {
    return payload.sequence_name as string;
  }
  if (payload.workspace_name) {
    return payload.workspace_name as string;
  }
  return "";
}

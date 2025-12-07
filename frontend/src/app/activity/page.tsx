"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace, useApi } from "@/lib/hooks";
import type { ActivityLog } from "@/lib/types";

export default function ActivityPage() {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const { fetchWithAuth, api } = useApi();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      if (!workspace) return;

      try {
        const data = await fetchWithAuth(() => api.getActivity(workspace.id));
        setActivities(data);
      } catch (err) {
        console.error("Failed to fetch activity:", err);
      } finally {
        setLoading(false);
      }
    }

    if (workspace) {
      fetchActivity();
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
        </div>
      </AppShell>
    );
  }

  // Group activities by date
  const groupedActivities = activities.reduce(
    (groups, activity) => {
      const date = new Date(activity.created_at).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    },
    {} as Record<string, ActivityLog[]>
  );

  return (
    <AppShell workspaceName={workspace.name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
          <p className="mt-1 text-gray-500">
            Recent activity in your workspace.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No activity yet. Activity will appear here as you create
                contacts, sequences, and send emails.
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedActivities).map(([date, items]) => (
                  <div key={date}>
                    <h3 className="text-sm font-medium text-gray-500 mb-4">
                      {isToday(date)
                        ? "Today"
                        : isYesterday(date)
                          ? "Yesterday"
                          : date}
                    </h3>
                    <div className="space-y-4">
                      {items.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start space-x-3"
                        >
                          <div
                            className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${getActivityColor(activity.type)}`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm text-gray-900">
                                {formatActivityType(activity.type)}
                              </p>
                              <span className="text-xs text-gray-400">
                                {new Date(activity.created_at).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {formatPayload(activity.payload)}
                            </p>
                            {activity.user && (
                              <p className="text-xs text-gray-400 mt-1">
                                by {activity.user.full_name || activity.user.email}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
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

function isToday(dateString: string): boolean {
  return dateString === new Date().toLocaleDateString();
}

function isYesterday(dateString: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateString === yesterday.toLocaleDateString();
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
  const parts: string[] = [];

  if (payload.contact_email) {
    parts.push(`${payload.contact_email}`);
  }
  if (payload.contact_name) {
    parts.push(`(${payload.contact_name})`);
  }
  if (payload.sequence_name) {
    parts.push(`"${payload.sequence_name}"`);
  }
  if (payload.subject) {
    parts.push(`Subject: "${payload.subject}"`);
  }
  if (payload.workspace_name) {
    parts.push(`"${payload.workspace_name}"`);
  }

  return parts.join(" ");
}

function getActivityColor(type: string): string {
  if (type.includes("created")) return "bg-green-500";
  if (type.includes("deleted")) return "bg-red-500";
  if (type.includes("enrolled")) return "bg-blue-500";
  if (type === "email.sent") return "bg-purple-500";
  if (type === "email.failed") return "bg-red-500";
  return "bg-gray-500";
}

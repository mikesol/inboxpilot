"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace, useApi } from "@/lib/hooks";
import { Send } from "lucide-react";

export default function SettingsPage() {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const { fetchWithAuth, api } = useApi();

  const [workspaceName, setWorkspaceName] = useState("");
  const [saving, setSaving] = useState(false);

  const [testEmail, setTestEmail] = useState({
    email: "",
    subject: "Test email from InboxPilot",
    body: "This is a test email sent from InboxPilot. If you received this, your email configuration is working correctly!",
    sending: false,
    sent: false,
    error: "",
  });

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !workspaceName.trim()) return;

    setSaving(true);
    try {
      await fetchWithAuth(() =>
        api.updateWorkspace(workspace.id, { name: workspaceName })
      );
      alert("Workspace updated successfully");
    } catch (err) {
      console.error("Failed to update workspace:", err);
      alert("Failed to update workspace");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !testEmail.email) return;

    setTestEmail((prev) => ({ ...prev, sending: true, error: "", sent: false }));

    try {
      await fetchWithAuth(() =>
        api.sendTestEmail({
          workspace_id: workspace.id,
          contact_email: testEmail.email,
          subject: testEmail.subject,
          body: testEmail.body,
        })
      );
      setTestEmail((prev) => ({ ...prev, sending: false, sent: true }));
    } catch (err) {
      console.error("Failed to send test email:", err);
      setTestEmail((prev) => ({
        ...prev,
        sending: false,
        error: err instanceof Error ? err.message : "Failed to send email",
      }));
    }
  };

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

  return (
    <AppShell workspaceName={workspace.name}>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-gray-500">
            Manage your workspace settings and test email configuration.
          </p>
        </div>

        {/* Workspace Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateWorkspace} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Workspace Name
                </label>
                <Input
                  value={workspaceName || workspace.name}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="My Workspace"
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Test Email */}
        <Card>
          <CardHeader>
            <CardTitle>Test Email</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Send test email to
                </label>
                <Input
                  type="email"
                  required
                  value={testEmail.email}
                  onChange={(e) =>
                    setTestEmail((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="test@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Send a test email to verify your email configuration. Check
                  MailHog at http://localhost:8025 to see the email.
                </p>
              </div>
              <Button type="submit" disabled={testEmail.sending}>
                <Send className="w-4 h-4 mr-2" />
                {testEmail.sending ? "Sending..." : "Send Test Email"}
              </Button>
              {testEmail.sent && (
                <p className="text-sm text-green-600">
                  Test email sent successfully! Check MailHog to view it.
                </p>
              )}
              {testEmail.error && (
                <p className="text-sm text-red-600">{testEmail.error}</p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Workspace ID</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                {workspace.id}
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span>{new Date(workspace.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">API URL</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

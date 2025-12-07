"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useWorkspace, useApi } from "@/lib/hooks";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import type { Sequence, SequenceCreate } from "@/lib/types";

export default function SequencesPage() {
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const { fetchWithAuth, api } = useApi();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    async function fetchSequences() {
      if (!workspace) return;

      try {
        const data = await fetchWithAuth(() =>
          api.getSequences(workspace.id)
        );
        setSequences(data);
      } catch (err) {
        console.error("Failed to fetch sequences:", err);
      } finally {
        setLoading(false);
      }
    }

    if (workspace) {
      fetchSequences();
    }
  }, [workspace, fetchWithAuth, api]);

  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;

    try {
      const newSequence: SequenceCreate = {
        workspace_id: workspace.id,
        name: formData.name,
        description: formData.description || undefined,
      };

      const sequence = await fetchWithAuth(() =>
        api.createSequence(newSequence)
      );
      setSequences((prev) => [sequence, ...prev]);
      setDialogOpen(false);
      setFormData({ name: "", description: "" });
    } catch (err) {
      console.error("Failed to create sequence:", err);
      alert(err instanceof Error ? err.message : "Failed to create sequence");
    }
  };

  const handleDeleteSequence = async (sequenceId: string) => {
    if (!workspace) return;
    if (!confirm("Are you sure you want to delete this sequence?")) return;

    try {
      await fetchWithAuth(() => api.deleteSequence(sequenceId, workspace.id));
      setSequences((prev) => prev.filter((s) => s.id !== sequenceId));
    } catch (err) {
      console.error("Failed to delete sequence:", err);
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sequences</h1>
            <p className="mt-1 text-gray-500">
              Create and manage email sequences for outbound campaigns.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Sequence
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Sequence</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSequence} className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Welcome Flow"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="A sequence for onboarding new leads..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Sequence</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader />
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : sequences.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No sequences yet. Create your first sequence to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sequences.map((sequence) => (
                    <TableRow key={sequence.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/sequences/${sequence.id}`}
                          className="hover:text-blue-600"
                        >
                          {sequence.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-gray-500 max-w-xs truncate">
                        {sequence.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={sequence.is_active ? "default" : "secondary"}
                        >
                          {sequence.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {new Date(sequence.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Link href={`/sequences/${sequence.id}`}>
                            <Button variant="ghost" size="sm">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSequence(sequence.id)}
                          >
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

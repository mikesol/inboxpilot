"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace, useApi } from "@/lib/hooks";
import { Plus, Trash2, ArrowLeft, Sparkles } from "lucide-react";
import type {
  SequenceWithSteps,
  SequenceStep,
  Enrollment,
  Contact,
  SequenceStepCreate,
} from "@/lib/types";

export default function SequenceDetailPage({
  params,
}: {
  params: Promise<{ sequenceId: string }>;
}) {
  const { sequenceId } = use(params);
  const router = useRouter();
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const { fetchWithAuth, api } = useApi();

  const [sequence, setSequence] = useState<SequenceWithSteps | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedStep, setSelectedStep] = useState<SequenceStep | null>(null);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [rewriteDialogOpen, setRewriteDialogOpen] = useState(false);

  const [newStepData, setNewStepData] = useState({
    subject_template: "",
    body_template: "",
    delay_days: 0,
  });

  const [rewriteData, setRewriteData] = useState({
    text: "",
    tone: "professional" as "friendly" | "professional" | "punchy",
    purpose: "cold_outreach" as "cold_outreach" | "follow_up",
    rewritten: "",
    loading: false,
  });

  const [selectedContactId, setSelectedContactId] = useState<string>("");

  useEffect(() => {
    async function fetchData() {
      if (!workspace) return;

      try {
        const [sequenceData, enrollmentsData, contactsData] = await Promise.all(
          [
            fetchWithAuth(() => api.getSequence(sequenceId, workspace.id)),
            fetchWithAuth(() => api.getEnrollments(sequenceId, workspace.id)),
            fetchWithAuth(() => api.getContacts(workspace.id)),
          ]
        );
        setSequence(sequenceData);
        setEnrollments(enrollmentsData);
        setContacts(contactsData);

        if (sequenceData.steps.length > 0) {
          setSelectedStep(sequenceData.steps[0]);
        }
      } catch (err) {
        console.error("Failed to fetch sequence:", err);
      } finally {
        setLoading(false);
      }
    }

    if (workspace) {
      fetchData();
    }
  }, [workspace, sequenceId, fetchWithAuth, api]);

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !sequence) return;

    try {
      const stepData: SequenceStepCreate = {
        step_order: sequence.steps.length + 1,
        subject_template: newStepData.subject_template,
        body_template: newStepData.body_template,
        delay_days: newStepData.delay_days,
      };

      const step = await fetchWithAuth(() =>
        api.addStep(sequenceId, workspace.id, stepData)
      );
      setSequence((prev) =>
        prev ? { ...prev, steps: [...prev.steps, step] } : prev
      );
      setSelectedStep(step);
      setStepDialogOpen(false);
      setNewStepData({ subject_template: "", body_template: "", delay_days: 0 });
    } catch (err) {
      console.error("Failed to add step:", err);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!workspace || !sequence) return;
    if (!confirm("Are you sure you want to delete this step?")) return;

    try {
      await fetchWithAuth(() =>
        api.deleteStep(sequenceId, stepId, workspace.id)
      );
      setSequence((prev) =>
        prev
          ? { ...prev, steps: prev.steps.filter((s) => s.id !== stepId) }
          : prev
      );
      if (selectedStep?.id === stepId) {
        setSelectedStep(sequence.steps[0] || null);
      }
    } catch (err) {
      console.error("Failed to delete step:", err);
    }
  };

  const handleEnrollContact = async () => {
    if (!workspace || !selectedContactId) return;

    try {
      const enrollment = await fetchWithAuth(() =>
        api.enrollContact(sequenceId, workspace.id, {
          contact_id: selectedContactId,
        })
      );
      setEnrollments((prev) => [enrollment, ...prev]);
      setEnrollDialogOpen(false);
      setSelectedContactId("");
    } catch (err) {
      console.error("Failed to enroll contact:", err);
      alert(err instanceof Error ? err.message : "Failed to enroll contact");
    }
  };

  const handleRewrite = async () => {
    if (!rewriteData.text) return;

    setRewriteData((prev) => ({ ...prev, loading: true }));

    try {
      const result = await fetchWithAuth(() =>
        api.rewriteText({
          text: rewriteData.text,
          tone: rewriteData.tone,
          purpose: rewriteData.purpose,
        })
      );
      setRewriteData((prev) => ({
        ...prev,
        rewritten: result.rewritten,
        loading: false,
      }));
    } catch (err) {
      console.error("Failed to rewrite:", err);
      setRewriteData((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleUseRewritten = () => {
    if (selectedStep && rewriteData.rewritten) {
      // Update the step body
      setNewStepData((prev) => ({
        ...prev,
        body_template: rewriteData.rewritten,
      }));
      setRewriteDialogOpen(false);
    }
  };

  if (workspaceLoading || loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </AppShell>
    );
  }

  if (!workspace || !sequence) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">
            Sequence not found
          </h2>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell workspaceName={workspace.name}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.push("/sequences")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {sequence.name}
              </h1>
              <p className="text-gray-500">{sequence.description}</p>
            </div>
          </div>
          <Badge variant={sequence.is_active ? "default" : "secondary"}>
            {sequence.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>

        <Tabs defaultValue="steps">
          <TabsList>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          </TabsList>

          <TabsContent value="steps" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Steps list */}
              <Card className="lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Steps</CardTitle>
                  <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Step</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddStep} className="space-y-4 mt-4">
                        <div>
                          <label className="text-sm font-medium">Subject</label>
                          <Input
                            required
                            value={newStepData.subject_template}
                            onChange={(e) =>
                              setNewStepData((prev) => ({
                                ...prev,
                                subject_template: e.target.value,
                              }))
                            }
                            placeholder="Quick question about {{company}}"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Body</label>
                          <Textarea
                            required
                            value={newStepData.body_template}
                            onChange={(e) =>
                              setNewStepData((prev) => ({
                                ...prev,
                                body_template: e.target.value,
                              }))
                            }
                            placeholder="Hi {{first_name}},..."
                            rows={6}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Delay (days)
                          </label>
                          <Input
                            type="number"
                            min={0}
                            value={newStepData.delay_days}
                            onChange={(e) =>
                              setNewStepData((prev) => ({
                                ...prev,
                                delay_days: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStepDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">Add Step</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {sequence.steps.length === 0 ? (
                    <p className="text-gray-500 text-sm">No steps yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {sequence.steps.map((step, index) => (
                        <div
                          key={step.id}
                          className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                            selectedStep?.id === step.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => setSelectedStep(step)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">
                              Step {index + 1}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStep(step.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Day {step.delay_days}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step editor */}
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">
                    {selectedStep ? `Step ${sequence.steps.findIndex((s) => s.id === selectedStep.id) + 1}` : "Select a step"}
                  </CardTitle>
                  {selectedStep && (
                    <Dialog
                      open={rewriteDialogOpen}
                      onOpenChange={setRewriteDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setRewriteData((prev) => ({
                              ...prev,
                              text: selectedStep.body_template,
                              rewritten: "",
                            }))
                          }
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Rewrite with AI
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>AI Rewrite</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div>
                            <label className="text-sm font-medium">
                              Original Text
                            </label>
                            <Textarea
                              value={rewriteData.text}
                              onChange={(e) =>
                                setRewriteData((prev) => ({
                                  ...prev,
                                  text: e.target.value,
                                }))
                              }
                              rows={4}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Tone</label>
                              <Select
                                value={rewriteData.tone}
                                onValueChange={(value) =>
                                  setRewriteData((prev) => ({
                                    ...prev,
                                    tone: value as typeof prev.tone,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="friendly">
                                    Friendly
                                  </SelectItem>
                                  <SelectItem value="professional">
                                    Professional
                                  </SelectItem>
                                  <SelectItem value="punchy">Punchy</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">
                                Purpose
                              </label>
                              <Select
                                value={rewriteData.purpose}
                                onValueChange={(value) =>
                                  setRewriteData((prev) => ({
                                    ...prev,
                                    purpose: value as typeof prev.purpose,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cold_outreach">
                                    Cold Outreach
                                  </SelectItem>
                                  <SelectItem value="follow_up">
                                    Follow Up
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button
                            onClick={handleRewrite}
                            disabled={rewriteData.loading}
                          >
                            {rewriteData.loading
                              ? "Rewriting..."
                              : "Rewrite"}
                          </Button>
                          {rewriteData.rewritten && (
                            <div>
                              <label className="text-sm font-medium">
                                Rewritten Text
                              </label>
                              <Textarea
                                value={rewriteData.rewritten}
                                readOnly
                                rows={4}
                                className="bg-green-50"
                              />
                              <Button
                                className="mt-2"
                                onClick={handleUseRewritten}
                              >
                                Use This
                              </Button>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
                <CardContent>
                  {selectedStep ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Subject
                        </label>
                        <Input value={selectedStep.subject_template} readOnly />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Body
                        </label>
                        <Textarea
                          value={selectedStep.body_template}
                          readOnly
                          rows={8}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Delay (days from previous step)
                        </label>
                        <Input
                          value={selectedStep.delay_days}
                          readOnly
                          className="w-24"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      Select a step to view its details, or add a new step.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="enrollments" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Enrollments</CardTitle>
                <Dialog
                  open={enrollDialogOpen}
                  onOpenChange={setEnrollDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Enroll Contact
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enroll Contact</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-medium">
                          Select Contact
                        </label>
                        <Select
                          value={selectedContactId}
                          onValueChange={setSelectedContactId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a contact..." />
                          </SelectTrigger>
                          <SelectContent>
                            {contacts.map((contact) => (
                              <SelectItem key={contact.id} value={contact.id}>
                                {contact.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setEnrollDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleEnrollContact}
                          disabled={!selectedContactId}
                        >
                          Enroll
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {enrollments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No contacts enrolled yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Step</TableHead>
                        <TableHead>Enrolled</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell>
                            {enrollment.contact?.email || enrollment.contact_id}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                enrollment.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {enrollment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {enrollment.last_step_sent ?? "-"}
                          </TableCell>
                          <TableCell>
                            {new Date(
                              enrollment.created_at
                            ).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

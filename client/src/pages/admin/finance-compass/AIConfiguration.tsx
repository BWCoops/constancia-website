import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import AdminLayout from "../AdminLayout";
import { FCAdminTopNav } from "@/components/admin/FCAdminTopNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Brain,
  Shield,
  BookOpen,
  MessageSquare,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FcAiSystemPrompt {
  id: string;
  key: string;
  name: string;
  description: string | null;
  persona: string;
  content: string;
  category: string;
  isActive: boolean;
  version: number;
  lastReviewedAt: string | null;
  lastReviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FcAiGuardrail {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  priority: string;
  validationType: string;
  validationConfig: any;
  errorMessage: string;
  isBlocking: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FcAiGroundingRule {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  content: string;
  applicableTiers: string[] | null;
  applicableDimensions: string[] | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface FcAiKnowledgeBase {
  id: string;
  key: string;
  title: string;
  description: string | null;
  category: string;
  content: string;
  tags: string[] | null;
  applicableTiers: string[] | null;
  applicableDimensions: string[] | null;
  sourceCitation: string | null;
  isActive: boolean;
  version: number;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FcAiFollowupTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  triggerCondition: any;
  promptTemplate: string;
  dimension: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AIConfiguration() {
  const { toast } = useToast();
  const [aiConfigTab, setAiConfigTab] = useState("prompts");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentEntity, setCurrentEntity] = useState<any>(null);
  const [entityType, setEntityType] = useState<string>("");

  const { data: systemPrompts, isLoading: promptsLoading, refetch: refetchPrompts } = useQuery<FcAiSystemPrompt[]>({
    queryKey: ["/api/admin/ai-config/system-prompts"],
  });

  const { data: guardrails, isLoading: guardrailsLoading, refetch: refetchGuardrails } = useQuery<FcAiGuardrail[]>({
    queryKey: ["/api/admin/ai-config/guardrails"],
  });

  const { data: groundingRules, isLoading: groundingLoading, refetch: refetchGrounding } = useQuery<FcAiGroundingRule[]>({
    queryKey: ["/api/admin/ai-config/grounding-rules"],
  });

  const { data: knowledgeBase, isLoading: kbLoading, refetch: refetchKb } = useQuery<FcAiKnowledgeBase[]>({
    queryKey: ["/api/admin/ai-config/knowledge-base"],
  });

  const { data: followupTemplates, isLoading: followupLoading, refetch: refetchFollowup } = useQuery<FcAiFollowupTemplate[]>({
    queryKey: ["/api/admin/ai-config/followup-templates"],
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ type, id, isActive }: { type: string; id: string; isActive: boolean }) => {
      const endpoint = `/api/admin/ai-config/${type}/${id}`;
      return await apiRequest("PATCH", endpoint, { isActive });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/ai-config/${variables.type}`] });
      toast({ title: "Status updated", description: "The item has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      return await apiRequest("DELETE", `/api/admin/ai-config/${type}/${id}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/ai-config/${variables.type}`] });
      setDeleteDialogOpen(false);
      toast({ title: "Deleted", description: "The item has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
    },
  });

  const handleRefreshAll = () => {
    refetchPrompts();
    refetchGuardrails();
    refetchGrounding();
    refetchKb();
    refetchFollowup();
    toast({ title: "Refreshed", description: "All AI configuration data has been refreshed." });
  };

  return (
    <AdminLayout>
      <div className="-m-6">
        <FCAdminTopNav />
        <div className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-ai-config">
                  AI Configuration
                </h1>
                <p className="text-muted-foreground">
                  Manage system prompts, guardrails, grounding rules, knowledge base, and follow-up templates
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshAll}
                className="gap-2"
                data-testid="button-refresh-all"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh All
              </Button>
            </div>

            <Card data-testid="card-ai-config">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Configuration
            </CardTitle>
            <CardDescription>
              Configure the AI assessment engine components for FinanceCompass.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={aiConfigTab} onValueChange={setAiConfigTab} className="space-y-4">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="prompts" className="gap-1 text-xs" data-testid="tab-prompts">
                  <MessageSquare className="h-3 w-3" />
                  Prompts
                </TabsTrigger>
                <TabsTrigger value="guardrails" className="gap-1 text-xs" data-testid="tab-guardrails">
                  <Shield className="h-3 w-3" />
                  Guardrails
                </TabsTrigger>
                <TabsTrigger value="grounding" className="gap-1 text-xs" data-testid="tab-grounding">
                  <BookOpen className="h-3 w-3" />
                  Grounding
                </TabsTrigger>
                <TabsTrigger value="knowledge" className="gap-1 text-xs" data-testid="tab-knowledge">
                  <BookOpen className="h-3 w-3" />
                  Knowledge
                </TabsTrigger>
                <TabsTrigger value="followup" className="gap-1 text-xs" data-testid="tab-followup">
                  <MessageSquare className="h-3 w-3" />
                  Follow-up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="prompts" className="space-y-4">
                {promptsLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {systemPrompts?.map((prompt) => (
                        <Card key={prompt.id} className="p-4" data-testid={`card-prompt-${prompt.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium truncate">{prompt.name}</h4>
                                <Badge variant="outline">{prompt.category}</Badge>
                                <Badge variant="secondary">{prompt.persona}</Badge>
                                <Badge variant={prompt.isActive ? "default" : "secondary"}>
                                  {prompt.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {prompt.description || prompt.content.substring(0, 100)}...
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Key: {prompt.key} | Version: {prompt.version}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleActiveMutation.mutate({
                                  type: "system-prompts",
                                  id: prompt.id,
                                  isActive: !prompt.isActive
                                })}
                                data-testid={`button-toggle-prompt-${prompt.id}`}
                              >
                                {prompt.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setCurrentEntity(prompt);
                                  setEntityType("system-prompts");
                                  setDeleteDialogOpen(true);
                                }}
                                data-testid={`button-delete-prompt-${prompt.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                      {(!systemPrompts || systemPrompts.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          No system prompts configured yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="guardrails" className="space-y-4">
                {guardrailsLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {guardrails?.map((guardrail) => (
                        <Card key={guardrail.id} className="p-4" data-testid={`card-guardrail-${guardrail.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium truncate">{guardrail.name}</h4>
                                <Badge variant="outline">{guardrail.category}</Badge>
                                <Badge variant={guardrail.priority === "critical" ? "destructive" : guardrail.priority === "high" ? "default" : "secondary"}>
                                  {guardrail.priority}
                                </Badge>
                                {guardrail.isBlocking && <Badge variant="destructive">Blocking</Badge>}
                                <Badge variant={guardrail.isActive ? "default" : "secondary"}>
                                  {guardrail.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {guardrail.description || guardrail.errorMessage}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Key: {guardrail.key} | Type: {guardrail.validationType}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleActiveMutation.mutate({
                                  type: "guardrails",
                                  id: guardrail.id,
                                  isActive: !guardrail.isActive
                                })}
                                data-testid={`button-toggle-guardrail-${guardrail.id}`}
                              >
                                {guardrail.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setCurrentEntity(guardrail);
                                  setEntityType("guardrails");
                                  setDeleteDialogOpen(true);
                                }}
                                data-testid={`button-delete-guardrail-${guardrail.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                      {(!guardrails || guardrails.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          No guardrails configured yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="grounding" className="space-y-4">
                {groundingLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {groundingRules?.map((rule) => (
                        <Card key={rule.id} className="p-4" data-testid={`card-grounding-${rule.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium truncate">{rule.name}</h4>
                                <Badge variant="outline">{rule.category}</Badge>
                                <Badge variant={rule.isActive ? "default" : "secondary"}>
                                  {rule.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {rule.description || rule.content.substring(0, 100)}...
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Key: {rule.key} | Version: {rule.version}
                                {rule.applicableTiers?.length ? ` | Tiers: ${rule.applicableTiers.join(", ")}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleActiveMutation.mutate({
                                  type: "grounding-rules",
                                  id: rule.id,
                                  isActive: !rule.isActive
                                })}
                                data-testid={`button-toggle-grounding-${rule.id}`}
                              >
                                {rule.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setCurrentEntity(rule);
                                  setEntityType("grounding-rules");
                                  setDeleteDialogOpen(true);
                                }}
                                data-testid={`button-delete-grounding-${rule.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                      {(!groundingRules || groundingRules.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          No grounding rules configured yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="knowledge" className="space-y-4">
                {kbLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {knowledgeBase?.map((kb) => (
                        <Card key={kb.id} className="p-4" data-testid={`card-kb-${kb.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium truncate">{kb.title}</h4>
                                <Badge variant="outline">{kb.category}</Badge>
                                <Badge variant={kb.isActive ? "default" : "secondary"}>
                                  {kb.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {kb.description || kb.content.substring(0, 100)}...
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Key: {kb.key} | Version: {kb.version}
                                {kb.tags?.length ? ` | Tags: ${kb.tags.join(", ")}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleActiveMutation.mutate({
                                  type: "knowledge-base",
                                  id: kb.id,
                                  isActive: !kb.isActive
                                })}
                                data-testid={`button-toggle-kb-${kb.id}`}
                              >
                                {kb.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setCurrentEntity(kb);
                                  setEntityType("knowledge-base");
                                  setDeleteDialogOpen(true);
                                }}
                                data-testid={`button-delete-kb-${kb.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                      {(!knowledgeBase || knowledgeBase.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          No knowledge base entries configured yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="followup" className="space-y-4">
                {followupLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {followupTemplates?.map((template) => (
                        <Card key={template.id} className="p-4" data-testid={`card-followup-${template.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium truncate">{template.name}</h4>
                                {template.dimension && <Badge variant="outline">{template.dimension}</Badge>}
                                <Badge variant="secondary">Priority: {template.priority}</Badge>
                                <Badge variant={template.isActive ? "default" : "secondary"}>
                                  {template.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {template.description || template.promptTemplate.substring(0, 100)}...
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Key: {template.key}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleActiveMutation.mutate({
                                  type: "followup-templates",
                                  id: template.id,
                                  isActive: !template.isActive
                                })}
                                data-testid={`button-toggle-followup-${template.id}`}
                              >
                                {template.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setCurrentEntity(template);
                                  setEntityType("followup-templates");
                                  setDeleteDialogOpen(true);
                                }}
                                data-testid={`button-delete-followup-${template.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                      {(!followupTemplates || followupTemplates.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          No follow-up templates configured yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Confirmation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{currentEntity?.name || currentEntity?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (currentEntity && entityType) {
                    deleteMutation.mutate({ type: entityType, id: currentEntity.id });
                  }
                }}
                className="bg-red-500 hover:bg-red-600"
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

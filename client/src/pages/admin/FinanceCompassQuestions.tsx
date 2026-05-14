import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  HelpCircle,
  Plus,
  Pencil,
  RefreshCw,
  Loader2,
  Check,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";
import { FCAdminTopNav } from "@/components/admin/FCAdminTopNav";

interface Question {
  id: string;
  tier: string;
  dimension?: string | null;
  area?: string | null;
  sequence: number;
  questionKey: string;
  prompt: string;
  helpText?: string | null;
  type: string;
  options?: unknown;
  validation?: unknown;
  isRequired: boolean;
  isAdaptive: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const questionFormSchema = z.object({
  tier: z.enum(["quick_assessment", "pre_assessment", "full"]),
  dimension: z.string().optional(),
  area: z.string().optional(),
  sequence: z.coerce.number().min(1),
  questionKey: z.string().min(1, "Question key is required"),
  prompt: z.string().min(1, "Question prompt is required"),
  helpText: z.string().optional(),
  type: z.enum(["text", "long_text", "number", "scale", "single_select", "multi_select", "structured"]),
  isRequired: z.boolean().default(true),
  isAdaptive: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type QuestionFormValues = z.infer<typeof questionFormSchema>;

function getTierBadgeClass(tier: string) {
  switch (tier) {
    case "quick_assessment":
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400";
    case "pre_assessment":
      return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400";
    case "full":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function formatTierLabel(tier: string) {
  switch (tier) {
    case "quick_assessment":
      return "Quick Assessment";
    case "pre_assessment":
      return "Pre-Assessment";
    case "full":
      return "Full";
    default:
      return tier;
  }
}

function formatDimensionLabel(dimension: string | null | undefined) {
  if (!dimension) return "-";
  return dimension.split("_").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

function formatTypeLabel(type: string) {
  return type.split("_").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

const DIMENSIONS = [
  { value: "financial_planning_analysis", label: "Financial Planning & Analysis" },
  { value: "management_reporting", label: "Management Reporting" },
  { value: "consolidation_close", label: "Consolidation & Close" },
  { value: "financial_controls_compliance", label: "Financial Controls & Compliance" },
  { value: "technology_systems", label: "Technology & Systems" },
  { value: "organisation_people", label: "Organisation & People" },
  { value: "data_analytics", label: "Data & Analytics" },
];

function QuestionsContent() {
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      tier: "quick_assessment",
      dimension: "",
      area: "",
      sequence: 1,
      questionKey: "",
      prompt: "",
      helpText: "",
      type: "text",
      isRequired: true,
      isAdaptive: false,
      isActive: true,
    },
  });

  const { data, isLoading, refetch, isFetching } = useQuery<{ success: boolean; data: Question[] }>({
    queryKey: ["/api/admin/finance-compass/questions"],
  });

  const questions = data?.data ?? [];

  const filteredQuestions = selectedTier === "all" 
    ? questions 
    : questions.filter(q => q.tier === selectedTier);

  const createMutation = useMutation({
    mutationFn: async (values: QuestionFormValues) => {
      const res = await apiRequest("POST", "/api/admin/finance-compass/questions", values);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Question Created", description: "The question has been created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/questions"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create question.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: QuestionFormValues }) => {
      const res = await apiRequest("PATCH", `/api/admin/finance-compass/questions/${id}`, values);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Question Updated", description: "The question has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/questions"] });
      setIsDialogOpen(false);
      setEditingQuestion(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update question.", variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    form.reset({
      tier: "pre_assessment",
      dimension: "",
      area: "",
      sequence: (filteredQuestions.length + 1),
      questionKey: "",
      prompt: "",
      helpText: "",
      type: "text",
      isRequired: true,
      isAdaptive: false,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (question: Question) => {
    setEditingQuestion(question);
    form.reset({
      tier: question.tier as "quick_assessment" | "pre_assessment" | "full",
      dimension: question.dimension || "",
      area: question.area || "",
      sequence: question.sequence,
      questionKey: question.questionKey,
      prompt: question.prompt,
      helpText: question.helpText || "",
      type: question.type as "text" | "long_text" | "number" | "scale" | "single_select" | "multi_select" | "structured",
      isRequired: question.isRequired,
      isAdaptive: question.isAdaptive,
      isActive: question.isActive,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: QuestionFormValues) => {
    if (editingQuestion) {
      updateMutation.mutate({ id: editingQuestion.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Questions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage assessment questions across all tiers
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleOpenCreate}
            data-testid="button-add-question"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      <Tabs value={selectedTier} onValueChange={setSelectedTier}>
        <TabsList className="flex-wrap h-auto gap-1" data-testid="tabs-tier-filter">
          <TabsTrigger value="all" data-testid="tab-all">All ({questions.length})</TabsTrigger>
          <TabsTrigger value="quick_assessment" data-testid="tab-quick-assessment">
            Quick Assessment ({questions.filter(q => q.tier === "quick_assessment").length})
          </TabsTrigger>
          <TabsTrigger value="pre_assessment" data-testid="tab-pre-assessment">
            Pre-Assessment ({questions.filter(q => q.tier === "pre_assessment").length})
          </TabsTrigger>
          <TabsTrigger value="full" data-testid="tab-full">
            Full ({questions.filter(q => q.tier === "full").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTier} className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredQuestions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Seq</TableHead>
                      <TableHead>Dimension</TableHead>
                      <TableHead className="min-w-[300px]">Question</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-[80px]">Required</TableHead>
                      <TableHead className="w-[80px]">Active</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuestions
                      .sort((a, b) => a.sequence - b.sequence)
                      .map((question, index) => (
                        <TableRow 
                          key={question.id} 
                          className={!question.isActive ? "opacity-50" : ""}
                          data-testid={`row-question-${index}`}
                        >
                          <TableCell className="font-mono text-sm">
                            {question.sequence}
                          </TableCell>
                          <TableCell>
                            {selectedTier === "all" && (
                              <Badge className={`${getTierBadgeClass(question.tier)} mr-2`}>
                                {formatTierLabel(question.tier)}
                              </Badge>
                            )}
                            <span className="text-sm">
                              {formatDimensionLabel(question.dimension)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="max-w-[400px]">
                              <p className="line-clamp-2">{question.prompt}</p>
                              <p className="text-xs text-muted-foreground mt-1 font-mono">
                                {question.questionKey}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {formatTypeLabel(question.type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {question.isRequired ? (
                              <Check className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            {question.isActive ? (
                              <Check className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <X className="h-4 w-4 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(question)}
                              data-testid={`button-edit-${index}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No questions found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add questions to build your assessment
                  </p>
                  <Button onClick={handleOpenCreate} className="mt-4" data-testid="button-add-first-question">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Question
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              {editingQuestion ? "Edit Question" : "Add New Question"}
            </DialogTitle>
            <DialogDescription>
              {editingQuestion 
                ? "Update the question details below"
                : "Fill in the details to create a new assessment question"
              }
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tier</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-tier">
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="quick_assessment">Quick Assessment</SelectItem>
                          <SelectItem value="pre_assessment">Pre-Assessment</SelectItem>
                          <SelectItem value="full">Full</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sequence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sequence</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          {...field} 
                          data-testid="input-sequence"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dimension"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dimension</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-dimension">
                            <SelectValue placeholder="Select dimension (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {DIMENSIONS.map((dim) => (
                            <SelectItem key={dim.value} value={dim.value}>
                              {dim.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Budgeting Process" 
                          {...field} 
                          data-testid="input-area"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="questionKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Key</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., gen_company_name" 
                        {...field} 
                        data-testid="input-question-key"
                      />
                    </FormControl>
                    <FormDescription>
                      Unique identifier for the question (snake_case)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Prompt</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter the question text..." 
                        className="min-h-[80px]"
                        {...field} 
                        data-testid="textarea-prompt"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="helpText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Help Text (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional guidance for the respondent..." 
                        className="min-h-[60px]"
                        {...field} 
                        data-testid="textarea-help-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="long_text">Long Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="scale">Scale (1-5)</SelectItem>
                        <SelectItem value="single_select">Single Select</SelectItem>
                        <SelectItem value="multi_select">Multi Select</SelectItem>
                        <SelectItem value="structured">Structured</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-6">
                <FormField
                  control={form.control}
                  name="isRequired"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-required"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Required</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isAdaptive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-adaptive"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Adaptive</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-active"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Active</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-submit">
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingQuestion ? "Update Question" : "Create Question"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FinanceCompassQuestions() {
  return (
    <AdminLayout>
      <div className="-m-6">
        <FCAdminTopNav />
        <div className="p-6">
          <QuestionsContent />
        </div>
      </div>
    </AdminLayout>
  );
}

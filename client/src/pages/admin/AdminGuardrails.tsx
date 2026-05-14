import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Loader2,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertCircle,
  CheckCircle2,
  Info,
  Play,
  FileCode,
  Settings,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCcw
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./AdminLayout";

interface GuardrailCategory {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  ruleCount?: number;
}

interface GuardrailRule {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  severity: "error" | "warning" | "info";
  ruleType: string;
  ruleConfig: Record<string, any>;
  errorMessage: string;
  suggestedFix: string;
  appliesToStage: string[];
  sortOrder: number;
  isActive: boolean;
}

interface TestResult {
  passed: boolean;
  violations: Array<{
    ruleId: string;
    ruleName: string;
    severity: string;
    message: string;
    suggestedFix?: string;
  }>;
}

const ruleSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().min(1, "Description is required"),
  severity: z.enum(["error", "warning", "info"]),
  ruleType: z.string().min(1, "Rule type is required"),
  ruleConfig: z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, "Must be valid JSON"),
  errorMessage: z.string().min(1, "Error message is required"),
  suggestedFix: z.string().min(1, "Suggested fix is required"),
  appliesToStage: z.array(z.string()).min(1, "At least one stage is required"),
  sortOrder: z.number().int().min(1),
  isActive: z.boolean(),
});

type RuleFormData = z.infer<typeof ruleSchema>;

export default function AdminGuardrails() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<GuardrailRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<GuardrailRule | null>(null);
  const [testContent, setTestContent] = useState("");
  const [testingRules, setTestingRules] = useState(false);
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: categories, isLoading: categoriesLoading } = useQuery<GuardrailCategory[]>({
    queryKey: ["/api/admin/guardrails/categories"],
  });

  const { data: rules, isLoading: rulesLoading } = useQuery<GuardrailRule[]>({
    queryKey: ["/api/admin/guardrails/rules"],
  });

  const { data: stats } = useQuery<{ totalRules: number; activeRules: number; categories: number }>({
    queryKey: ["/api/admin/guardrails/stats"],
  });

  const form = useForm<RuleFormData>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      categoryId: "",
      name: "",
      description: "",
      severity: "warning",
      ruleType: "regex",
      ruleConfig: "{}",
      errorMessage: "",
      suggestedFix: "",
      appliesToStage: ["draft"],
      sortOrder: 1,
      isActive: true,
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: RuleFormData) => {
      const res = await apiRequest("POST", "/api/admin/guardrails/rules", {
        ...data,
        ruleConfig: JSON.parse(data.ruleConfig),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardrails/rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardrails/stats"] });
      setShowCreateDialog(false);
      form.reset();
      toast({ title: "Success", description: "Guardrail rule created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RuleFormData }) => {
      const res = await apiRequest("PATCH", `/api/admin/guardrails/rules/${id}`, {
        ...data,
        ruleConfig: JSON.parse(data.ruleConfig),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardrails/rules"] });
      setEditingRule(null);
      form.reset();
      toast({ title: "Success", description: "Guardrail rule updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/guardrails/rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardrails/rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardrails/stats"] });
      setDeletingRule(null);
      toast({ title: "Success", description: "Guardrail rule deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/guardrails/rules/${id}/toggle`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardrails/rules"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const testRulesMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/admin/guardrails/test", { content });
      return res.json() as Promise<TestResult>;
    },
    onSuccess: (data) => {
      setTestResults(data);
      setTestingRules(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setTestingRules(false);
    },
  });

  const seedGuardrailsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/guardrails/seed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardrails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardrails/rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardrails/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardrails/stats"] });
      toast({ title: "Success", description: "Guardrails seeded successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredRules = useMemo(() => {
    if (!rules) return [];
    return rules.filter((rule) => {
      const matchesCategory = !selectedCategory || rule.categoryId === selectedCategory;
      const matchesSearch = !searchQuery || 
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [rules, selectedCategory, searchQuery]);

  const rulesByCategory = useMemo(() => {
    if (!rules || !categories) return {};
    const grouped: Record<string, GuardrailRule[]> = {};
    for (const cat of categories) {
      grouped[cat.id] = rules.filter(r => r.categoryId === cat.id);
    }
    return grouped;
  }, [rules, categories]);

  const handleEditRule = (rule: GuardrailRule) => {
    setEditingRule(rule);
    form.reset({
      categoryId: rule.categoryId,
      name: rule.name,
      description: rule.description,
      severity: rule.severity,
      ruleType: rule.ruleType,
      ruleConfig: JSON.stringify(rule.ruleConfig, null, 2),
      errorMessage: rule.errorMessage,
      suggestedFix: rule.suggestedFix,
      appliesToStage: rule.appliesToStage,
      sortOrder: rule.sortOrder,
      isActive: rule.isActive,
    });
  };

  const handleTestRules = () => {
    if (!testContent.trim()) {
      toast({ title: "Error", description: "Please enter content to test", variant: "destructive" });
      return;
    }
    setTestingRules(true);
    setTestResults(null);
    testRulesMutation.mutate(testContent);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "error":
        return <Badge variant="destructive" data-testid={`badge-severity-error`}><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case "warning":
        return <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600" data-testid={`badge-severity-warning`}><Info className="w-3 h-3 mr-1" />Warning</Badge>;
      case "info":
        return <Badge variant="secondary" data-testid={`badge-severity-info`}><Info className="w-3 h-3 mr-1" />Info</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const isLoading = categoriesLoading || rulesLoading;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Guardrails Management</h1>
            <p className="text-muted-foreground">
              Manage the 350+ consulting-grade content quality rules
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => seedGuardrailsMutation.mutate()}
              disabled={seedGuardrailsMutation.isPending}
              data-testid="button-seed-guardrails"
            >
              {seedGuardrailsMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4 mr-2" />
              )}
              Seed Rules
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-rule">
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card data-testid="card-stat-total">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalRules || rules?.length || 0}</div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-active">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.activeRules || rules?.filter(r => r.isActive).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-categories">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.categories || categories?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="browse" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1" data-testid="tabs-guardrails">
            <TabsTrigger value="browse" data-testid="tab-browse">
              <Shield className="w-4 h-4 mr-2" />
              Browse Rules
            </TabsTrigger>
            <TabsTrigger value="test" data-testid="tab-test">
              <Play className="w-4 h-4 mr-2" />
              Test Content
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search rules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-rules"
                />
              </div>
              <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}>
                <SelectTrigger className="w-full lg:w-[250px]" data-testid="select-category-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name} ({rulesByCategory[cat.id]?.length || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-96 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {[1, 2, 3].map((j) => (
                          <Skeleton key={j} className="h-12 w-full" />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : selectedCategory ? (
              <Card data-testid={`card-category-${selectedCategory}`}>
                <CardHeader>
                  <CardTitle>{categories?.find(c => c.id === selectedCategory)?.name}</CardTitle>
                  <CardDescription>
                    {categories?.find(c => c.id === selectedCategory)?.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="overflow-x-auto">
                    <Table className="min-w-[800px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Rule Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[100px]">Severity</TableHead>
                          <TableHead className="w-[100px]">Type</TableHead>
                          <TableHead className="w-[80px]">Active</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRules.map((rule) => (
                          <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                            <TableCell className="font-medium">{rule.name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                              {rule.description}
                            </TableCell>
                            <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{rule.ruleType}</Badge>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={rule.isActive}
                                onCheckedChange={(checked) => toggleRuleMutation.mutate({ id: rule.id, isActive: checked })}
                                data-testid={`switch-rule-active-${rule.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditRule(rule)}
                                  data-testid={`button-edit-rule-${rule.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingRule(rule)}
                                  data-testid={`button-delete-rule-${rule.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {categories?.map((category) => (
                  <Card key={category.id} data-testid={`card-category-${category.id}`}>
                    <div
                      className="cursor-pointer hover-elevate"
                      onClick={() => toggleCategory(category.id)}
                    >
                      <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {category.description} ({rulesByCategory[category.id]?.length || 0} rules)
                          </CardDescription>
                        </div>
                        {expandedCategories.has(category.id) ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </CardHeader>
                    </div>
                    {expandedCategories.has(category.id) && (
                      <CardContent>
                        <div className="overflow-x-auto">
                        <Table className="min-w-[800px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[200px]">Rule Name</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="w-[100px]">Severity</TableHead>
                              <TableHead className="w-[100px]">Type</TableHead>
                              <TableHead className="w-[80px]">Active</TableHead>
                              <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rulesByCategory[category.id]?.map((rule) => (
                              <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                                <TableCell className="font-medium">{rule.name}</TableCell>
                                <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                                  {rule.description}
                                </TableCell>
                                <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{rule.ruleType}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Switch
                                    checked={rule.isActive}
                                    onCheckedChange={(checked) => toggleRuleMutation.mutate({ id: rule.id, isActive: checked })}
                                    data-testid={`switch-rule-active-${rule.id}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditRule(rule)}
                                      data-testid={`button-edit-rule-${rule.id}`}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeletingRule(rule)}
                                      data-testid={`button-delete-rule-${rule.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
            <Card data-testid="card-test-content">
              <CardHeader>
                <CardTitle>Test Guardrails</CardTitle>
                <CardDescription>
                  Enter content to test against all active guardrail rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste or type content to test against guardrails..."
                  value={testContent}
                  onChange={(e) => setTestContent(e.target.value)}
                  rows={10}
                  data-testid="textarea-test-content"
                />
                <Button
                  onClick={handleTestRules}
                  disabled={testingRules || !testContent.trim()}
                  data-testid="button-run-test"
                >
                  {testingRules ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Run Guardrail Check
                </Button>

                {testResults && (
                  <div className="mt-6 space-y-4" data-testid="test-results">
                    <div className="flex items-center gap-2">
                      {testResults.passed ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-500" />
                      )}
                      <span className="text-lg font-semibold">
                        {testResults.passed ? "Content Passed" : "Content Failed"}
                      </span>
                      <Badge variant={testResults.passed ? "default" : "destructive"}>
                        {testResults.violations.length} violation{testResults.violations.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>

                    {testResults.violations.length > 0 && (
                      <ScrollArea className="h-[300px] border rounded-md p-4">
                        <div className="space-y-3">
                          {testResults.violations.map((v, i) => (
                            <div key={i} className="border-l-4 border-l-destructive pl-4 py-2" data-testid={`violation-${i}`}>
                              <div className="flex items-center gap-2 mb-1">
                                {getSeverityBadge(v.severity)}
                                <span className="font-medium">{v.ruleName}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{v.message}</p>
                              {v.suggestedFix && (
                                <p className="text-sm text-blue-600 mt-1">
                                  Suggested fix: {v.suggestedFix}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showCreateDialog || !!editingRule} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingRule(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Guardrail Rule" : "Create Guardrail Rule"}</DialogTitle>
            <DialogDescription>
              {editingRule ? "Update the guardrail rule configuration" : "Add a new content quality rule"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => {
                if (editingRule) {
                  updateRuleMutation.mutate({ id: editingRule.id, data });
                } else {
                  createRuleMutation.mutate(data);
                }
              })}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rule Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., No Filler Phrases" {...field} data-testid="input-rule-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-rule-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of what this rule checks" {...field} data-testid="input-rule-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severity</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-rule-severity">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="error">Error (Blocks publish)</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ruleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rule Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-rule-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="regex">Regex Pattern</SelectItem>
                          <SelectItem value="word_count">Word Count</SelectItem>
                          <SelectItem value="custom">Custom Logic</SelectItem>
                          <SelectItem value="structure">Structure Check</SelectItem>
                          <SelectItem value="winston">Winston AI Check</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-rule-sort-order"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ruleConfig"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Configuration (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"pattern": "\\\\b(example)\\\\b", "mustMatch": false}'
                        rows={4}
                        className="font-mono text-sm"
                        {...field}
                        data-testid="textarea-rule-config"
                      />
                    </FormControl>
                    <FormDescription>
                      For regex: {"{"} pattern, mustMatch, flags {"}"}. For word_count: {"{"} minWords, maxWords {"}"}.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="errorMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Error Message</FormLabel>
                    <FormControl>
                      <Input placeholder="Message shown when rule is violated" {...field} data-testid="input-error-message" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="suggestedFix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suggested Fix</FormLabel>
                    <FormControl>
                      <Input placeholder="How to fix the violation" {...field} data-testid="input-suggested-fix" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-rule-is-active" />
                    </FormControl>
                    <FormLabel className="!mt-0">Rule is active</FormLabel>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setShowCreateDialog(false);
                  setEditingRule(null);
                  form.reset();
                }} data-testid="button-cancel-rule">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                  data-testid="button-save-rule"
                >
                  {(createRuleMutation.isPending || updateRuleMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingRule ? "Update Rule" : "Create Rule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingRule} onOpenChange={(open) => !open && setDeletingRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Guardrail Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingRule?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRule && deleteRuleMutation.mutate(deletingRule.id)}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteRuleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

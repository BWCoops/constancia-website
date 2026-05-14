import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle, 
  Copy, 
  Globe, 
  MousePointer, 
  Shield, 
  TrendingUp, 
  Users, 
  Clock,
  CheckCircle,
  ExternalLink,
  Info
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface AdFraudStats {
  totalClicks: number;
  suspiciousClicks: number;
  clicksLast24h: number;
  suspiciousLast24h: number;
  avgSuspiciousScore: number;
  uniqueIPs: number;
}

interface SuspiciousIP {
  ipAddress: string;
  country: string | null;
  city: string | null;
  clickCount: number;
  avgScore: number;
  maxScore: number;
  firstSeen: string;
  lastSeen: string;
}

interface CountryStat {
  country: string;
  clickCount: number;
  avgScore: number;
  suspiciousCount: number;
}

function StatCard({ title, value, icon: Icon, description, variant = "default" }: {
  title: string;
  value: string | number;
  icon: typeof AlertTriangle;
  description?: string;
  variant?: "default" | "warning" | "danger";
}) {
  const bgColor = variant === "danger" ? "bg-red-50 dark:bg-red-950/20" : 
                  variant === "warning" ? "bg-amber-50 dark:bg-amber-950/20" : "";
  const iconColor = variant === "danger" ? "text-red-500" :
                    variant === "warning" ? "text-amber-500" : "text-primary";
  
  return (
    <Card className={bgColor}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

function getSuspiciousBadge(score: number) {
  if (score >= 70) return <Badge variant="destructive">High Risk</Badge>;
  if (score >= 50) return <Badge className="bg-amber-500 hover:bg-amber-600">Medium Risk</Badge>;
  return <Badge variant="secondary">Low Risk</Badge>;
}

export default function AdminAdFraud() {
  const { toast } = useToast();
  const [copiedIPs, setCopiedIPs] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<AdFraudStats>({
    queryKey: ["/api/admin/ad-fraud/stats"],
  });

  const { data: suspiciousIPs, isLoading: suspiciousLoading } = useQuery<SuspiciousIP[]>({
    queryKey: ["/api/admin/ad-fraud/suspicious"],
  });

  const { data: countryStats, isLoading: countriesLoading } = useQuery<CountryStat[]>({
    queryKey: ["/api/admin/ad-fraud/countries"],
  });

  const copyIPList = () => {
    if (!suspiciousIPs || suspiciousIPs.length === 0) {
      toast({ title: "No IPs to copy", description: "There are no suspicious IPs to copy.", variant: "destructive" });
      return;
    }
    const ipList = suspiciousIPs.map(ip => ip.ipAddress).join('\n');
    navigator.clipboard.writeText(ipList);
    setCopiedIPs(true);
    toast({ title: "IP list copied", description: `${suspiciousIPs.length} IP addresses copied to clipboard.` });
    setTimeout(() => setCopiedIPs(false), 3000);
  };

  const chartData = countryStats?.slice(0, 10).map(c => ({
    name: c.country.length > 12 ? c.country.substring(0, 12) + '...' : c.country,
    clicks: c.clickCount,
    suspicious: c.suspiciousCount,
    avgScore: c.avgScore,
  })) || [];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Ad Click Fraud Tracking</h1>
            <p className="text-muted-foreground">Monitor and identify suspicious ad clicks from Google Ads campaigns</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-20" /></CardContent></Card>
              ))}
            </>
          ) : (
            <>
              <StatCard 
                title="Total Clicks Tracked" 
                value={stats?.totalClicks || 0} 
                icon={MousePointer}
                description="All tracked ad clicks"
              />
              <StatCard 
                title="Suspicious Clicks" 
                value={stats?.suspiciousClicks || 0} 
                icon={AlertTriangle}
                description="Score 50 or higher"
                variant={stats?.suspiciousClicks && stats.suspiciousClicks > 0 ? "warning" : "default"}
              />
              <StatCard 
                title="Clicks (24h)" 
                value={stats?.clicksLast24h || 0} 
                icon={Clock}
                description={`${stats?.suspiciousLast24h || 0} suspicious`}
              />
              <StatCard 
                title="Unique IPs" 
                value={stats?.uniqueIPs || 0} 
                icon={Users}
                description="Distinct IP addresses"
              />
            </>
          )}
        </div>

        <Tabs defaultValue="suspicious" className="space-y-4">
          <TabsList>
            <TabsTrigger value="suspicious" data-testid="tab-suspicious">Suspicious IPs</TabsTrigger>
            <TabsTrigger value="countries" data-testid="tab-countries">Country Breakdown</TabsTrigger>
            <TabsTrigger value="guide" data-testid="tab-guide">Exclusion Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="suspicious" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Suspicious IP Addresses
                  </CardTitle>
                  <CardDescription>
                    IP addresses flagged for potential click fraud. Copy and add these to your Google Ads IP exclusion list.
                  </CardDescription>
                </div>
                <Button 
                  onClick={copyIPList} 
                  disabled={!suspiciousIPs || suspiciousIPs.length === 0}
                  data-testid="button-copy-ips"
                >
                  {copiedIPs ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copiedIPs ? "Copied!" : "Copy IP List"}
                </Button>
              </CardHeader>
              <CardContent>
                {suspiciousLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : suspiciousIPs && suspiciousIPs.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-center">Clicks</TableHead>
                          <TableHead className="text-center">Avg Score</TableHead>
                          <TableHead>Risk Level</TableHead>
                          <TableHead>Last Seen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suspiciousIPs.map((ip) => (
                          <TableRow key={ip.ipAddress} data-testid={`row-ip-${ip.ipAddress}`}>
                            <TableCell className="font-mono text-sm">{ip.ipAddress}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Globe className="h-3 w-3 text-muted-foreground" />
                                <span>{ip.country || 'Unknown'}{ip.city ? `, ${ip.city}` : ''}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{ip.clickCount}</TableCell>
                            <TableCell className="text-center">{ip.avgScore}</TableCell>
                            <TableCell>{getSuspiciousBadge(ip.avgScore)}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(ip.lastSeen).toLocaleDateString('en-GB')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No suspicious IP addresses detected yet.</p>
                    <p className="text-sm">Ad clicks will be analysed automatically as they come in.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="countries" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Clicks by Country
                </CardTitle>
                <CardDescription>
                  Geographic distribution of ad clicks. High-risk countries are highlighted.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {countriesLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip 
                        formatter={(value, name) => [value, name === 'clicks' ? 'Total Clicks' : 'Suspicious']}
                        labelFormatter={(label) => `Country: ${label}`}
                      />
                      <Bar dataKey="clicks" name="Total Clicks" stackId="a" fill="hsl(var(--primary))" />
                      <Bar dataKey="suspicious" name="Suspicious" stackId="b" fill="hsl(var(--destructive))">
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.avgScore >= 50 ? "hsl(var(--destructive))" : "hsl(45 93% 47%)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No country data available yet.</p>
                  </div>
                )}

                {countryStats && countryStats.length > 0 && (
                  <div className="mt-6 rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Country</TableHead>
                          <TableHead className="text-center">Total Clicks</TableHead>
                          <TableHead className="text-center">Suspicious</TableHead>
                          <TableHead className="text-center">Avg Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {countryStats.map((country) => (
                          <TableRow key={country.country} data-testid={`row-country-${country.country}`}>
                            <TableCell className="font-medium">{country.country}</TableCell>
                            <TableCell className="text-center">{country.clickCount}</TableCell>
                            <TableCell className="text-center">{country.suspiciousCount}</TableCell>
                            <TableCell className="text-center">{getSuspiciousBadge(country.avgScore)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guide" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  How to Add IP Exclusions in Google Ads
                </CardTitle>
                <CardDescription>
                  Step-by-step guide to block suspicious IP addresses from seeing your ads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">1</div>
                    <div>
                      <h4 className="font-semibold">Copy the suspicious IP list</h4>
                      <p className="text-muted-foreground text-sm">
                        Go to the "Suspicious IPs" tab and click the "Copy IP List" button to copy all flagged IP addresses to your clipboard.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">2</div>
                    <div>
                      <h4 className="font-semibold">Open Google Ads</h4>
                      <p className="text-muted-foreground text-sm">
                        Sign in to your Google Ads account at{" "}
                        <a href="https://ads.google.com" target="_blank" rel="nofollow noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          ads.google.com <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">3</div>
                    <div>
                      <h4 className="font-semibold">Navigate to IP Exclusions</h4>
                      <p className="text-muted-foreground text-sm">
                        Go to <strong>Settings</strong> → <strong>Additional settings</strong> → <strong>IP exclusions</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">4</div>
                    <div>
                      <h4 className="font-semibold">Add the IP addresses</h4>
                      <p className="text-muted-foreground text-sm">
                        Click "Edit IP exclusions", paste the copied IP addresses (one per line), and save your changes.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">5</div>
                    <div>
                      <h4 className="font-semibold">Monitor and update regularly</h4>
                      <p className="text-muted-foreground text-sm">
                        Check this dashboard weekly to identify new suspicious IPs and keep your exclusion list up to date. 
                        Google Ads allows up to 500 IP exclusions per campaign.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4">
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Important Notes
                  </h4>
                  <ul className="mt-2 text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc pl-5">
                    <li>Google Ads has a limit of 500 IP addresses per campaign</li>
                    <li>IP exclusions apply at the campaign level, not account level</li>
                    <li>Consider using CIDR notation (e.g., 192.168.1.0/24) to block IP ranges</li>
                    <li>Review exclusions periodically as IP addresses can be reassigned</li>
                    <li>High-risk countries can also be excluded via location targeting settings</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

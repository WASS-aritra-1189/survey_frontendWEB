import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Users, ClipboardList, TrendingUp, RotateCcw, CalendarIcon, Printer, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useAuthStore } from "@/store/authStore";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSurveys } from "@/store/surveySlice";
import { performanceAnalyticsService } from "@/services/performanceAnalyticsService";
import { surveyMasterService } from "@/services/surveyMasterService";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";

interface MasterAnalytics {
  id: string;
  loginId: string;
  status: string;
  surveyLimit: number;
  totalResponses: number;
  totalSurveysAssigned: number;
  dailyTrend: { date: string; count: number }[];
}

interface AnalyticsData {
  data: MasterAnalytics[];
  totalResponses: number;
  totalMasters: number;
}

interface SurveyMasterOption {
  id: string;
  loginId: string;
}

export default function PerformanceAnalytics() {
  const dispatch = useAppDispatch();
  const { tokens } = useAuthStore();
  const { data: surveys } = useAppSelector((state) => state.survey);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [masters, setMasters] = useState<SurveyMasterOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [surveyId, setSurveyId] = useState("all");
  const [masterId, setMasterId] = useState("all");
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Performance Analytics</title>
      <style>
        body { font-family: Inter, sans-serif; padding: 20px; color: #111; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
        th { background: #f1f5f9; font-weight: 600; }
        .badge { display: inline-block; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px 8px; font-size: 11px; }
        h3 { margin: 16px 0 8px; font-size: 15px; }
        svg text { font-size: 11px; }
      </style></head><body>
      <h2 style="margin-bottom:16px">Performance Analytics Report</h2>
      ${content}
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsPdfLoading(true);
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      let remainingHeight = (canvas.height * imgWidth) / canvas.width;
      let sourceY = 0;
      let isFirst = true;
      while (remainingHeight > 0) {
        const sliceHeight = Math.min(remainingHeight, pageHeight - 20);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = (sliceHeight / imgWidth) * canvas.width;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
        if (!isFirst) pdf.addPage();
        pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 10, 10, imgWidth, sliceHeight);
        sourceY += sliceCanvas.height;
        remainingHeight -= sliceHeight;
        isFirst = false;
      }
      pdf.save('performance-analytics.pdf');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const fetchMasters = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const res = await surveyMasterService.getAll(100, 1, tokens.accessToken);
      const list = res?.data?.data ?? res?.data ?? [];
      setMasters(list.map((m: any) => ({ id: m.id, loginId: m.loginId })));
    } catch {}
  }, [tokens]);

  const fetchAnalytics = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await performanceAnalyticsService.getAnalytics(tokens.accessToken, {
        startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
        surveyId: surveyId !== "all" ? surveyId : undefined,
        masterId: masterId !== "all" ? masterId : undefined,
      });
      setAnalytics(result.data ?? result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [tokens, startDate, endDate, surveyId, masterId]);

  useEffect(() => {
    if (tokens?.accessToken) {
      dispatch(fetchSurveys({ token: tokens.accessToken, limit: 100 }));
      fetchMasters();
      fetchAnalytics();
    }
  }, [dispatch, tokens]);

  const handleReset = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSurveyId("all");
    setMasterId("all");
  };

  const barData = (analytics?.data ?? []).map((m) => ({
    name: m.loginId,
    responses: m.totalResponses,
    surveys: m.totalSurveysAssigned,
  }));

  const trendMap: Record<string, number> = {};
  (analytics?.data ?? []).forEach((m) => {
    m.dailyTrend.forEach(({ date, count }) => {
      trendMap[date] = (trendMap[date] || 0) + count;
    });
  });
  const trendData = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return (
    <AdminLayout title="Performance Analytics" subtitle="Track response collection performance of survey masters">
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-40 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd MMM yyyy") : <span className="text-muted-foreground">Pick date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-40 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd MMM yyyy") : <span className="text-muted-foreground">Pick date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus disabled={(date) => startDate ? date < startDate : false} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Survey Master</label>
              <Select value={masterId} onValueChange={setMasterId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Masters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Masters</SelectItem>
                  {masters.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.loginId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Survey</label>
              <Select value={surveyId} onValueChange={setSurveyId}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="All Surveys" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Surveys</SelectItem>
                  {surveys.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchAnalytics} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Apply
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
            {analytics && analytics.data.length > 0 && (
              <>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
                <Button variant="outline" onClick={handleDownloadPdf} disabled={isPdfLoading}>
                  {isPdfLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  Download PDF
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
        <Card variant="stat">
          <div className="flex items-center gap-4 p-4">
            <Users className="text-primary" />
            <div>
              <p className="text-2xl font-bold">{analytics?.totalMasters ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Masters</p>
            </div>
          </div>
        </Card>
        <Card variant="stat">
          <div className="flex items-center gap-4 p-4">
            <ClipboardList className="text-success" />
            <div>
              <p className="text-2xl font-bold">{analytics?.totalResponses ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Responses</p>
            </div>
          </div>
        </Card>
        <Card variant="stat">
          <div className="flex items-center gap-4 p-4">
            <TrendingUp className="text-accent" />
            <div>
              <p className="text-2xl font-bold">
                {analytics?.totalMasters
                  ? (analytics.totalResponses / analytics.totalMasters).toFixed(1)
                  : 0}
              </p>
              <p className="text-sm text-muted-foreground">Avg Responses / Master</p>
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-center text-destructive py-12">{error}</p>
      ) : !analytics || analytics.data.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No data available</p>
      ) : (
        <div ref={printRef} className="space-y-6">
          {/* Bar Chart */}
          <Card>
            <CardHeader><CardTitle>Responses per Master</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="responses" fill="hsl(var(--primary))" name="Responses" />
                  <Bar dataKey="surveys" fill="hsl(var(--accent))" name="Surveys Assigned" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily Trend */}
          {trendData.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Daily Response Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" name="Responses" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader><CardTitle>Master-wise Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-3">Login ID</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="text-right py-2 px-3">Survey Limit</th>
                      <th className="text-right py-2 px-3">Surveys Assigned</th>
                      <th className="text-right py-2 px-3">Responses Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.data.map((master) => (
                      <tr
                        key={master.id}
                        className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/responses?masterId=${master.id}&masterLoginId=${encodeURIComponent(master.loginId)}`)}
                      >
                        <td className="py-2 px-3 font-medium">{master.loginId}</td>
                        <td className="py-2 px-3">
                          <Badge variant={master.status === "ACTIVE" ? "default" : "secondary"}>
                            {master.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right">{master.surveyLimit}</td>
                        <td className="py-2 px-3 text-right">{master.totalSurveysAssigned}</td>
                        <td className="py-2 px-3 text-right font-semibold">{master.totalResponses}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}

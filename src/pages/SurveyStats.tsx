import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2, FileText, TrendingUp, Table2, Printer, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useAuthStore } from "@/store/authStore";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSurveyStats, clearStats } from "@/store/statsSlice";
import { fetchSurveys } from "@/store/surveySlice";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { useNavigate } from "react-router-dom";

type ChartType = 'bar' | 'pie' | 'vertical-bar';

export default function SurveyStats() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { tokens } = useAuthStore();
  const { data: surveys } = useAppSelector((state) => state.survey);
  const { data: stats, isLoading } = useAppSelector((state) => state.stats);

  const [surveyFilter, setSurveyFilter] = useState("all");
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const selectedSurveyTitle = surveys.find(s => s.id === surveyFilter)?.title || 'Survey Statistics';

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>${selectedSurveyTitle}</title>
      <style>
        body { font-family: Inter, sans-serif; padding: 20px; color: #111; }
        .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .badge { display: inline-block; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px 8px; font-size: 12px; }
        h4 { margin: 8px 0 4px; font-size: 14px; }
        p { margin: 0 0 8px; font-size: 12px; color: #64748b; }
        .progress-bar-wrap { margin-bottom: 8px; }
        .progress-label { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
        .progress-track { background: #e2e8f0; border-radius: 4px; height: 8px; }
        .progress-fill { background: #0ea5e9; border-radius: 4px; height: 8px; }
        svg text { font-size: 11px; }
      </style></head><body>
      <h2 style="margin-bottom:16px">${selectedSurveyTitle} — Statistics</h2>
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
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let y = 10;
      let remainingHeight = imgHeight;
      let sourceY = 0;
      while (remainingHeight > 0) {
        const sliceHeight = Math.min(remainingHeight, pageHeight - 20);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = (sliceHeight / imgWidth) * canvas.width;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
        if (sourceY > 0) { pdf.addPage(); y = 10; }
        pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 10, y, imgWidth, sliceHeight);
        sourceY += sliceCanvas.height;
        remainingHeight -= sliceHeight;
      }
      pdf.save(`${selectedSurveyTitle}.pdf`);
    } finally {
      setIsPdfLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

  useEffect(() => {
    if (tokens?.accessToken) {
      dispatch(fetchSurveys({ token: tokens.accessToken, limit: 100 }));
    }
  }, [dispatch, tokens]);

  useEffect(() => {
    if (surveyFilter !== "all" && tokens?.accessToken) {
      dispatch(fetchSurveyStats({ token: tokens.accessToken, surveyId: surveyFilter }));
    } else {
      dispatch(clearStats());
    }
  }, [surveyFilter, dispatch, tokens]);

  const renderChart = (question: any) => {
    let dataSource = question.answerCounts;

    if (question.questionType === 'single_choice' || question.questionType === 'multiple_choice') {
      dataSource = question.optionCounts;
    } else if (question.questionType === 'rating') {
      dataSource = question.ratingDistribution;
    }

    if (!dataSource || typeof dataSource !== 'object') {
      return <p className="text-sm text-muted-foreground italic">No data available</p>;
    }

    const chartData = Object.entries(dataSource).map(([answer, count]) => ({
      name: answer,
      value: count as number,
      percentage: ((count as number / question.totalAnswers) * 100).toFixed(1),
    }));

    if (chartData.length === 0) {
      return <p className="text-sm text-muted-foreground italic">No answers yet</p>;
    }

    // ✅ PIE CHART WITH TRUNCATED LEGEND
    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
            >
              {chartData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{ fontSize: '12px' }}
              formatter={(value, name) => [value, name]}
            />

            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              formatter={(value: string) =>
                value && value.length > 10
                  ? value.slice(0, 10) + "..."
                  : value
              }
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    // ✅ VERTICAL BAR
    if (chartType === 'vertical-bar') {
      return (
        <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: '12px' }} />
            <Bar dataKey="value" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // ✅ DEFAULT (PROGRESS BAR VIEW)
    return (
      <div className="space-y-2">
        {chartData.map((item) => (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-medium truncate flex-1 mr-2">{item.name}</span>
              <span className="text-muted-foreground whitespace-nowrap">
                {item.value} ({item.percentage}%)
              </span>
            </div>
            <Progress value={parseFloat(item.percentage)} className="h-2" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <AdminLayout title="Survey Statistics" subtitle="View detailed analytics and statistics for surveys">
      
      {/* STATS CARDS */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card variant="stat">
          <div className="flex items-center gap-4 p-4">
            <FileText className="text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats?.totalResponses || 0}</p>
              <p className="text-sm text-muted-foreground">Total Responses</p>
            </div>
          </div>
        </Card>

        <Card variant="stat">
          <div className="flex items-center gap-4 p-4">
            <BarChart3 className="text-success" />
            <div>
              <p className="text-2xl font-bold">{stats?.questionStats.length || 0}</p>
              <p className="text-sm text-muted-foreground">Questions</p>
            </div>
          </div>
        </Card>

        <Card variant="stat">
          <div className="flex items-center gap-4 p-4">
            <TrendingUp className="text-accent" />
            <div>
              <p className="text-2xl font-bold">
                {stats?.questionStats.filter(q => q.totalAnswers > 0).length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Answered Questions</p>
            </div>
          </div>
        </Card>
      </div>

      {/* MAIN CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Question Statistics</CardTitle>

          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            {surveyFilter !== "all" && (
              <Button onClick={() => navigate(`/crosstab/${surveyFilter}`)} variant="outline" size="sm">
                <Table2 className="h-4 w-4 mr-2" />
                Crosstab
              </Button>
            )}
            {stats && surveyFilter !== "all" && (
              <>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isPdfLoading}>
                  {isPdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Download PDF
                </Button>
              </>
            )}

            <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Horizontal Bar</SelectItem>
                <SelectItem value="vertical-bar">Vertical Bar</SelectItem>
                <SelectItem value="pie">Pie Chart</SelectItem>
              </SelectContent>
            </Select>

            <Select value={surveyFilter} onValueChange={setSurveyFilter}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select Survey" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Select Survey</SelectItem>
                {surveys.map((survey) => (
                  <SelectItem key={survey.id} value={survey.id}>
                    {survey.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : surveyFilter === "all" ? (
            <p className="text-center text-muted-foreground py-12">
              Please select a survey to view statistics
            </p>
          ) : !stats ? (
            <p className="text-center text-muted-foreground py-12">
              No statistics available
            </p>
          ) : (
            <div ref={printRef} className="space-y-6">
              {stats.questionStats.map((question, index) => (
                <Card key={question.questionId} className="p-4">
                  <Badge variant="outline">Q{index + 1}</Badge>
                  <h4 className="font-medium mt-2">{question.questionText}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {question.totalAnswers} answers
                  </p>
                  {renderChart(question)}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2, FileText, TrendingUp, PieChart as PieChartIcon, Table2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSurveyStats, clearStats } from "@/store/statsSlice";
import { fetchSurveys } from "@/store/surveySlice";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
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

  const renderChart = (question: any, index: number) => {
    // Determine which data field to use based on question type
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

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              outerRadius={60}
              fill="#8884d8"
              dataKey="value"
              className="sm:outerRadius-80"
            >
              {chartData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

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

    return (
      <div className="space-y-2">
        {chartData.map((item) => (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-medium truncate flex-1 mr-2">{item.name}</span>
              <span className="text-muted-foreground whitespace-nowrap">{item.value} ({item.percentage}%)</span>
            </div>
            <Progress value={parseFloat(item.percentage)} className="h-2" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <AdminLayout title="Survey Statistics" subtitle="View detailed analytics and statistics for surveys">
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-4 sm:mb-6">
        <Card variant="stat" className="p-3 sm:p-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="rounded-xl bg-primary/10 p-2 sm:p-3">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold">{stats?.totalResponses || 0}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Responses</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" className="p-3 sm:p-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="rounded-xl bg-success/10 p-2 sm:p-3">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold">{stats?.questionStats.length || 0}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Questions</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" className="p-3 sm:p-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="rounded-xl bg-accent/10 p-2 sm:p-3">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold">{stats?.questionStats.filter(q => q.totalAnswers > 0).length || 0}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Answered Questions</p>
            </div>
          </div>
        </Card>
      </div>

      <Card variant="elevated">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <CardTitle className="text-base sm:text-lg">Question Statistics</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              {surveyFilter !== "all" && (
                <Button onClick={() => navigate(`/crosstab/${surveyFilter}`)} variant="outline" size="sm" className="w-full sm:w-auto">
                  <Table2 className="h-4 w-4 mr-2" />
                  Crosstab
                </Button>
              )}
              <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Chart Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Horizontal Bar</SelectItem>
                  <SelectItem value="vertical-bar">Vertical Bar</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                </SelectContent>
              </Select>
              <Select value={surveyFilter} onValueChange={setSurveyFilter}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Select Survey" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Select Survey</SelectItem>
                  {surveys.map((survey) => (
                    <SelectItem key={survey.id} value={survey.id}>{survey.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : surveyFilter === "all" ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Please select a survey to view statistics</p>
            </div>
          ) : !stats ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No statistics available</p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold mb-2">{stats.surveyTitle}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Responses: {stats.totalResponses}</p>
              </div>

              {stats.questionStats.map((question, index) => (
                <Card key={question.questionId} className="p-3 sm:p-4">
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">Q{index + 1}</Badge>
                          <h4 className="font-medium text-sm sm:text-base">{question.questionText}</h4>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {question.totalAnswers} {question.totalAnswers === 1 ? 'answer' : 'answers'}
                        </p>
                      </div>
                    </div>

                    {question.totalAnswers > 0 ? (
                      renderChart(question, index)
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground italic">No answers yet</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

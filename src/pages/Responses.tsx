import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, Download, Eye, CalendarIcon,
  FileSpreadsheet, FileText, CheckCircle, Star, TrendingUp,
  ChevronLeft, ChevronRight, User, MessageSquare, Loader2, X, MapPin, Volume2, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchResponses, clearResponses } from "@/store/responseSlice";
import { fetchSurveys } from "@/store/surveySlice";
import { SurveyResponse } from "@/services/responseService";
import { exportResponsesToCSV, exportResponsesToPDF } from "@/lib/exportUtils";
import { BaseUrl } from "@/config/BaseUrl";
import { AudioPlayer } from "@/components/AudioPlayer";

export default function Responses() {
  const dispatch = useAppDispatch();
  const { tokens } = useAuthStore();
  const location = useLocation();
  const { data: surveys } = useAppSelector((state) => state.survey);
  const { data: responses, total, isLoading } = useAppSelector((state) => state.response);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [surveyFilter, setSurveyFilter] = useState("all");
  const [masterFilter, setMasterFilter] = useState("all");
  const [masterFilterLabel, setMasterFilterLabel] = useState<string | null>(null);
  const [surveyMasters, setSurveyMasters] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailQuestions, setDetailQuestions] = useState<Record<string, string>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filterLat, setFilterLat] = useState("");
  const [filterLng, setFilterLng] = useState("");
  const [filterRadius, setFilterRadius] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const masterId = params.get("masterId");
    const masterLoginId = params.get("masterLoginId");
    if (masterId) {
      setMasterFilter(masterId);
      setMasterFilterLabel(masterLoginId ? decodeURIComponent(masterLoginId) : masterId);
    }
  }, [location.search]);

  useEffect(() => {
    if (tokens?.accessToken) {
      dispatch(fetchSurveys({ token: tokens.accessToken, limit: 100 }));
      fetchSurveyMasters();
    }
  }, [dispatch, tokens]);

  const fetchSurveyMasters = async () => {
    if (!tokens?.accessToken) return;
    try {
      const response = await fetch(`${BaseUrl}/survey-masters?limit=100&page=1`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      const result = await response.json();
      if (result.success) {
        setSurveyMasters(result.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load survey masters');
    }
  };

  useEffect(() => {
    if (surveyFilter !== "all" && tokens?.accessToken) {
      dispatch(fetchResponses({
        token: tokens.accessToken,
        surveyId: surveyFilter,
        page,
        limit,
        search: searchQuery || undefined,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        surveyMasterIds: masterFilter !== "all" ? masterFilter : undefined,
        filterLat: filterLat && filterLng && filterRadius ? parseFloat(filterLat) : undefined,
        filterLng: filterLat && filterLng && filterRadius ? parseFloat(filterLng) : undefined,
        filterRadius: filterLat && filterLng && filterRadius ? parseFloat(filterRadius) : undefined,
      }));
    } else {
      dispatch(clearResponses());
    }
  }, [surveyFilter, masterFilter, searchQuery, page, limit, startDate, endDate, filterLat, filterLng, filterRadius, dispatch, tokens]);

  const handleExport = (fmt: string) => {
    if (!selectedResponse && surveyFilter === 'all') {
      toast.error('Please select a survey first');
      return;
    }

    const dataToExport = selectedResponse ? [selectedResponse] : responses;
    
    if (fmt === 'pdf') {
      exportResponsesToPDF(dataToExport);
    } else if (fmt === 'excel' || fmt === 'csv') {
      exportResponsesToCSV(dataToExport);
    }
  };

  const openDetail = async (response: SurveyResponse) => {
    setSelectedResponse(response);
    setDetailOpen(true);
    setDetailQuestions({});
    if (!tokens?.accessToken) return;
    setLoadingQuestions(true);
    try {
      // Fetch full response to ensure latitude, longitude, audioUrl are present
      const [fullRes, surveyRes] = await Promise.all([
        fetch(`${BaseUrl}/survey-responses/${response.id}`, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        }).then(r => r.json()),
        response.surveyId ? fetch(`${BaseUrl}/surveys/public/${response.surveyId}`, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        }).then(r => r.json()) : Promise.resolve(null),
      ]);
      if (fullRes?.data) setSelectedResponse(fullRes.data);
      const questions: Record<string, string> = {};
      (surveyRes?.data?.questions || []).forEach((q: any) => { questions[q.id] = q.questionText; });
      setDetailQuestions(questions);
    } catch {
      // silently fail
    } finally {
      setLoadingQuestions(false);
    }
  };

  const navigate = useNavigate();
  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout title="Responses" subtitle="View and manage all survey responses with detailed analytics">
      {masterFilterLabel && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-lg bg-primary/10 border border-primary/20">
          <ArrowLeft className="h-4 w-4 text-primary cursor-pointer" onClick={() => navigate(-1)} />
          <p className="text-sm text-primary font-medium">
            Showing responses for master: <span className="font-bold">{masterFilterLabel}</span>
          </p>
          <button
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            onClick={() => { setMasterFilter("all"); setMasterFilterLabel(null); }}
          >
            Clear filter
          </button>
        </div>
      )}
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[
          { label: "Total Responses", value: total.toString(), icon: FileText },
          { label: "Current Page", value: responses.length.toString(), icon: TrendingUp },
          { label: "Pages", value: totalPages.toString(), icon: CheckCircle },
          { label: "Per Page", value: limit.toString(), icon: Star },
        ].map(s => (
          <Card key={s.label} variant="stat" className="p-4">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-primary/10 p-2"><s.icon className="h-5 w-5 text-primary" /></div>
            </div>
            <p className="text-2xl font-bold mt-2">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card variant="elevated">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CardTitle>All Responses</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => handleExport('csv')}><FileSpreadsheet className="h-4 w-4 mr-2" />CSV</Button>
                <Button variant="outline" onClick={() => handleExport('excel')}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
                <Button onClick={() => handleExport('pdf')}><Download className="h-4 w-4 mr-2" />PDF</Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search responses, surveys, respondents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Start Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "End Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
              {(startDate || endDate) && (
                <Button variant="ghost" size="icon" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Input
                placeholder="Latitude"
                value={filterLat}
                onChange={(e) => setFilterLat(e.target.value)}
                className="w-[120px]"
                type="number"
                step="any"
              />
              <Input
                placeholder="Longitude"
                value={filterLng}
                onChange={(e) => setFilterLng(e.target.value)}
                className="w-[120px]"
                type="number"
                step="any"
              />
              <Input
                placeholder="Radius (m)"
                value={filterRadius}
                onChange={(e) => setFilterRadius(e.target.value)}
                className="w-[110px]"
                type="number"
                min="0"
              />
              {(filterLat || filterLng || filterRadius) && (
                <Button variant="ghost" size="icon" onClick={() => { setFilterLat(""); setFilterLng(""); setFilterRadius(""); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Select value={surveyFilter} onValueChange={setSurveyFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select Survey" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Select Survey</SelectItem>
                  {surveys.map((survey) => (
                    <SelectItem key={survey.id} value={survey.id}>{survey.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={masterFilter} onValueChange={setMasterFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Survey Master" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Masters</SelectItem>
                  {surveyMasters.map((master) => (
                    <SelectItem key={master.id} value={master.id}>{master.loginId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value="all" onValueChange={() => {}}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                </SelectContent>
              </Select>
              <Select value={limit.toString()} onValueChange={(val) => { setLimit(Number(val)); setPage(1); }}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : surveyFilter === "all" ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Please select a survey to view responses</p>
            </div>
          ) : responses.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No responses found</p>
            </div>
          ) : (
            <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Response ID</TableHead>
                <TableHead>Respondent</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Answers</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Audio</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response) => (
                <TableRow key={response.id} className="group">
                  <TableCell><code className="text-sm bg-muted px-2 py-1 rounded">{response.id.slice(0, 8)}</code></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary/10 text-primary text-xs">{(response.respondentName || 'AN').slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <p className="text-sm font-medium">{response.respondentName || 'Anonymous'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{response.respondentContact || 'N/A'}</TableCell>
                  <TableCell><Badge variant="secondary">{response.responses.length} answers</Badge></TableCell>
                  <TableCell className="text-sm">
                    {(response.latitude != null && response.longitude != null &&
                      Number(response.latitude) !== 0 && Number(response.longitude) !== 0) ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" />
                        <span className="text-xs">{Number(response.latitude).toFixed(4)}, {Number(response.longitude).toFixed(4)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {response.audioUrl ? (
                      <AudioPlayer src={response.audioUrl} className="h-8 w-40" />
                    ) : (
                      <span className="text-muted-foreground text-sm">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <div className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{new Date(response.createdAt).toLocaleString()}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(response)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">Showing {responses.length} of {total} responses</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          </>
          )}
        </CardContent>
      </Card>

      {/* Response Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedResponse && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-11 w-11"><AvatarFallback className="bg-primary/10 text-primary font-bold">{(selectedResponse.respondentName || 'AN').slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-lg">{selectedResponse.respondentName || 'Anonymous'}</p>
                    <p className="text-sm text-muted-foreground font-normal">{selectedResponse.respondentContact || 'N/A'}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
 
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Contact: {selectedResponse.respondentContact || 'N/A'}</div>
                  <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-muted-foreground" />Submitted: {new Date(selectedResponse.createdAt).toLocaleString()}</div>
                  <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-muted-foreground" />Updated: {new Date(selectedResponse.updatedAt).toLocaleString()}</div>
                  {selectedResponse.latitude && selectedResponse.longitude && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Location: {Number(selectedResponse.latitude).toFixed(6)}, {Number(selectedResponse.longitude).toFixed(6)}
                    </div>
                  )}
                </div>
                <Card className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{selectedResponse.responses.length}</p>
                  <p className="text-xs text-muted-foreground">Total Answers</p>
                </Card>
              </div>

              {(selectedResponse.latitude != null && selectedResponse.longitude != null &&
                Number(selectedResponse.latitude) !== 0 && Number(selectedResponse.longitude) !== 0) && (
                <Card className="p-3 mt-4 flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Location Captured</p>
                    <p className="text-sm font-mono">
                      {Number(selectedResponse.latitude).toFixed(6)}, {Number(selectedResponse.longitude).toFixed(6)}
                    </p>
                  </div>
                </Card>
              )}

              {selectedResponse.audioUrl && (
                <Card className="p-4 mt-4">
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-2">Audio Response</p>
                      <AudioPlayer src={selectedResponse.audioUrl} className="w-full" />
                      <p className="text-xs text-muted-foreground mt-1 truncate">{selectedResponse.audioUrl}</p>
                    </div>
                  </div>
                </Card>
              )}

              <Separator className="my-4" />

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4" />Answers</h4>
                {loadingQuestions && <p className="text-xs text-muted-foreground mb-2">Loading questions...</p>}
                <div className="space-y-3">
                  {selectedResponse.responses.map((a, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-2">
                      <p className="text-xs font-semibold text-primary">
                        Q{i + 1}. {detailQuestions[a.questionId] || a.questionId}
                      </p>
                      <p className="text-sm">{a.answer || <span className="text-muted-foreground italic">No answer</span>}</p>
                      {a.audioUrl && (
                        <div className="pt-1">
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Volume2 className="h-3 w-3" />Audio answer</p>
                          <AudioPlayer src={a.audioUrl} className="w-full h-8" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => handleExport('pdf')}><Download className="h-4 w-4 mr-2" />Download PDF</Button>
                <Button variant="outline" className="flex-1" onClick={() => handleExport('excel')}><FileSpreadsheet className="h-4 w-4 mr-2" />Download Excel</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

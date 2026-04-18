import { useEffect, useState, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchActivityLogs } from "@/store/activityLogsSlice";
import { useAuthStore } from "@/store/authStore";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, ChevronLeft, ChevronRight, Users, AlertTriangle, Search, RotateCcw, CalendarIcon, Filter, X, Download, FileText, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const ACTION_OPTIONS = ["CREATE", "UPDATE", "DELETE", "LOGIN", "READ"];
const MODULE_OPTIONS = ["SURVEY", "SURVEY_MASTER", "DEVICE", "MENU", "PERMISSION", "ACCOUNT", "SURVEY_RESPONSE", "AUTH"];

const ACTION_STYLES: Record<string, string> = {
  CREATE: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  UPDATE: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  DELETE: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  LOGIN:  "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  READ:   "bg-muted text-muted-foreground",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "hsl(142, 71%, 45%)",
  UPDATE: "hsl(217, 91%, 60%)",
  DELETE: "hsl(0, 84%, 60%)",
  LOGIN:  "hsl(262, 83%, 58%)",
  READ:   "hsl(172, 66%, 50%)",
};

export default function ActivityLogs() {
  const dispatch = useDispatch<AppDispatch>();
  const { tokens } = useAuthStore();
  const { logs, total, page, limit, loading } = useSelector((state: RootState) => state.activityLogs);

  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [module, setModule] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [trendOpen, setTrendOpen] = useState(false);
  const [trendStartDate, setTrendStartDate] = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d;
  });
  const searchTimer = useRef<any>(null);

  const hasFilters = search || action || module || dateFrom || dateTo;
  const dateFromStr = dateFrom ? format(dateFrom, "yyyy-MM-dd") : "";
  const dateToStr = dateTo ? format(dateTo, "yyyy-MM-dd") : "";

  const doFetch = (pg: number, overrides?: Partial<{ search: string; action: string; module: string; dateFrom: string; dateTo: string }>) => {
    if (!tokens?.accessToken) return;
    dispatch(fetchActivityLogs({
      token: tokens.accessToken,
      page: pg,
      limit: 10,
      search:   overrides?.search   ?? search,
      action:   overrides?.action   ?? action,
      module:   overrides?.module   ?? module,
      dateFrom: overrides?.dateFrom ?? dateFromStr,
      dateTo:   overrides?.dateTo   ?? dateToStr,
    }));
  };

  useEffect(() => {
    doFetch(1);
  }, [tokens?.accessToken]);

  const handlePageChange = (pg: number) => {
    setCurrentPage(pg);
    doFetch(pg);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setCurrentPage(1); doFetch(1, { search: val }); }, 400);
  };

  const handleSelectChange = (field: "action" | "module", val: string) => {
    if (field === "action") setAction(val);
    else setModule(val);
    setCurrentPage(1);
    doFetch(1, { [field]: val });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    setFromOpen(false);
    setCurrentPage(1);
    doFetch(1, { dateFrom: date ? format(date, "yyyy-MM-dd") : "" });
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    setToOpen(false);
    setCurrentPage(1);
    doFetch(1, { dateTo: date ? format(date, "yyyy-MM-dd") : "" });
  };

  const resetFilters = () => {
    setSearch(""); setAction(""); setModule(""); setDateFrom(undefined); setDateTo(undefined);
    setCurrentPage(1);
    doFetch(1, { search: "", action: "", module: "", dateFrom: "", dateTo: "" });
  };

  const handleExportCSV = () => {
    const rows = logs.map((l: any) => ({
      action: l.action,
      description: l.description,
      user: l.account?.loginId || "System",
      module: l.module,
      ipAddress: l.ipAddress || "-",
      date: format(new Date(l.createdAt), "MMM dd, yyyy"),
      time: format(new Date(l.createdAt), "HH:mm:ss"),
    }));
    exportToCSV(rows, "activity_logs", ["action", "description", "user", "module", "ipAddress", "date", "time"]);
  };

  const handleExportPDF = () => {
    const lines = [
      "ACTIVITY LOGS REPORT",
      `Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`,
      "",
      ...logs.map((l: any) =>
        `[${l.action}] ${l.description} | ${l.account?.loginId || "System"} | ${l.module} | IP: ${l.ipAddress || "-"} | ${format(new Date(l.createdAt), "MMM dd, yyyy HH:mm:ss")}`
      ),
    ].join("\n");
    exportToPDF(lines, "activity_logs");
  };

  const totalPages = Math.ceil(total / limit);

  const stats = useMemo(() => ({
    totalActions: total,
    uniqueUsers: new Set(logs.map((l: any) => l.accountId)).size,
    deleteCount: logs.filter((l: any) => l.action === "DELETE").length,
  }), [logs, total]);

  const actionDistribution = useMemo(() => {
    const counts = logs.reduce((acc: any, l: any) => { acc[l.action] = (acc[l.action] || 0) + 1; return acc; }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value, color: ACTION_COLORS[name] || "hsl(262,83%,58%)" }));
  }, [logs]);

  const activityTrendData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(trendStartDate); d.setDate(d.getDate() + i);
      return { date: format(d, "MMM dd"), fullDate: format(d, "yyyy-MM-dd"), actions: 0 };
    });
    logs.forEach((l: any) => {
      const label = format(new Date(l.createdAt), "yyyy-MM-dd");
      const day = days.find(d => d.fullDate === label);
      if (day) day.actions++;
    });
    return days;
  }, [logs, trendStartDate]);

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  return (
    <AdminLayout title="Activity Logs" subtitle="System activity monitoring and audit trail">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-3"><Activity className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{stats.totalActions}</p><p className="text-sm text-muted-foreground">Total Actions</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-destructive/10 p-3"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-2xl font-bold">{stats.deleteCount}</p><p className="text-sm text-muted-foreground">Delete Actions</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-accent p-3"><Users className="h-5 w-5 text-accent-foreground" /></div>
            <div><p className="text-2xl font-bold">{stats.uniqueUsers}</p><p className="text-sm text-muted-foreground">Active Users</p></div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card className="md:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">
              Activity Trend&nbsp;
              <span className="text-muted-foreground font-normal text-sm">
                ({format(trendStartDate, "MMM dd")} – {format(new Date(new Date(trendStartDate).setDate(trendStartDate.getDate() + 6)), "MMM dd, yyyy")})
              </span>
            </h3>
            <Popover open={trendOpen} onOpenChange={setTrendOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 h-8 px-3 text-xs rounded-md border border-input bg-background hover:bg-muted transition-colors text-foreground">
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{format(trendStartDate, "MMM dd, yyyy")}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={trendStartDate}
                  onSelect={(d) => { if (d) { d.setHours(0,0,0,0); setTrendStartDate(d); } setTrendOpen(false); }}
                  disabled={(d) => d > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activityTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              <Area type="monotone" dataKey="actions" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Action Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={actionDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                {actionDistribution.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {actionDistribution.map((item: any) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card variant="elevated">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Log
              <Badge variant="secondary" className="ml-1">{total} entries</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 ml-auto">
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1.5 text-xs h-8">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={logs.length === 0} className="gap-1.5 text-xs h-8">
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={logs.length === 0} className="gap-1.5 text-xs h-8">
                <FileText className="h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Filter Bar */}
        <div className="px-6 pt-4 pb-3 border-b space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by description..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          {/* Dropdowns + Date Range */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <select
                value={action}
                onChange={(e) => handleSelectChange("action", e.target.value)}
                className="h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              >
                <option value="">All Actions</option>
                {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <select
              value={module}
              onChange={(e) => handleSelectChange("module", e.target.value)}
              className="h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            >
              <option value="">All Modules</option>
              {MODULE_OPTIONS.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
            </select>
            <div className="flex items-center gap-1.5 ml-auto">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {/* Date From */}
              <Popover open={fromOpen} onOpenChange={setFromOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 h-8 px-3 text-sm rounded-md border border-input bg-background hover:bg-muted transition-colors text-foreground min-w-[120px]">
                    <span className={dateFrom ? "text-foreground" : "text-muted-foreground"}>
                      {dateFrom ? format(dateFrom, "MMM dd, yyyy") : "From date"}
                    </span>
                    {dateFrom && (
                      <X className="h-3 w-3 ml-auto text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); handleDateFromChange(undefined); }} />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={handleDateFromChange}
                    disabled={(d) => dateTo ? d > dateTo : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-sm text-muted-foreground">–</span>
              {/* Date To */}
              <Popover open={toOpen} onOpenChange={setToOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 h-8 px-3 text-sm rounded-md border border-input bg-background hover:bg-muted transition-colors text-foreground min-w-[120px]">
                    <span className={dateTo ? "text-foreground" : "text-muted-foreground"}>
                      {dateTo ? format(dateTo, "MMM dd, yyyy") : "To date"}
                    </span>
                    {dateTo && (
                      <X className="h-3 w-3 ml-auto text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); handleDateToChange(undefined); }} />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={handleDateToChange}
                    disabled={(d) => dateFrom ? d < dateFrom : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {/* Active filter chips */}
          {hasFilters && (
            <div className="flex flex-wrap gap-1.5">
              {search && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">Search: "{search}"</span>}
              {action && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">Action: {action}</span>}
              {module && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">Module: {module}</span>}
              {dateFrom && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">From: {format(dateFrom, "MMM dd, yyyy")}</span>}
              {dateTo && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">To: {format(dateTo, "MMM dd, yyyy")}</span>}
            </div>
          )}
        </div>

        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground">No activity found</p>
              {hasFilters && <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your filters</p>}
            </div>
          ) : (
            <>
              <div className="rounded-xl border overflow-hidden mt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: any) => (
                      <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[log.action] || "bg-muted text-muted-foreground"}`}>
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm max-w-xs truncate">{log.description}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground">{log.account?.loginId || "System"}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{log.module}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-mono text-muted-foreground">{(log as any).ipAddress || "-"}</p>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(log.createdAt), "MMM dd, yyyy")}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(log.createdAt), "HH:mm:ss")}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t flex-wrap gap-3">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * limit) + 1}–{Math.min(currentPage * limit, total)} of {total} entries
                </p>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {pageNumbers.map(n => (
                    <Button
                      key={n}
                      variant={currentPage === n ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0 text-xs"
                      onClick={() => handlePageChange(n)}
                    >
                      {n}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => handlePageChange(currentPage + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

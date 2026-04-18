import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, User, Settings, LogOut, HelpCircle, Mail, Calendar, Clock, ChevronRight, Check, X, AlertTriangle, Info, Shield, Activity, Wifi, WifiOff, Menu, Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthStore } from "@/store/authStore";
import { staffDetailService } from "@/services/staffDetailService";
import { authService } from "@/services/authService";
import { activityLogsService } from "@/services/activityLogsService";
import { globalSearchService, GlobalSearchResult } from "@/services/globalSearchService";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

const notifications = [
  {
    id: 1,
    type: "new",
    title: "New survey response",
    message: "Customer Satisfaction Survey received 15 new responses",
    time: "2 minutes ago",
    read: false,
    link: "/responses"
  },
  {
    id: 2,
    type: "alert",
    title: "Device offline",
    message: "Device #D-2451 has been offline for 2 hours",
    time: "1 hour ago",
    read: false,
    link: "/devices"
  },
  {
    id: 3,
    type: "success",
    title: "Survey completed",
    message: "Employee Engagement Survey reached 100% completion",
    time: "3 hours ago",
    read: false,
    link: "/surveys"
  },
  {
    id: 4,
    type: "warning",
    title: "Geo-fence breach",
    message: "User John Doe exited assigned zone in Downtown Area",
    time: "5 hours ago",
    read: true,
    link: "/geofencing"
  },
  {
    id: 5,
    type: "info",
    title: "System update",
    message: "New features available in Survey Builder",
    time: "1 day ago",
    read: true,
    link: "/surveys/builder"
  },
];


export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { account, tokens, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<GlobalSearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notificationList, setNotificationList] = useState(notifications);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { isConnected, reconnect } = useWebSocket();
  const [profileData, setProfileData] = useState({
    name: "Admin User",
    email: "admin@survey.com",
    phone: "+1 234 567 890",
    role: "Super Admin",
    department: "Administration",
    joinDate: "Jan 2024",
    employeeId: "",
    gender: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState<{ oldPassword?: string; newPassword?: string; confirmPassword?: string }>({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityAction, setActivityAction] = useState("");
  const [activityModule, setActivityModule] = useState("");
  const [activityDateFrom, setActivityDateFrom] = useState("");
  const [activityDateTo, setActivityDateTo] = useState("");

  useEffect(() => {
    if (!tokens?.accessToken || !account?.id) return;
    setProfileLoading(true);
    staffDetailService
      .getProfile(tokens.accessToken, account.id)
      .then((data) => {
        const firstName = data.firstName || "";
        const lastName = data.lastName || "";
        const accountData = data.account || {};
        setProfileData({
          name: firstName && lastName ? `${firstName} ${lastName}` : accountData.loginId || "Admin User",
          email: data.email || accountData.loginId || "",
          phone: data.phone || "",
          role: accountData.roles || "ROOT",
          department: data.designation?.name || "Administration",
          joinDate: data.joiningDate
            ? new Date(data.joiningDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
            : accountData.createdAt
            ? new Date(accountData.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
            : "",
          employeeId: data.employeeId || "",
          gender: data.gender || "",
        });
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [tokens?.accessToken, account?.id]);

  const fetchActivityLogs = (page: number, overrides?: { search?: string; action?: string; module?: string; dateFrom?: string; dateTo?: string }) => {
    if (!tokens?.accessToken || !account?.id) return;
    setActivityLoading(true);
    activityLogsService
      .getByUser(tokens.accessToken, account.id, {
        page,
        limit: 10,
        search: overrides?.search ?? activitySearch,
        action: overrides?.action ?? activityAction,
        module: overrides?.module ?? activityModule,
        dateFrom: overrides?.dateFrom ?? activityDateFrom,
        dateTo: overrides?.dateTo ?? activityDateTo,
      })
      .then((data) => {
        setActivityLogs(data.data);
        setActivityTotal(data.total);
        setActivityPage(data.page);
      })
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  };

  const resetActivityFilters = () => {
    setActivitySearch("");
    setActivityAction("");
    setActivityModule("");
    setActivityDateFrom("");
    setActivityDateTo("");
    fetchActivityLogs(1, { search: "", action: "", module: "", dateFrom: "", dateTo: "" });
  };

  const hasActiveFilters = activitySearch || activityAction || activityModule || activityDateFrom || activityDateTo;

  const unreadCount = notificationList.filter(n => !n.read).length;

  useEffect(() => {
    if (!searchQuery.trim() || !tokens?.accessToken) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await globalSearchService.search(tokens.accessToken, searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults(null);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, tokens?.accessToken]);

  const hasSearchResults = searchResults && (
    searchResults.devices.length > 0 ||
    searchResults.surveys.length > 0 ||
    searchResults.surveyMasters.length > 0
  );

  const markAsRead = (id: number) => {
    setNotificationList(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotificationList(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const deleteNotification = (id: number) => {
    setNotificationList(prev => prev.filter(n => n.id !== id));
    toast.success("Notification removed");
  };

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);
    navigate(notification.link);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new": return <Mail className="h-4 w-4 text-primary" />;
      case "alert": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "success": return <Check className="h-4 w-4 text-success" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "info": return <Info className="h-4 w-4 text-accent" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const handleProfileUpdate = () => {
    toast.success("Profile updated successfully!");
    setIsProfileOpen(false);
  };

  const handleResetPassword = async () => {
    const errors: typeof passwordErrors = {};
    if (!passwordForm.oldPassword) errors.oldPassword = "Current password is required";
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) errors.newPassword = "New password must be at least 8 characters";
    if (passwordForm.newPassword !== passwordForm.confirmPassword) errors.confirmPassword = "Passwords do not match";
    if (Object.keys(errors).length) { setPasswordErrors(errors); return; }

    if (!tokens?.accessToken || !account?.id) return;
    setPasswordLoading(true);
    try {
      await authService.resetPassword(
        tokens.accessToken,
        account.id,
        passwordForm.oldPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword,
      );
      toast.success("Password updated successfully!");
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordErrors({});
      setIsPasswordFormOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-3 sm:px-4 md:px-6">
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        {/* Mobile Menu Button */}
        <Button 
          variant="ghost" 
          size="icon"
          className="md:hidden"
          onClick={() => {
            const sidebar = document.querySelector('aside');
            sidebar?.classList.toggle('max-md:-translate-x-full');
          }}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-semibold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* WebSocket Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={reconnect}
              className={isConnected ? "text-success" : "text-destructive"}
            >
              {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isConnected ? "Real-time sync connected" : "Click to reconnect"}
          </TooltipContent>
        </Tooltip>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Global Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            className="w-48 xl:w-80 pl-9"
          />
          
          {/* Search Results Dropdown */}
          {showSearch && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              {searchLoading ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">Searching...</div>
              ) : !hasSearchResults ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">No results found</div>
              ) : (
                <>
                  {searchResults!.surveys.length > 0 && (
                    <div>
                      <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">Surveys</p>
                      {searchResults!.surveys.map((s) => (
                        <button key={s.id} onClick={() => { navigate("/surveys"); setSearchQuery(""); setShowSearch(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-left transition-colors">
                          <Badge variant="secondary" className="text-xs">Survey</Badge>
                          <span className="text-sm truncate">{s.title}</span>
                          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults!.devices.length > 0 && (
                    <div>
                      <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">Devices</p>
                      {searchResults!.devices.map((d) => (
                        <button key={d.id} onClick={() => { navigate("/devices"); setSearchQuery(""); setShowSearch(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-left transition-colors">
                          <Badge variant="secondary" className="text-xs">Device</Badge>
                          <span className="text-sm truncate">{d.deviceName}</span>
                          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults!.surveyMasters.length > 0 && (
                    <div>
                      <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">Survey Masters</p>
                      {searchResults!.surveyMasters.map((m) => (
                        <button key={m.id} onClick={() => { navigate("/users"); setSearchQuery(""); setShowSearch(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-left transition-colors">
                          <Badge variant="secondary" className="text-xs">Master</Badge>
                          <span className="text-sm truncate">{m.name || m.id}</span>
                          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-1 sm:px-2">
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                <AvatarImage src="" />
                <AvatarFallback className="gradient-primary text-primary-foreground text-xs sm:text-sm font-bold">
                  {profileData.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium">{profileData.name}</p>
                <p className="text-xs text-muted-foreground">{profileData.role}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex items-center gap-3 py-2">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="gradient-primary text-primary-foreground font-bold">
                    {profileData.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{profileData.name}</p>
                  <p className="text-xs text-muted-foreground">{profileData.email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/logs')}>
              <Activity className="mr-2 h-4 w-4" />
              Activity Log
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/help')}>
              <HelpCircle className="mr-2 h-4 w-4" />
              Help & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-lg md:max-w-xl max-h-[95vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
            <DialogTitle className="text-base sm:text-lg">Admin Profile</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              View and manage your profile information
            </DialogDescription>
          </DialogHeader>

          {profileLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <Tabs defaultValue="profile" className="flex flex-col flex-1 min-h-0" onValueChange={(v) => { if (v === 'activity' && activityLogs.length === 0) fetchActivityLogs(1); }}>
              <TabsList className="grid w-full grid-cols-3 shrink-0 rounded-none border-b px-4 sm:px-6 h-10">
                <TabsTrigger value="profile" className="text-xs sm:text-sm">Profile</TabsTrigger>
                <TabsTrigger value="security" className="text-xs sm:text-sm">Security</TabsTrigger>
                <TabsTrigger value="activity" className="text-xs sm:text-sm">Activity</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="flex-1 overflow-y-auto mt-0">
                <div className="space-y-4 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                    <Avatar className="h-14 w-14 sm:h-20 sm:w-20 shrink-0">
                      <AvatarFallback className="gradient-primary text-primary-foreground text-lg sm:text-2xl font-bold">
                        {profileData.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center sm:text-left">
                      <h3 className="text-base sm:text-lg font-semibold">{profileData.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{profileData.role}</p>
                      <Badge className="mt-2 gradient-success text-xs">Active</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">Full Name</Label>
                      <Input className="text-xs sm:text-sm h-8 sm:h-9" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">Email</Label>
                      <Input className="text-xs sm:text-sm h-8 sm:h-9" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">Phone</Label>
                      <Input className="text-xs sm:text-sm h-8 sm:h-9" value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">Department</Label>
                      <Input className="text-xs sm:text-sm h-8 sm:h-9" value={profileData.department} onChange={(e) => setProfileData({ ...profileData, department: e.target.value })} />
                    </div>
                    {profileData.employeeId && (
                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm">Employee ID</Label>
                        <Input className="text-xs sm:text-sm h-8 sm:h-9" value={profileData.employeeId} readOnly />
                      </div>
                    )}
                    {profileData.gender && (
                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm">Gender</Label>
                        <Input className="text-xs sm:text-sm h-8 sm:h-9" value={profileData.gender} readOnly />
                      </div>
                    )}
                  </div>

                  {profileData.joinDate && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs sm:text-sm text-muted-foreground">Member since {profileData.joinDate}</span>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="flex-1 overflow-y-auto mt-0">
                <div className="space-y-3 p-4 sm:p-6">
                  <div className="p-3 sm:p-4 border rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-xs sm:text-sm">Two-Factor Authentication</p>
                          <p className="text-xs text-muted-foreground hidden sm:block">Add an extra layer of security</p>
                        </div>
                      </div>
                      <Badge className="gradient-success text-xs shrink-0">Enabled</Badge>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-sm">Change Password</p>
                        <p className="text-xs text-muted-foreground">Update your account password</p>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={() => { setIsPasswordFormOpen(!isPasswordFormOpen); setPasswordErrors({}); setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" }); }}>
                        {isPasswordFormOpen ? "Cancel" : "Update"}
                      </Button>
                    </div>
                    {isPasswordFormOpen && (
                      <div className="space-y-3 pt-2 border-t">
                        <div className="space-y-1">
                          <Label className="text-xs sm:text-sm">Current Password</Label>
                          <Input type="password" placeholder="Enter current password" className="text-xs sm:text-sm h-8 sm:h-9" value={passwordForm.oldPassword} onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} />
                          {passwordErrors.oldPassword && <p className="text-xs text-destructive">{passwordErrors.oldPassword}</p>}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs sm:text-sm">New Password</Label>
                          <Input type="password" placeholder="Enter new password" className="text-xs sm:text-sm h-8 sm:h-9" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
                          {passwordErrors.newPassword && <p className="text-xs text-destructive">{passwordErrors.newPassword}</p>}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs sm:text-sm">Confirm New Password</Label>
                          <Input type="password" placeholder="Confirm new password" className="text-xs sm:text-sm h-8 sm:h-9" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
                          {passwordErrors.confirmPassword && <p className="text-xs text-destructive">{passwordErrors.confirmPassword}</p>}
                        </div>
                        <Button onClick={handleResetPassword} disabled={passwordLoading} className="w-full gradient-primary text-xs sm:text-sm h-8 sm:h-9">
                          {passwordLoading ? "Updating..." : "Update Password"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="p-3 sm:p-4 border rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-xs sm:text-sm">Active Sessions</p>
                        <p className="text-xs text-muted-foreground">2 devices currently logged in</p>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs shrink-0">Manage</Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="mt-0">
                {/* Filter Bar */}
                <div className="px-4 sm:px-6 py-3 border-b bg-muted/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search activity..."
                        value={activitySearch}
                        onChange={(e) => {
                          setActivitySearch(e.target.value);
                          clearTimeout((window as any)._activitySearchTimer);
                          (window as any)._activitySearchTimer = setTimeout(() => fetchActivityLogs(1, { search: e.target.value }), 400);
                        }}
                        className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    {hasActiveFilters && (
                      <button onClick={resetActivityFilters} className="flex items-center gap-1 h-8 px-2.5 text-xs rounded-md border border-input bg-background hover:bg-muted text-muted-foreground transition-colors shrink-0">
                        <RotateCcw className="h-3 w-3" /> Reset
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={activityAction}
                      onChange={(e) => { setActivityAction(e.target.value); fetchActivityLogs(1, { action: e.target.value }); }}
                      className="h-7 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    >
                      <option value="">All Actions</option>
                      <option value="CREATE">Create</option>
                      <option value="UPDATE">Update</option>
                      <option value="DELETE">Delete</option>
                      <option value="LOGIN">Login</option>
                      <option value="READ">Read</option>
                    </select>
                    <select
                      value={activityModule}
                      onChange={(e) => { setActivityModule(e.target.value); fetchActivityLogs(1, { module: e.target.value }); }}
                      className="h-7 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    >
                      <option value="">All Modules</option>
                      <option value="SURVEY">Survey</option>
                      <option value="SURVEY_MASTER">Survey Master</option>
                      <option value="DEVICE">Device</option>
                      <option value="MENU">Menu</option>
                      <option value="PERMISSION">Permission</option>
                      <option value="ACCOUNT">Account</option>
                      <option value="SURVEY_RESPONSE">Survey Response</option>
                      <option value="AUTH">Auth</option>
                    </select>
                    <div className="flex items-center gap-1 ml-auto">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <input
                        type="date"
                        value={activityDateFrom}
                        onChange={(e) => { setActivityDateFrom(e.target.value); fetchActivityLogs(1, { dateFrom: e.target.value }); }}
                        className="h-7 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input
                        type="date"
                        value={activityDateTo}
                        onChange={(e) => { setActivityDateTo(e.target.value); fetchActivityLogs(1, { dateTo: e.target.value }); }}
                        className="h-7 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                      />
                    </div>
                  </div>
                </div>
                <div className="h-[38vh] sm:h-[42vh] overflow-y-auto bg-gradient-to-b from-muted/20 to-background">
                  <div className="space-y-3 p-4 sm:p-6">
                    {activityLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      </div>
                    ) : activityLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Activity className="h-12 w-12 text-muted-foreground/50 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">No activity found</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Your recent actions will appear here</p>
                      </div>
                    ) : (
                      activityLogs.map((log, index) => (
                        <div key={log.id} className="group relative flex items-start gap-3 p-3 sm:p-4 bg-card border border-border/50 rounded-xl hover:border-primary/30 hover:shadow-md transition-all duration-200">
                          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-primary/50 to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${
                              log.action === 'CREATE' ? 'bg-green-100 dark:bg-green-900/30' :
                              log.action === 'UPDATE' ? 'bg-blue-100 dark:bg-blue-900/30' :
                              log.action === 'DELETE' ? 'bg-red-100 dark:bg-red-900/30' :
                              log.action === 'LOGIN'  ? 'bg-purple-100 dark:bg-purple-900/30' :
                              'bg-muted'
                            }`}>
                              {log.action === 'CREATE' && <span className="text-green-700 dark:text-green-400 text-xs font-bold">+</span>}
                              {log.action === 'UPDATE' && <span className="text-blue-700 dark:text-blue-400 text-xs font-bold">↻</span>}
                              {log.action === 'DELETE' && <span className="text-red-700 dark:text-red-400 text-xs font-bold">×</span>}
                              {log.action === 'LOGIN' && <span className="text-purple-700 dark:text-purple-400 text-xs font-bold">→</span>}
                              {!['CREATE', 'UPDATE', 'DELETE', 'LOGIN'].includes(log.action) && <span className="text-muted-foreground text-xs font-bold">•</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{log.description}</p>
                                <span className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                                  log.action === 'CREATE' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                  log.action === 'UPDATE' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                  log.action === 'DELETE' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                  log.action === 'LOGIN'  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                                  'bg-muted text-muted-foreground'
                                }`}>{log.action}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                                  {log.module}
                                </span>
                                <span>•</span>
                                <Clock className="h-3 w-3" />
                                <span>{new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {!activityLoading && activityTotal > 10 && (
                  <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t bg-muted/30">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs font-medium text-foreground">{activityTotal} total activities</span>
                      <span className="text-xs text-muted-foreground">• Page {activityPage} of {Math.ceil(activityTotal / 10)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs h-8 px-3 hover:bg-primary hover:text-primary-foreground transition-colors" disabled={activityPage <= 1} onClick={() => fetchActivityLogs(activityPage - 1)}>← Prev</Button>
                      <Button variant="outline" size="sm" className="text-xs h-8 px-3 hover:bg-primary hover:text-primary-foreground transition-colors" disabled={activityPage * 10 >= activityTotal} onClick={() => fetchActivityLogs(activityPage + 1)}>Next →</Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t shrink-0 flex-row gap-2">
            <Button variant="outline" className="text-xs sm:text-sm h-8 sm:h-9 flex-1 sm:flex-none" onClick={() => setIsProfileOpen(false)}>Cancel</Button>
            <Button onClick={handleProfileUpdate} className="gradient-primary text-xs sm:text-sm h-8 sm:h-9 flex-1 sm:flex-none">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
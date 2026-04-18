import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchStaffDetails, updateStaffDetail } from "@/store/staffDetailSlice";
import { fetchAccounts, changeStatus, updateAccount, resetPassword } from "@/store/accountSlice";
import { fetchSettings } from "@/store/settingsSlice";
import { fetchAccountLevels } from "@/store/accountLevelSlice";
import { fetchDesignations } from "@/store/designationSlice";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  Shield,
  Users,
  Settings,
  Edit,
  Trash2,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  Download,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useAuthStore } from "@/store/authStore";
import { staffService } from "@/services/staffService";
import { staffDetailService } from "@/services/staffDetailService";
import { exportToCSV, exportReportToPDF } from "@/lib/exportUtils";

interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  initials: string;
  modules: string[];
  lastLogin: string;
  status: "active" | "inactive";
  joinDate: string;
  actionsCount: number;
  department: string;
}

export default function Staff() {
  const dispatch = useDispatch<AppDispatch>();
  const { tokens } = useAuthStore();
  const { accounts, total, loading } = useSelector((state: RootState) => state.account);
  const { staffDetails } = useSelector((state: RootState) => state.staffDetail);
  const { data: settings = [] } = useSelector((state: RootState) => state.settings);
  const { levels } = useSelector((state: RootState) => state.accountLevel);
  const { designations } = useSelector((state: RootState) => state.designation);
  
  const [viewStaffOpen, setViewStaffOpen] = useState(false);
  const [viewStaffData, setViewStaffData] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [editStaffOpen, setEditStaffOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: string; name: string } | null>(null);
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [staffForm, setStaffForm] = useState({
    loginId: "",
    password: "",
    roleIds: "STAFF",
    settingId: "",
    accountLevelId: ""
  });
  const [editForm, setEditForm] = useState({
    loginId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    designationId: ""
  });
  
  useEffect(() => {
    if (!tokens?.accessToken) return;
    
    const params = { token: tokens.accessToken, page, limit, search: searchQuery };
    dispatch(fetchAccounts(params));
    dispatch(fetchStaffDetails({ ...params, settingId: tokens.settingId }));
    dispatch(fetchSettings(tokens.accessToken));
    dispatch(fetchAccountLevels(tokens.accessToken));
    dispatch(fetchDesignations(tokens.accessToken));
  }, [tokens?.accessToken, page, searchQuery]);
  
  const staffData = accounts.map((account: any) => {
    const staffDetail = staffDetails.find((s: any) => s.accountId === account.id);
    return {
      id: account.id,
      staffDetailId: staffDetail?.id,
      name: staffDetail ? `${staffDetail.firstName} ${staffDetail.lastName}` : account.loginId,
      email: staffDetail?.email || account.loginId,
      phone: staffDetail?.phone || "N/A",
      role: account.roles || "N/A",
      initials: staffDetail ? `${staffDetail.firstName?.[0] || ''}${staffDetail.lastName?.[0] || ''}`.toUpperCase() || account.loginId.substring(0, 2).toUpperCase() : account.loginId.substring(0, 2).toUpperCase(),
      status: account.status?.toLowerCase() === "active" ? "active" : "inactive" as "active" | "inactive",
      joinDate: new Date(account.createdAt).toLocaleDateString(),
      designation: staffDetail?.designation?.name || "N/A",
      designationId: staffDetail?.designationId,
    };
  });

  const filteredStaff = staffData.filter((member) => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    total: staffData.length,
    active: staffData.filter(s => s.status === "active").length,
    inactive: staffData.filter(s => s.status === "inactive").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "gradient-success";
      case "inactive": return "bg-muted text-muted-foreground";
      default: return "";
    }
  };

  const handleViewStaff = async (accountId: string) => {
    if (!tokens?.accessToken) return;
    setViewLoading(true);
    setViewStaffOpen(true);
    try {
      const data = await staffDetailService.getProfile(tokens.accessToken, accountId);
      setViewStaffData(data);
    } catch {
      toast.error("Failed to load staff profile");
      setViewStaffOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const handleEditStaff = (member: any) => {
    const staffDetail = staffDetails.find((s: any) => s.accountId === member.id);
    const account = accounts.find((a: any) => a.id === member.id);
    if (staffDetail && account) {
      setSelectedStaff({ ...staffDetail, accountId: account.id });
      setEditForm({
        loginId: account.loginId,
        firstName: staffDetail.firstName,
        lastName: staffDetail.lastName,
        email: account.loginId,
        phone: staffDetail.phone,
        designationId: staffDetail.designationId
      });
      setEditStaffOpen(true);
    } else {
      toast.error("Staff details not found. Please try again.");
      console.log("Staff details:", staffDetails);
      console.log("Looking for accountId:", member.id);
    }
  };

  const handleUpdateStaff = async () => {
    if (!tokens?.accessToken || !selectedStaff) return;

    try {
      await dispatch(updateAccount({ token: tokens.accessToken, id: selectedStaff.accountId, data: { loginId: editForm.loginId } })).unwrap();
      await dispatch(updateStaffDetail({ token: tokens.accessToken, id: selectedStaff.id, data: {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.loginId,
        phone: editForm.phone,
        designationId: editForm.designationId
      } })).unwrap();
      toast.success("Staff updated successfully!");
      setEditStaffOpen(false);
      dispatch(fetchAccounts({ token: tokens.accessToken, page, limit, search: searchQuery }));
      dispatch(fetchStaffDetails({ token: tokens.accessToken, page, limit, search: searchQuery }));
    } catch (error: any) {
      toast.error(error.message || "Failed to update staff");
    }
  };

  const handleResetPassword = async () => {
    if (!tokens?.accessToken || !resetPasswordTarget) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!passwordForm.newPassword) {
      toast.error("New password is required");
      return;
    }
    try {
      await dispatch(resetPassword({ token: tokens.accessToken, id: resetPasswordTarget.id, data: passwordForm })).unwrap();
      toast.success("Password reset successfully!");
      setResetPasswordOpen(false);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    }
  };

  const handleStatusChange = async (accountId: string, currentStatus: string) => {
    if (!tokens?.accessToken) return;

    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await dispatch(changeStatus({ token: tokens.accessToken, id: accountId, status: newStatus })).unwrap();
      toast.success(`Status changed to ${newStatus}`);
      dispatch(fetchAccounts({ token: tokens.accessToken, page, limit, search: searchQuery }));
    } catch (error) {
      toast.error("Failed to change status");
    }
  };

  const handleAddStaff = async () => {
    if (!tokens?.accessToken) return;
    
    if (!staffForm.loginId || !staffForm.password) {
      toast.error("All required fields must be filled");
      return;
    }

    try {
      await staffService.register(tokens.accessToken, staffForm);
      toast.success("Staff registered successfully!");
      setAddStaffOpen(false);
      setStaffForm({
        loginId: "",
        password: "",
        roleIds: "STAFF",
        settingId: "",
        accountLevelId: ""
      });
      dispatch(fetchAccounts({ token: tokens.accessToken, page, limit, search: searchQuery }));
      dispatch(fetchStaffDetails({ token: tokens.accessToken, page, limit, search: searchQuery }));
    } catch (error: any) {
      toast.error(error.message || "Failed to register staff");
    }
  };

  return (
    <AdminLayout title="Staff Management" subtitle="Manage admin users, roles, and access rights">
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card variant="stat" className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-3">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Staff</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-success/10 p-3">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-warning/10 p-3">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inactive}</p>
              <p className="text-sm text-muted-foreground">Inactive</p>
            </div>
          </div>
        </Card>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Staff Members</CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={() => setAddStaffOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={staffData.length === 0}
                onClick={() => exportToCSV(
                  filteredStaff.map(s => ({ name: s.name, email: s.email, phone: s.phone, role: s.role, status: s.status, joinDate: s.joinDate, designation: s.designation })),
                  'staff', ['name','email','phone','role','status','joinDate','designation'], 'Staff'
                )}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={staffData.length === 0}
                onClick={() => exportReportToPDF('Staff Report', [{
                  heading: 'Staff Members',
                  rows: [
                    ['Name', 'Email', 'Role', 'Status', 'Join Date'],
                    ...filteredStaff.map(s => [s.name, s.email, s.role, s.status, s.joinDate])
                  ]
                }], 'staff', 'Staff')}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member, index) => (
                    <TableRow key={member.id} className="group">
                      <TableCell className="text-muted-foreground text-sm">{((page - 1) * limit) + index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="gradient-primary text-primary-foreground text-sm">
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{member.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(member.status)}>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{member.joinDate}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewStaff(member.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {member.staffDetailId && (
                                <DropdownMenuItem onClick={() => handleEditStaff(member)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleStatusChange(member.id, member.status)}>
                                {member.status === 'active' ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setResetPasswordTarget({ id: member.id, name: member.name }); setResetPasswordOpen(true); }}>
                                <Lock className="h-4 w-4 mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredStaff.length} of {total} staff members
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={filteredStaff.length < limit} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* View Staff Profile Dialog */}
      <Dialog open={viewStaffOpen} onOpenChange={(o) => { if (!o) { setViewStaffOpen(false); setViewStaffData(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Staff Profile</DialogTitle>
            <DialogDescription>Full details of the staff member</DialogDescription>
          </DialogHeader>
          {viewLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : viewStaffData && (
            <div className="space-y-6 py-2">
              {/* Header */}
              <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="gradient-primary text-primary-foreground text-xl font-bold">
                    {`${viewStaffData.firstName?.[0] || ''}${viewStaffData.lastName?.[0] || ''}`.toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{viewStaffData.firstName} {viewStaffData.middleName} {viewStaffData.lastName}</p>
                  <p className="text-sm text-muted-foreground">{viewStaffData.designation?.name || 'N/A'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={viewStaffData.account?.status === 'ACTIVE' ? 'gradient-success' : ''} variant={viewStaffData.account?.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {viewStaffData.account?.status || 'N/A'}
                    </Badge>
                    <Badge variant="outline">{viewStaffData.account?.roles || 'N/A'}</Badge>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact Information</p>
                <div className="grid grid-cols-2 gap-3">
                  {[['Login ID', viewStaffData.account?.loginId], ['Email', viewStaffData.email], ['Phone', viewStaffData.phone], ['Alt. Phone', viewStaffData.alternatePhone], ['Gender', viewStaffData.gender], ['Date of Birth', viewStaffData.dateOfBirth ? new Date(viewStaffData.dateOfBirth).toLocaleDateString() : null]].map(([label, value]) => value ? (
                    <div key={label as string} className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium">{value}</p>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Address */}
              {(viewStaffData.address || viewStaffData.city || viewStaffData.state) && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Address</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[['Address', viewStaffData.address], ['City', viewStaffData.city], ['State', viewStaffData.state], ['Zip Code', viewStaffData.zipCode], ['Country', viewStaffData.country]].map(([label, value]) => value ? (
                      <div key={label as string} className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium">{value}</p>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* Employment */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Employment</p>
                <div className="grid grid-cols-2 gap-3">
                  {[['Employee ID', viewStaffData.employeeId], ['Designation', viewStaffData.designation?.name], ['Joining Date', viewStaffData.joiningDate ? new Date(viewStaffData.joiningDate).toLocaleDateString() : null], ['Highest Education', viewStaffData.highestEducation], ['Institute', viewStaffData.educationInstitute]].map(([label, value]) => value ? (
                    <div key={label as string} className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium">{value}</p>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Emergency Contact */}
              {viewStaffData.emergencyContactName && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Emergency Contact</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[['Name', viewStaffData.emergencyContactName], ['Phone', viewStaffData.emergencyContactPhone], ['Relation', viewStaffData.emergencyContactRelation]].map(([label, value]) => value ? (
                      <div key={label as string} className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium">{value}</p>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setViewStaffOpen(false); setViewStaffData(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetPasswordOpen} onOpenChange={(o) => { if (!o) { setResetPasswordOpen(false); setPasswordForm({ newPassword: "", confirmPassword: "" }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Reset password for {resetPasswordTarget?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>New Password *</Label>
              <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password *</Label>
              <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Staff</DialogTitle>
            <DialogDescription>Register a new staff member</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Login ID *</Label>
              <Input value={staffForm.loginId} onChange={(e) => setStaffForm({ ...staffForm, loginId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Account Level *</Label>
              <Select value={staffForm.accountLevelId} onValueChange={(val) => setStaffForm({ ...staffForm, accountLevelId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Setting *</Label>
              <Select value={staffForm.settingId} onValueChange={(val) => setStaffForm({ ...staffForm, settingId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select setting" />
                </SelectTrigger>
                <SelectContent>
                  {settings.map((setting: any) => (
                    <SelectItem key={setting.id} value={setting.id}>{setting.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStaffOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStaff}>Add Staff</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editStaffOpen} onOpenChange={setEditStaffOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Staff Details</DialogTitle>
            <DialogDescription>Update staff member information</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label>Login ID *</Label>
              <Input value={editForm.loginId} onChange={(e) => setEditForm({ ...editForm, loginId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Designation *</Label>
              <Select value={editForm.designationId} onValueChange={(val) => setEditForm({ ...editForm, designationId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {designations.map((designation) => (
                    <SelectItem key={designation.id} value={designation.id}>{designation.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStaffOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStaff}>Update Staff</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

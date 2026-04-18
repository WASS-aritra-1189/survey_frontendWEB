import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, MapPin, Power, Eye, Search, RotateCcw, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { BaseUrl } from "@/config/BaseUrl";
import { zoneService } from "@/services/zoneService";
import axios from "axios";
import { exportToCSV, exportReportToPDF } from "@/lib/exportUtils";

interface Zone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusInMeters: number;
  isActive: boolean;
  assignmentCount: number;
  deviceCount?: number;
  devices?: any[];
}

export default function ZoneManagement() {
  const { tokens } = useAuthStore();
  const [zones, setZones] = useState<Zone[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const searchTimer = useRef<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [form, setForm] = useState({ name: "", latitude: 0, longitude: 0, radiusInMeters: 100 });
  const [viewZoneOpen, setViewZoneOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ id: string; isActive: boolean } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async (pg = currentPage, s = search, st = statusFilter) => {
    if (!tokens?.accessToken) return;
    try {
      const res = await zoneService.getAll(tokens.accessToken, { search: s, status: st, page: pg, limit: 10 });
      setZones(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total || 0);
      setCurrentPage(res.page || 1);
    } catch (error) {
      toast.error("Failed to load zones");
      setZones([]);
    }
  };

  const handleSubmit = async () => {
    if (!tokens?.accessToken) return;
    try {
      if (editingZone) {
        await axios.patch(`${BaseUrl}/zones/${editingZone.id}`, form, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
        toast.success("Zone updated");
      } else {
        await axios.post(`${BaseUrl}/zones`, form, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
        toast.success("Zone created");
      }
      setIsDialogOpen(false);
      setEditingZone(null);
      setForm({ name: "", latitude: 0, longitude: 0, radiusInMeters: 100 });
      fetchZones();
    } catch (error) {
      toast.error("Failed to save zone");
    }
  };

  const handleDelete = async (id: string) => {
    if (!tokens?.accessToken) return;
    try {
      await axios.delete(`${BaseUrl}/zones/${id}`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      toast.success("Zone deleted");
      fetchZones();
    } catch (error) {
      toast.error("Failed to delete zone");
    }
  };

  const handleStatusToggle = async (id: string, isActive: boolean) => {
    if (!tokens?.accessToken) return;
    setStatusLoading(true);
    try {
      await axios.patch(`${BaseUrl}/zones/${id}/status`, { isActive }, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      toast.success(`Zone ${isActive ? "activated" : "deactivated"} successfully`);
      fetchZones();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setStatusLoading(false);
      setStatusConfirm(null);
    }
  };

  const handleViewZone = async (id: string) => {
    if (!tokens?.accessToken) return;
    try {
      const zoneData = await zoneService.getById(tokens.accessToken, id);
      setSelectedZone(zoneData);
      setViewZoneOpen(true);
    } catch (error) {
      toast.error("Failed to load zone details");
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchZones(1, val, statusFilter), 400);
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    fetchZones(1, search, val);
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    fetchZones(1, "", "");
  };

  const totalPages = Math.ceil(total / 10);
  const hasFilters = search || statusFilter;

  return (
    <AdminLayout title="Zone Management" subtitle="Manage location zones">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <CardTitle>
                Zones{" "}
                <span className="text-sm font-normal text-muted-foreground ml-1">({total} total)</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" disabled={zones.length === 0}
                  onClick={() => exportToCSV(
                    zones.map(z => ({ name: z.name, latitude: z.latitude, longitude: z.longitude, radius: z.radiusInMeters, assignments: z.assignmentCount || 0, devices: z.deviceCount || 0, status: z.isActive ? 'ACTIVE' : 'INACTIVE' })),
                    'zones', ['name','latitude','longitude','radius','assignments','devices','status'], 'Zone Management'
                  )}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" disabled={zones.length === 0}
                  onClick={() => exportReportToPDF('Zones Report', [{
                    heading: 'All Zones',
                    rows: [
                      ['Name', 'Latitude', 'Longitude', 'Radius (m)', 'Assignments', 'Status'],
                      ...zones.map(z => [z.name, String(z.latitude), String(z.longitude), String(z.radiusInMeters), String(z.assignmentCount || 0), z.isActive ? 'ACTIVE' : 'INACTIVE'])
                    ]
                  }], 'zones', 'Zone Management')}>
                  <FileText className="h-4 w-4" /> PDF
                </Button>
                <Button onClick={() => { setEditingZone(null); setForm({ name: "", latitude: 0, longitude: 0, radiusInMeters: 100 }); setIsDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Zone
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search zones by name..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1.5 h-9">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Latitude</TableHead>
                <TableHead>Longitude</TableHead>
                <TableHead>Radius (m)</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead>Devices</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {hasFilters ? "No zones match your search or filter." : "No zones found."}
                  </TableCell>
                </TableRow>
              )}
              {zones.map((zone, index) => (
                <TableRow key={zone.id}>
                  <TableCell className="text-muted-foreground text-sm">{((currentPage - 1) * 10) + index + 1}</TableCell>
                  <TableCell>{zone.name}</TableCell>
                  <TableCell>{zone.latitude}</TableCell>
                  <TableCell>{zone.longitude}</TableCell>
                  <TableCell>{zone.radiusInMeters}</TableCell>
                  <TableCell>{zone.assignmentCount || 0}</TableCell>
                  <TableCell>{zone.deviceCount || 0}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${zone.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {zone.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleViewZone(zone.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setStatusConfirm({ id: zone.id, isActive: !zone.isActive })}>
                        <Power className={`h-4 w-4 ${zone.isActive ? "text-green-600" : "text-gray-400"}`} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditingZone(zone); setForm({ name: zone.name, latitude: zone.latitude, longitude: zone.longitude, radiusInMeters: zone.radiusInMeters }); setIsDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(zone.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * 10) + 1}–{Math.min(currentPage * 10, total)} of {total}
              </p>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => fetchZones(currentPage - 1)}>
                  ← Prev
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const n = Math.max(1, currentPage - 2) + i;
                  if (n > totalPages) return null;
                  return (
                    <Button key={n} variant={currentPage === n ? "default" : "outline"} size="sm" className="w-8 h-8 p-0 text-xs" onClick={() => fetchZones(n)}>
                      {n}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => fetchZones(currentPage + 1)}>
                  Next →
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Confirmation Dialog */}
      <Dialog open={!!statusConfirm} onOpenChange={(open) => { if (!open) setStatusConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{statusConfirm?.isActive ? "Activate Zone" : "Deactivate Zone"}</DialogTitle>
            <DialogDescription>
              Are you sure you want to {statusConfirm?.isActive ? "activate" : "deactivate"} this zone?
              {!statusConfirm?.isActive && " Deactivating will remove it from active assignments."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStatusConfirm(null)} disabled={statusLoading}>
              Cancel
            </Button>
            <Button
              onClick={() => statusConfirm && handleStatusToggle(statusConfirm.id, statusConfirm.isActive)}
              disabled={statusLoading}
              className={statusConfirm?.isActive ? "bg-green-600 hover:bg-green-700" : "bg-destructive hover:bg-destructive/90"}
            >
              {statusLoading ? "Updating..." : statusConfirm?.isActive ? "Yes, Activate" : "Yes, Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Zone Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingZone ? "Edit Zone" : "Add Zone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Latitude</Label>
              <Input type="number" step="0.000001" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) })} />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input type="number" step="0.000001" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) })} />
            </div>
            <div>
              <Label>Radius (meters)</Label>
              <Input type="number" value={form.radiusInMeters} onChange={(e) => setForm({ ...form, radiusInMeters: parseInt(e.target.value) })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Zone Dialog */}
      <Dialog open={viewZoneOpen} onOpenChange={setViewZoneOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Zone Details</DialogTitle>
          </DialogHeader>
          {selectedZone && (
            <div className="space-y-6 overflow-y-auto pr-2">
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Zone Name</Label>
                      <p className="text-base font-semibold">{selectedZone.name}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${selectedZone.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {selectedZone.isActive ? "● ACTIVE" : "● INACTIVE"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Radius</Label>
                      <p className="text-base font-semibold">{selectedZone.radiusInMeters}m</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Latitude
                      </Label>
                      <p className="text-sm font-mono">{selectedZone.latitude}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Longitude
                      </Label>
                      <p className="text-sm font-mono">{selectedZone.longitude}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Devices in this Zone</Label>
                  <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {selectedZone.devices?.length || 0} devices
                  </span>
                </div>
                {selectedZone.devices && selectedZone.devices.length > 0 ? (
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                    {selectedZone.devices.map((device: any) => (
                      <Card key={device.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{device.deviceName}</p>
                              <p className="text-xs text-muted-foreground font-mono mt-1">{device.deviceId}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Battery</p>
                                <p className="text-sm font-semibold">{device.battery}%</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${device.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                                {device.status}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">No devices assigned to this zone</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

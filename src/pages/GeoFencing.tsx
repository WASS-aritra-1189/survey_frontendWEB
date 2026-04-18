import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin,
  Circle,
  Eye,
  Smartphone,
  Navigation,
  AlertTriangle,
  RefreshCw,
  Target,
  Signal,
  Activity,
  Bell,
  Map,
  Radio,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GPSMap } from "@/components/maps/GPSMap";
import { deviceService, DeviceLocation } from "@/services/deviceService";
import { zoneService } from "@/services/zoneService";
import { useAuthStore } from "@/store/authStore";

interface ZoneRow {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusInMeters: number;
  isActive: boolean;
  deviceCount: number;
}

export default function GeoFencing() {
  const { tokens } = useAuthStore();
  const navigate = useNavigate();
  const [deviceLocations, setDeviceLocations] = useState<DeviceLocation[]>([]);
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ZoneRow | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceLocation | null>(null);
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!tokens?.accessToken) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [locs, zonesRes] = await Promise.all([
        deviceService.getLocations(tokens.accessToken),
        zoneService.getAll(tokens.accessToken, { limit: 1000 }),
      ]);

      setDeviceLocations(locs);

      // Enrich zones with device count
      const zoneRows: ZoneRow[] = (zonesRes.data ?? zonesRes).map((z: any) => ({
        id: z.id,
        name: z.name,
        latitude: Number(z.latitude),
        longitude: Number(z.longitude),
        radiusInMeters: z.radiusInMeters,
        isActive: z.isActive,
        deviceCount: locs.filter((d) => d.zone?.id === z.id).length,
      }));
      setZones(zoneRows);
    } catch {
      toast.error("Failed to load location data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build map markers from real device locations
  const deviceMarkers = deviceLocations
    .filter((d) => d.location.latitude !== null && d.location.longitude !== null)
    .map((d) => ({
      id: d.id,
      lat: d.location.latitude as number,
      lng: d.location.longitude as number,
      label: d.deviceName,
      type: "device" as const,
      status: d.status === "ACTIVE" ? ("online" as const) : ("offline" as const),
      info: d.zone ? `Zone: ${d.zone.name}` : "No zone assigned",
    }));

  // Build geofence circles from zones
  const geoFenceCircles = zones.map((z) => ({
    id: z.id,
    lat: z.latitude,
    lng: z.longitude,
    radius: z.radiusInMeters,
    name: z.name,
    status: z.isActive ? ("active" as const) : ("inactive" as const),
  }));

  const stats = {
    totalZones: zones.length,
    activeZones: zones.filter((z) => z.isActive).length,
    devicesOnline: deviceLocations.filter((d) => d.status === "ACTIVE").length,
    devicesWithZone: deviceLocations.filter((d) => d.zone !== null).length,
  };

  const handleViewZone = (zone: ZoneRow) => {
    setSelectedZone(zone);
    setIsViewDialogOpen(true);
  };

  const handleViewDevice = (device: DeviceLocation) => {
    setSelectedDevice(device);
    setIsDeviceDialogOpen(true);
  };

  if (loading) {
    return (
      <AdminLayout title="Geo-Fencing & GPS Tracking" subtitle="Real-time device tracking and location boundaries">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Geo-Fencing & GPS Tracking" subtitle="Real-time device tracking and location boundaries">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-3">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalZones}</p>
              <p className="text-sm text-muted-foreground">Total Zones</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-success/10 p-3">
              <Circle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.activeZones}</p>
              <p className="text-sm text-muted-foreground">Active Zones</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-accent p-3">
              <Smartphone className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.devicesOnline}</p>
              <p className="text-sm text-muted-foreground">Devices Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-warning/10 p-3">
              <Signal className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.devicesWithZone}</p>
              <p className="text-sm text-muted-foreground">In Zones</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Live GPS Tracking Map
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
                  <RefreshCw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] rounded-xl overflow-hidden border">
              <GPSMap
                markers={deviceMarkers}
                geoFences={geoFenceCircles}
                zoom={6}
                showControls={true}
                interactive={true}
                isRefreshingExternal={refreshing}
                onRefresh={() => fetchData(true)}
                onMarkerClick={(marker) => {
                  const device = deviceLocations.find((d) => d.id === marker.id);
                  if (device) handleViewDevice(device);
                }}
                onGeoFenceClick={(fence) => {
                  const zone = zones.find((z) => z.id === fence.id);
                  if (zone) handleViewZone(zone);
                }}
              />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                  <span className="text-sm">Active ({deviceLocations.filter((d) => d.status === "ACTIVE").length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-muted" />
                  <span className="text-sm">Inactive ({deviceLocations.filter((d) => d.status !== "ACTIVE").length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full border-2 border-primary bg-primary/20" />
                  <span className="text-sm">Geo-fence Zone</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {deviceMarkers.length} device{deviceMarkers.length !== 1 ? "s" : ""} plotted
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Zone Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Zone Summary
                </CardTitle>
                <Badge variant="secondary">{zones.length} zones</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {zones.slice(0, 5).map((zone) => (
                  <div
                    key={zone.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => handleViewZone(zone)}
                  >
                    <div className={cn("rounded-full p-1.5", zone.isActive ? "bg-success/10 text-success" : "bg-muted-foreground/10 text-muted-foreground")}>
                      <Navigation className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{zone.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {zone.latitude.toFixed(4)}°, {zone.longitude.toFixed(4)}°
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{zone.deviceCount} devices</p>
                      <p className="text-xs text-muted-foreground">{zone.radiusInMeters}m</p>
                    </div>
                  </div>
                ))}
              </div>
              {zones.length > 5 && (
                <Button variant="ghost" className="w-full mt-3" size="sm" onClick={() => navigate("/zone-management")}>
                  View All Zones <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Active Devices */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Radio className="h-4 w-4" />
                  Devices
                </CardTitle>
                <Badge className="bg-success/10 text-success">
                  {deviceLocations.filter((d) => d.status === "ACTIVE").length} active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {deviceLocations.slice(0, 6).map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleViewDevice(device)}
                  >
                    <div className="relative">
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", device.status === "ACTIVE" ? "bg-success/10" : "bg-muted")}>
                        <Smartphone className={cn("h-4 w-4", device.status === "ACTIVE" ? "text-success" : "text-muted-foreground")} />
                      </div>
                      {device.status === "ACTIVE" && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{device.deviceName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {device.zone ? device.zone.name : "No zone"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{device.battery ?? "—"}%</p>
                      <Activity className="h-3 w-3 text-muted-foreground ml-auto mt-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Zones Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Geo-Fence Zones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Zone Name</TableHead>
                  <TableHead>Coordinates</TableHead>
                  <TableHead>Radius</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Devices</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No zones found
                    </TableCell>
                  </TableRow>
                ) : (
                  zones.map((zone) => (
                    <TableRow key={zone.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewZone(zone)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2.5 w-2.5 rounded-full", zone.isActive ? "bg-success" : "bg-muted-foreground")} />
                          <span className="font-medium">{zone.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {zone.latitude.toFixed(6)}°, {zone.longitude.toFixed(6)}°
                      </TableCell>
                      <TableCell>{zone.radiusInMeters}m</TableCell>
                      <TableCell>
                        <Badge className={zone.isActive ? "bg-success/10 text-success" : ""} variant={zone.isActive ? "default" : "secondary"}>
                          {zone.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={zone.deviceCount > 0 ? "font-medium text-primary" : "text-muted-foreground"}>
                          {zone.deviceCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleViewZone(zone); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Zone Detail Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {selectedZone?.name}
            </DialogTitle>
            <DialogDescription>Zone details and assigned devices</DialogDescription>
          </DialogHeader>
          {selectedZone && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{selectedZone.deviceCount}</p>
                  <p className="text-xs text-muted-foreground">Devices</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{selectedZone.radiusInMeters}m</p>
                  <p className="text-xs text-muted-foreground">Radius</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Coordinates</Label>
                <div className="p-3 rounded-lg bg-muted/30 font-mono text-sm">
                  {selectedZone.latitude.toFixed(8)}°, {selectedZone.longitude.toFixed(8)}°
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">Zone Status</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedZone.isActive ? "Active — tracking devices" : "Inactive"}
                  </p>
                </div>
                <Switch checked={selectedZone.isActive} disabled />
              </div>
              {/* Devices in this zone */}
              {selectedZone.deviceCount > 0 && (
                <div className="space-y-2">
                  <Label>Devices in this zone</Label>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {deviceLocations.filter((d) => d.zone?.id === selectedZone.id).map((d) => (
                      <div key={d.id} className="flex items-center gap-2 p-2 rounded bg-muted/30 text-sm">
                        <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{d.deviceName}</span>
                        <span className="text-muted-foreground text-xs ml-auto">{d.deviceId}</span>
                        <Badge variant={d.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                          {d.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Device Detail Dialog */}
      <Dialog open={isDeviceDialogOpen} onOpenChange={setIsDeviceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              {selectedDevice?.deviceName}
            </DialogTitle>
            <DialogDescription>Device location and zone info</DialogDescription>
          </DialogHeader>
          {selectedDevice && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Device ID</p>
                  <p className="font-mono text-sm font-medium">{selectedDevice.deviceId}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Battery</p>
                  <p className="text-sm font-medium">{selectedDevice.battery ?? "—"}%</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge variant={selectedDevice.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                    {selectedDevice.status}
                  </Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Zone</p>
                  <p className="text-sm font-medium truncate">{selectedDevice.zone?.name ?? "None"}</p>
                </div>
              </div>
              {selectedDevice.location.latitude !== null && (
                <div className="space-y-1">
                  <Label>GPS Coordinates</Label>
                  <div className="p-3 rounded-lg bg-muted/30 font-mono text-sm">
                    {selectedDevice.location.latitude?.toFixed(8)}°, {selectedDevice.location.longitude?.toFixed(8)}°
                  </div>
                </div>
              )}
              {selectedDevice.zone && (
                <div className="space-y-1">
                  <Label>Zone Boundary</Label>
                  <div className="p-3 rounded-lg bg-muted/30 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Center</span>
                      <span className="font-mono text-xs">{Number(selectedDevice.zone.latitude).toFixed(6)}°, {Number(selectedDevice.zone.longitude).toFixed(6)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Radius</span>
                      <span>{selectedDevice.zone.radiusInMeters}m</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

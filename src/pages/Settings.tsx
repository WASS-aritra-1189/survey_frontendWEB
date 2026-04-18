import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Save, Upload, X, Image } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSettings, updateSettings } from "@/store/settingsSlice";
import { toast } from "sonner";
import { BaseUrl } from "@/config/BaseUrl";

// ── Logo upload field ──────────────────────────────────────────────────────────
function LogoField({
  label,
  value,
  token,
  onChange,
}: {
  label: string;
  value: string | null;
  token: string;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${BaseUrl}/uploads/local/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.data?.message || "Upload failed");
      const filePath: string = json.data?.data?.path ?? json.data?.path;
      if (!filePath) throw new Error("No file path in response");
      // Always store the relative path — resolved to full URL at display time
      onChange(filePath);
      toast.success(`${label} uploaded`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-3">
        <div
          className="h-16 w-24 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <Image className="h-6 w-6 text-muted-foreground/40" />
          )}
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {/* URL input */}
          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="https://..."
            className="h-8 text-xs"
          />
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3 w-3" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                onClick={() => onChange(null)}
              >
                <X className="h-3 w-3" /> Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ── Logo section (3 fields in a grid) ─────────────────────────────────────────
function LogoSection({
  title,
  fields,
  formData,
  token,
  setFormData,
}: {
  title: string;
  fields: { label: string; key: string }[];
  formData: any;
  token: string;
  setFormData: (d: any) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {fields.map(({ label, key }) => (
          <LogoField
            key={key}
            label={label}
            value={formData[key]}
            token={token}
            onChange={(url) => setFormData({ ...formData, [key]: url })}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Settings() {
  const dispatch = useAppDispatch();
  const tokens = useAuthStore((state) => state.tokens);
  const { data: settings, isLoading } = useAppSelector((state) => state.settings);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (tokens?.accessToken) dispatch(fetchSettings(tokens.accessToken));
  }, [dispatch, tokens]);

  useEffect(() => {
    if (Array.isArray(settings) && settings.length > 0) {
      const active = settings.find((s) => s.status === "ACTIVE") ?? settings[0];
      setFormData(active);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!tokens?.accessToken || !formData?.id) return;
    try {
      const payload = {
        title: formData.title,
        message: formData.message,
        userSetting: formData.userSetting ?? {},
        adminSetting: formData.adminSetting ?? {},
        mobileSetting: formData.mobileSetting ?? {},
        userDomain: formData.userDomain,
        adminDomain: formData.adminDomain,
        mobileDomain: formData.mobileDomain,
        userMaintenanceMode: formData.userMaintenanceMode,
        adminMaintenanceMode: formData.adminMaintenanceMode,
        mobileMaintenanceMode: formData.mobileMaintenanceMode,
        userLoginLogo: formData.userLoginLogo || undefined,
        adminLoginLogo: formData.adminLoginLogo || undefined,
        mobileLoginLogo: formData.mobileLoginLogo || undefined,
        userRegisterLogo: formData.userRegisterLogo || undefined,
        adminRegisterLogo: formData.adminRegisterLogo || undefined,
        mobileRegisterLogo: formData.mobileRegisterLogo || undefined,
        userLoginBackground: formData.userLoginBackground || undefined,
        adminLoginBackground: formData.adminLoginBackground || undefined,
        mobileLoginBackground: formData.mobileLoginBackground || undefined,
        userRegisterBackground: formData.userRegisterBackground || undefined,
        adminRegisterBackground: formData.adminRegisterBackground || undefined,
        mobileRegisterBackground: formData.mobileRegisterBackground || undefined,
        accountLevel: formData.accountLevel,
        multiDeviceLogin: formData.multiDeviceLogin,
        currency: formData.currency,
        partnerCommissionType: formData.partnerCommissionType,
        status: formData.status,
      };
      await dispatch(updateSettings({ id: formData.id, data: payload, token: tokens.accessToken })).unwrap();
      // Re-fetch to get the persisted data including logo URLs
      await dispatch(fetchSettings(tokens.accessToken));
      toast.success("Settings updated successfully!");
    } catch {
      toast.error("Failed to update settings");
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Settings" subtitle="Configure system preferences">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }

  if (!formData) {
    return (
      <AdminLayout title="Settings" subtitle="Configure system preferences">
        <p className="text-muted-foreground text-center py-12">No settings found</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings" subtitle="Configure system preferences">
      <div className="space-y-6">

        {/* Row 1 — General + Domain */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-primary" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title ?? ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Welcome Message</Label>
                <Input value={formData.message ?? ""} onChange={(e) => setFormData({ ...formData, message: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={formData.currency ?? ""} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Account Level</Label>
                <Input type="number" value={formData.accountLevel ?? 1} onChange={(e) => setFormData({ ...formData, accountLevel: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Partner Commission Type</Label>
                <Input value={formData.partnerCommissionType ?? ""} onChange={(e) => setFormData({ ...formData, partnerCommissionType: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Domain Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>User Domain</Label>
                <Input value={formData.userDomain ?? ""} onChange={(e) => setFormData({ ...formData, userDomain: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Admin Domain</Label>
                <Input value={formData.adminDomain ?? ""} onChange={(e) => setFormData({ ...formData, adminDomain: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Mobile Domain</Label>
                <Input value={formData.mobileDomain ?? ""} onChange={(e) => setFormData({ ...formData, mobileDomain: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2 — Maintenance + Login */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Maintenance Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">User Maintenance Mode</p>
                <Switch checked={!!formData.userMaintenanceMode} onCheckedChange={(v) => setFormData({ ...formData, userMaintenanceMode: v })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <p className="font-medium">Admin Maintenance Mode</p>
                <Switch checked={!!formData.adminMaintenanceMode} onCheckedChange={(v) => setFormData({ ...formData, adminMaintenanceMode: v })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <p className="font-medium">Mobile Maintenance Mode</p>
                <Switch checked={!!formData.mobileMaintenanceMode} onCheckedChange={(v) => setFormData({ ...formData, mobileMaintenanceMode: v })} />
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Login Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">Multi Device Login</p>
                <Switch checked={!!formData.multiDeviceLogin} onCheckedChange={(v) => setFormData({ ...formData, multiDeviceLogin: v })} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 3 — Login Logos */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              Login Logos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <LogoSection
              title="Login Logos"
              fields={[
                { label: "User Login Logo", key: "userLoginLogo" },
                { label: "Admin Login Logo", key: "adminLoginLogo" },
                { label: "Mobile Login Logo", key: "mobileLoginLogo" },
              ]}
              formData={formData}
              token={tokens!.accessToken}
              setFormData={setFormData}
            />
            <Separator />
            <LogoSection
              title="Register Logos"
              fields={[
                { label: "User Register Logo", key: "userRegisterLogo" },
                { label: "Admin Register Logo", key: "adminRegisterLogo" },
                { label: "Mobile Register Logo", key: "mobileRegisterLogo" },
              ]}
              formData={formData}
              token={tokens!.accessToken}
              setFormData={setFormData}
            />
          </CardContent>
        </Card>

        {/* Row 4 — Backgrounds */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              Backgrounds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <LogoSection
              title="Login Backgrounds"
              fields={[
                { label: "User Login BG", key: "userLoginBackground" },
                { label: "Admin Login BG", key: "adminLoginBackground" },
                { label: "Mobile Login BG", key: "mobileLoginBackground" },
              ]}
              formData={formData}
              token={tokens!.accessToken}
              setFormData={setFormData}
            />
            <Separator />
            <LogoSection
              title="Register Backgrounds"
              fields={[
                { label: "User Register BG", key: "userRegisterBackground" },
                { label: "Admin Register BG", key: "adminRegisterBackground" },
                { label: "Mobile Register BG", key: "mobileRegisterBackground" },
              ]}
              formData={formData}
              token={tokens!.accessToken}
              setFormData={setFormData}
            />
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isLoading} size="lg">
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

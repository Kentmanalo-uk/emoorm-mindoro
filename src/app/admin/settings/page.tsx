"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Shield,
  Bell,
  Globe,
  Palette,
  Lock,
  Database,
  Mail,
  Save,
  LogOut,
  Trash2,
  AlertTriangle,
  Users,
  Plus,
  X,
  Check,
} from "lucide-react";
import {
  useUser,
  useSupabase,
  useSupabaseAuth,
  useStableMemo,
  useDoc,
  setDocumentNonBlocking,
} from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

const SETTINGS_DOC_ID = "platform-settings";

export default function AdminSettingsPage() {
  const { user, isUserLoading } = useUser();
  const supabase = useSupabase();
  const { auth } = useSupabaseAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { isAdmin, isAdminLoading } = useIsAdmin();

  // Settings state
  const [platformName, setPlatformName] = useState("E-Moorm");
  const [platformDescription, setPlatformDescription] = useState(
    "Your local marketplace",
  );
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [newSellerNotifications, setNewSellerNotifications] = useState(true);
  const [autoApproveProducts, setAutoApproveProducts] = useState(true);
  const [autoApproveSellers, setAutoApproveSellers] = useState(false);
  const [commissionRate, setCommissionRate] = useState("5");
  const [saving, setSaving] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, isAdminLoading, router]);

  // Fetch admin profile
  const profileRef = useStableMemo(() => {
    if (!user) return null;
    return { table: "users", id: user.uid };
  }, [user]);
  const { data: profile, isLoading: profileLoading } = useDoc(profileRef);

  // Load saved settings from the admin user's profile (adminSettings field)
  useEffect(() => {
    if (profile && !settingsLoaded) {
      const s = (profile as any).adminSettings;
      if (s) {
        if (s.platformName) setPlatformName(s.platformName);
        if (s.platformDescription)
          setPlatformDescription(s.platformDescription);
        if (typeof s.maintenanceMode === "boolean")
          setMaintenanceMode(s.maintenanceMode);
        if (typeof s.emailNotifications === "boolean")
          setEmailNotifications(s.emailNotifications);
        if (typeof s.orderNotifications === "boolean")
          setOrderNotifications(s.orderNotifications);
        if (typeof s.newSellerNotifications === "boolean")
          setNewSellerNotifications(s.newSellerNotifications);
        if (typeof s.autoApproveProducts === "boolean")
          setAutoApproveProducts(s.autoApproveProducts);
        if (typeof s.autoApproveSellers === "boolean")
          setAutoApproveSellers(s.autoApproveSellers);
        if (s.commissionRate) setCommissionRate(s.commissionRate);
      }
      setSettingsLoaded(true);
    }
  }, [profile, settingsLoaded]);

  if (isAdminLoading || !isAdmin) return null;

  const profilePic =
    (profile as any)?.profilePictureUrl ||
    user?.photoURL ||
    "https://i.pinimg.com/736x/d2/98/4e/d2984ec4b65a8568eab3dc2b640fc58e.jpg";

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const adminSettings = {
        platformName,
        platformDescription,
        maintenanceMode,
        emailNotifications,
        orderNotifications,
        newSellerNotifications,
        autoApproveProducts,
        autoApproveSellers,
        commissionRate,
        updatedAt: new Date().toISOString(),
      };
      setDocumentNonBlocking(supabase, "users", {
        id: user.uid,
        adminSettings,
      });
      toast({
        title: "Settings saved",
        description: "Your admin settings have been updated.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    router.push("/admin");
  };

  const ToggleSwitch = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200",
        checked ? "bg-primary" : "bg-black/10 dark:bg-white/10",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 mt-1",
          checked ? "translate-x-6 ml-0.5" : "translate-x-1",
        )}
      />
    </button>
  );

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-6 md:p-8 w-full pt-6 md:pt-32 pb-24 space-y-8 md:space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-normal font-headline tracking-[-0.05em] text-black dark:text-white">
              Admin Settings
            </h1>
            <p className="text-sm text-muted-foreground font-normal">
              Platform configuration &amp; preferences
            </p>
          </div>
          <Button
            className="bg-black hover:bg-primary transition-colors rounded-full px-8 h-12 shadow-sm gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Admin Profile */}
        <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-xl font-normal font-headline tracking-[-0.05em] mb-6 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Admin Profile
            </h2>
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-2xl overflow-hidden border border-black/[0.06] shrink-0">
                <Image
                  src={profilePic}
                  alt="Admin"
                  width={64}
                  height={64}
                  className="object-cover h-full w-full"
                  unoptimized
                />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {(profile as any)?.name || user?.displayName || "Admin"}
                </p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge className="bg-primary/10 text-primary border-0 rounded-full text-[10px] px-3 py-0.5 mt-1">
                  Super Admin
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Settings */}
        <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]">
          <CardContent className="p-6 md:p-8 space-y-6">
            <h2 className="text-xl font-normal font-headline tracking-[-0.05em] flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Platform Settings
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-bold tracking-tight text-muted-foreground">
                Platform Name
              </label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full px-6 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold tracking-tight text-muted-foreground">
                Platform Description
              </label>
              <input
                type="text"
                value={platformDescription}
                onChange={(e) => setPlatformDescription(e.target.value)}
                className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full px-6 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold tracking-tight text-muted-foreground">
                Commission Rate (%)
              </label>
              <input
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                min="0"
                max="100"
                className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full px-6 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all max-w-[200px]"
              />
            </div>

            <div className="flex items-center justify-between py-3 border-t border-black/[0.04] dark:border-white/[0.04]">
              <div>
                <p className="text-sm font-medium">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">
                  Temporarily disable the platform for users
                </p>
              </div>
              <ToggleSwitch
                checked={maintenanceMode}
                onChange={setMaintenanceMode}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]">
          <CardContent className="p-6 md:p-8 space-y-4">
            <h2 className="text-xl font-normal font-headline tracking-[-0.05em] flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </h2>

            {[
              {
                label: "Email Notifications",
                desc: "Receive admin email alerts",
                state: emailNotifications,
                setter: setEmailNotifications,
              },
              {
                label: "Order Notifications",
                desc: "Get notified on new orders",
                state: orderNotifications,
                setter: setOrderNotifications,
              },
              {
                label: "New Seller Alerts",
                desc: "Get notified when sellers register",
                state: newSellerNotifications,
                setter: setNewSellerNotifications,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-3 border-b border-black/[0.03] dark:border-white/[0.03] last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ToggleSwitch checked={item.state} onChange={item.setter} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Moderation */}
        <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]">
          <CardContent className="p-6 md:p-8 space-y-4">
            <h2 className="text-xl font-normal font-headline tracking-[-0.05em] flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Moderation &amp; Approval
            </h2>

            <div className="flex items-center justify-between py-3 border-b border-black/[0.03] dark:border-white/[0.03]">
              <div>
                <p className="text-sm font-medium">Auto-Approve Products</p>
                <p className="text-xs text-muted-foreground">
                  Automatically approve new product listings
                </p>
              </div>
              <ToggleSwitch
                checked={autoApproveProducts}
                onChange={setAutoApproveProducts}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">Auto-Approve Sellers</p>
                <p className="text-xs text-muted-foreground">
                  Automatically approve new seller registrations
                </p>
              </div>
              <ToggleSwitch
                checked={autoApproveSellers}
                onChange={setAutoApproveSellers}
              />
            </div>
          </CardContent>
        </Card>

        {/* Admin Users */}
        <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-xl font-normal font-headline tracking-[-0.05em] flex items-center gap-2 mb-6">
              <Users className="h-5 w-5 text-primary" />
              Admin Users
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f8f8f8] dark:bg-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm">{user?.email || "Admin"}</span>
                </div>
                <Badge className="bg-primary/10 text-primary border-0 rounded-full text-[10px] px-3">
                  Admin
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Admin access is managed via the database. Set a user&apos;s role
              to &quot;admin&quot; in the users table.
            </p>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-red-100 dark:border-red-500/20 rounded-[32px] bg-white dark:bg-white/[0.03]">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-xl font-normal font-headline tracking-[-0.05em] flex items-center gap-2 text-red-600 mb-6">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </h2>
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl gap-3 h-12 border-black/[0.06] dark:border-white/[0.06] text-sm"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" /> Sign Out of Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

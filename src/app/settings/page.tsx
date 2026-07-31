"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FirstTimeIntro } from "@/components/first-time-intro";
import {
  useUser,
  useSupabase,
  useDoc,
  useStableMemo,
  useSupabaseAuth,
  updateDocumentNonBlocking,
} from "@/supabase";
import {
  User,
  MapPin,
  Smartphone,
  Save,
  Moon,
  Sun,
  Globe,
  Lock,
  ChevronRight,
  Shield,
  ArrowLeft,
  Mail,
  Bell,
  Settings as SettingsIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ProfileSidebar } from "@/app/profile/page";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const { auth } = useSupabaseAuth();
  const supabase = useSupabase();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useStableMemo(() => {
    if (!user) return null;
    return { table: "users", id: user.uid };
  }, [user]);

  const { data: profile } = useDoc(userProfileRef);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    profilePictureUrl: "",
    province: "",
    city: "",
    barangay: "",
    street: "",
  });

  const [provinces, setProvinces] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState("English");

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        mobile: profile.mobile || "",
        profilePictureUrl: profile.profilePictureUrl || "",
        province: profile.province || "",
        city: profile.city || "",
        barangay: profile.barangay || "",
        street: profile.street || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    // Detect saved theme or system preference
    const savedTheme = localStorage.getItem("theme");
    let isDark = false;
    if (savedTheme === "dark") {
      isDark = true;
    } else if (savedTheme === "light") {
      isDark = false;
    } else {
      // No saved theme, use system preference
      isDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        setIsDarkMode(e.matches);
        document.documentElement.classList.toggle("dark", e.matches);
      }
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    fetch("https://psgc.gitlab.io/api/provinces.json")
      .then((res) => res.json())
      .then((data) => {
        setProvinces(
          data.sort((a: any, b: any) => a.name.localeCompare(b.name)),
        );
      })
      .catch((err) => console.error("Error loading provinces:", err));

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  const handleDarkModeToggle = (checked: boolean) => {
    setIsDarkMode(checked);
    const theme = checked ? "dark" : "light";
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", checked);
  };

  const handleUpdateProfile = () => {
    if (!user) return;

    updateDocumentNonBlocking(supabase, "users", user.uid, {
      ...formData,
      updatedAt: new Date().toISOString(),
    });

    toast({
      title: "Settings Saved",
      description: "Your profile has been updated.",
    });
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isUserLoading)
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ backgroundColor: "#f2f2f0" }}
      >
        <Header />
        <main className="flex-grow pt-6">
          <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-24 max-w-2xl space-y-4">
            <div className="bg-white rounded-[5px] border border-black/[0.06] px-6 py-5">
              <Skeleton className="h-6 w-28 rounded mb-1.5" />
              <Skeleton className="h-4 w-48 rounded" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-[5px] border border-black/[0.06] p-5 space-y-3"
              >
                <Skeleton className="h-3 w-24 rounded" />
                {Array.from({ length: 3 }).map((_, j) => (
                  <div
                    key={j}
                    className="flex items-center justify-between py-3 border-t border-black/[0.04]"
                  >
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-4 w-32 rounded" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  if (!user) {
    if (typeof window !== "undefined") router.push("/login");
    return null;
  }

  const sectionHeaderClass = "text-xs font-semibold text-[#555] mb-2";
  const groupedContainerClass =
    "bg-white rounded-[5px] overflow-hidden border border-black/[0.06]";
  const rowClass =
    "flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#f9f9f8]";
  const rowLabelClass = "text-sm text-[#333] shrink-0";
  const rowInputClass =
    "flex-1 text-right text-sm font-medium bg-transparent outline-none border-none text-[#29a366] placeholder:text-[#ccc]";

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "#f2f2f0" }}
    >
      <Header />
      <main className="flex-grow pt-6">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-24 flex gap-5 items-start">
          <ProfileSidebar onLogout={handleLogout} />
          <div className="flex-1 min-w-0 max-w-[680px]">
            <div className="bg-white rounded-[5px] border border-black/[0.06] px-6 py-5 mb-4">
              <h1 className="text-lg font-semibold text-[#111]">Settings</h1>
              <p className="text-sm text-[#888]">
                Personalize your shopping experience.
              </p>
            </div>

            <div className="space-y-4">
              {/* Personal Section */}
              <div>
                <h3 className={sectionHeaderClass}>Personal Profile</h3>
                <div className={groupedContainerClass}>
                  <div className={rowClass}>
                    <span className={rowLabelClass}>First Name</span>
                    <input
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      className={rowInputClass}
                      placeholder="Required"
                    />
                  </div>
                  <div className="border-t border-black/[0.04] mx-5" />
                  <div className={rowClass}>
                    <span className={rowLabelClass}>Last Name</span>
                    <input
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      className={rowInputClass}
                      placeholder="Required"
                    />
                  </div>
                  <div className="border-t border-black/[0.04] mx-5" />
                  <div className={rowClass}>
                    <span className={rowLabelClass}>Avatar URL</span>
                    <input
                      value={formData.profilePictureUrl}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          profilePictureUrl: e.target.value,
                        })
                      }
                      className={rowInputClass}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="border-t border-black/[0.04] mx-5" />
                  <div className={rowClass}>
                    <span className={rowLabelClass}>Mobile</span>
                    <div className="flex items-center gap-1 flex-1 justify-end">
                      <span className="text-sm font-bold text-muted-foreground/40 select-none">
                        +63
                      </span>
                      <input
                        type="tel"
                        value={formData.mobile}
                        onChange={(e) => {
                          const v = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          setFormData({ ...formData, mobile: v });
                        }}
                        className="text-right text-sm font-medium bg-transparent outline-none border-none text-primary max-w-[120px]"
                        placeholder="9123456789"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div>
                <h3 className={sectionHeaderClass}>Delivery Address</h3>
                <div className={groupedContainerClass}>
                  <div className={rowClass}>
                    <span className={rowLabelClass}>Province</span>
                    <select
                      value={formData.province}
                      onChange={(e) =>
                        setFormData({ ...formData, province: e.target.value })
                      }
                      className="flex-1 text-right text-sm font-medium bg-transparent outline-none border-none text-primary appearance-none cursor-pointer"
                    >
                      <option value="">Select</option>
                      {provinces.map((p) => (
                        <option key={p.code} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="border-t border-black/[0.04] mx-5" />
                  <div className={rowClass}>
                    <span className={rowLabelClass}>City</span>
                    <input
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className={rowInputClass}
                      placeholder="Your city"
                    />
                  </div>
                  <div className="border-t border-black/[0.04] mx-5" />
                  <div className={rowClass}>
                    <span className={rowLabelClass}>Barangay</span>
                    <input
                      value={formData.barangay}
                      onChange={(e) =>
                        setFormData({ ...formData, barangay: e.target.value })
                      }
                      className={rowInputClass}
                      placeholder="Hagan"
                    />
                  </div>
                  <div className="border-t border-black/[0.04] mx-5" />
                  <div className={rowClass}>
                    <span className={rowLabelClass}>Street</span>
                    <input
                      value={formData.street}
                      onChange={(e) =>
                        setFormData({ ...formData, street: e.target.value })
                      }
                      className={rowInputClass}
                      placeholder="Balahid"
                    />
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h3 className={sectionHeaderClass}>Accessibility</h3>
                <div className={groupedContainerClass}>
                  <div className={rowClass}>
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-black flex items-center justify-center text-white">
                        <Moon className="h-4 w-4" />
                      </div>
                      <span className={rowLabelClass}>Dark Mode</span>
                    </div>
                    <Switch
                      checked={isDarkMode}
                      onCheckedChange={handleDarkModeToggle}
                      className="scale-90"
                    />
                  </div>
                  <div className="border-t border-black/[0.04] mx-5" />
                  <div className={rowClass}>
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                        <Globe className="h-4 w-4" />
                      </div>
                      <span className={rowLabelClass}>Language</span>
                    </div>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-[100px] border-none bg-transparent shadow-none focus:ring-0 h-auto p-0 text-right text-sm font-medium text-primary flex justify-end gap-1">
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl bg-white dark:bg-[#111]">
                        <SelectItem value="English" className="rounded-xl">
                          English
                        </SelectItem>
                        <SelectItem value="Filipino" className="rounded-xl">
                          Filipino
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div>
                <h3 className={sectionHeaderClass}>Security</h3>
                <div className={groupedContainerClass}>
                  <button className={cn(rowClass, "w-full text-left")}>
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-red-500 flex items-center justify-center text-white">
                        <Lock className="h-4 w-4" />
                      </div>
                      <span className={rowLabelClass}>Change Password</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                  </button>
                  <div className="border-t border-black/[0.04] mx-5" />
                  <div className={rowClass}>
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-green-500 flex items-center justify-center text-white">
                        <Shield className="h-4 w-4" />
                      </div>
                      <span className={rowLabelClass}>Two-Factor</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-muted text-[9px] rounded-full px-2 py-0.5 border-none opacity-50"
                    >
                      Disabled
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleUpdateProfile}
                  className="w-full h-11 rounded-[5px] text-white text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: "#29a366" }}
                >
                  <Save className="h-4 w-4" /> Save Changes
                </button>
              </div>
            </div>
          </div>
          {/* end flex-1 */}
        </div>
      </main>

      <FirstTimeIntro
        storageKey="settings"
        title="Settings"
        description="Update your personal info, manage your address, and customize your preferences. Changes are saved when you tap Save."
        icon={<SettingsIcon className="h-7 w-7" />}
      />
      <Footer />
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  MoreVertical,
  Mail,
  Shield,
  ShieldOff,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  Filter,
  AlertTriangle,
} from "lucide-react";
import {
  useUser,
  useSupabase,
  useStableMemo,
  useCollection,
  updateDocumentNonBlocking,
} from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { logAdminAction } from "@/lib/admin-audit";

export default function AdminUsersPage() {
  const { user, isUserLoading } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const { isAdmin, isAdminLoading } = useIsAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [roleTarget, setRoleTarget] = useState<{
    id: string;
    name: string;
    currentRole: string;
  } | null>(null);

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, isAdminLoading, router]);

  const usersConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return { table: "users" };
  }, [user, isAdmin]);
  const { data: allUsers, isLoading } = useCollection(usersConfig);

  if (isAdminLoading || !isAdmin) return null;

  const filteredUsers = (allUsers ?? []).filter((u: any) => {
    const matchesSearch =
      !searchQuery ||
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "seller" && u.role === "seller") ||
      (roleFilter === "buyer" && (!u.role || u.role === "buyer")) ||
      (roleFilter === "admin" && u.role === "admin");
    return matchesSearch && matchesRole;
  });

  const totalUsers = allUsers?.length ?? 0;
  const sellerCount =
    allUsers?.filter((u: any) => u.role === "seller").length ?? 0;
  const adminCount =
    allUsers?.filter((u: any) => u.role === "admin").length ?? 0;
  const buyerCount = totalUsers - sellerCount - adminCount;

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.uid) {
      toast({
        variant: "destructive",
        title: "Cannot delete",
        description: "You cannot delete your own account.",
      });
      return;
    }
    setIsDeleting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userId }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Delete failed",
          description: result.error || "Something went wrong.",
        });
      } else {
        const target = (allUsers ?? []).find((u: any) => u.id === userId);
        if (user) {
          await logAdminAction(supabase, {
            adminId: user.uid,
            adminEmail: user.email ?? undefined,
            action: "user.delete",
            targetType: "user",
            targetId: userId,
            targetLabel: target?.email || target?.name || userId,
          });
        }
        toast({
          title: "User deleted",
          description:
            "The user and all related data have been permanently removed.",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Network error. Please try again.",
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleRole = (userId: string, currentRole: string) => {
    if (userId === user?.uid) {
      toast({
        variant: "destructive",
        title: "Cannot change",
        description: "You cannot change your own role.",
      });
      return;
    }
    if (currentRole === "admin") {
      toast({
        variant: "destructive",
        title: "Cannot change",
        description: "Admin role can only be changed via the database.",
      });
      return;
    }
    const newRole = currentRole === "seller" ? "buyer" : "seller";
    updateDocumentNonBlocking(supabase, "users", userId, { role: newRole });
    const target = (allUsers ?? []).find((u: any) => u.id === userId);
    if (user) {
      logAdminAction(supabase, {
        adminId: user.uid,
        adminEmail: user.email ?? undefined,
        action: "user.role_change",
        targetType: "user",
        targetId: userId,
        targetLabel: target?.email || target?.name || userId,
        metadata: { from: currentRole, to: newRole },
      });
    }
    toast({
      title: "Role updated",
      description: `User role changed to ${newRole}.`,
    });
    setRoleTarget(null);
  };

  const handleSendEmail = (email: string) => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "No email",
        description: "This user has no email address.",
      });
      return;
    }
    window.open(`mailto:${email}?subject=Message from E-Moorm Admin`, "_blank");
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 md:p-8 w-full pt-6 md:pt-32 pb-24 space-y-8 md:space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-normal font-headline tracking-[-0.05em] text-black dark:text-white">
              User Management
            </h1>
            <p className="text-sm text-muted-foreground font-normal">
              {totalUsers} total users · {sellerCount} sellers · {buyerCount}{" "}
              buyers · {adminCount} admins
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {[
            {
              label: "Total Users",
              value: totalUsers,
              icon: Users,
              color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
            },
            {
              label: "Sellers",
              value: sellerCount,
              icon: UserCheck,
              color: "text-green-600 bg-green-50 dark:bg-green-500/10",
            },
            {
              label: "Buyers",
              value: buyerCount,
              icon: UserX,
              color: "text-purple-600 bg-purple-50 dark:bg-purple-500/10",
            },
            {
              label: "Admins",
              value: adminCount,
              icon: Shield,
              color: "text-orange-600 bg-orange-50 dark:bg-orange-500/10",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]"
              >
                <CardContent className="p-5 md:p-8">
                  <div className={`p-3 rounded-2xl ${stat.color} w-fit mb-4`}>
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">
                    {stat.label}
                  </p>
                  <p className="text-xl md:text-3xl font-normal font-headline tracking-[-0.05em]">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-full pl-11 pr-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {["all", "buyer", "seller", "admin"].map((role) => (
              <Button
                key={role}
                variant={roleFilter === role ? "default" : "outline"}
                size="sm"
                className={cn(
                  "rounded-full px-5 h-11 capitalize text-xs font-bold",
                  roleFilter === role
                    ? "bg-black text-white hover:bg-primary"
                    : "border-black/[0.06] dark:border-white/[0.06]",
                )}
                onClick={() => setRoleFilter(role)}
              >
                {role === "all" ? "All" : role}
              </Button>
            ))}
          </div>
        </div>

        {/* User List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[32px] border border-black/[0.02] bg-white dark:bg-white/[0.03] p-5 flex items-center gap-4"
              >
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3 rounded-full" />
                  <Skeleton className="h-3 w-1/2 rounded-full" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03] overflow-hidden">
            <CardContent className="p-0">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-20">
                  <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No users found
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                  {filteredUsers.map((u: any) => {
                    const isAdminUser = u.role === "admin";
                    const isSelf = u.id === user?.uid;
                    const profilePic =
                      u.profilePictureUrl ||
                      "https://i.pinimg.com/736x/d2/98/4e/d2984ec4b65a8568eab3dc2b640fc58e.jpg";
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-4 p-5 md:px-8 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors"
                      >
                        <div className="h-11 w-11 rounded-full overflow-hidden border border-black/[0.06] shrink-0">
                          <Image
                            src={profilePic}
                            alt={u.name || "User"}
                            width={44}
                            height={44}
                            className="object-cover h-full w-full"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {u.name || "Unnamed"}
                              {isSelf && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  (you)
                                </span>
                              )}
                            </p>
                            {isAdminUser && (
                              <Badge className="bg-primary/10 text-primary border-0 rounded-full text-[10px] px-2 py-0">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {u.email || "No email"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-3 py-1 text-[10px] font-bold capitalize hidden sm:inline-flex",
                            u.role === "seller"
                              ? "bg-green-50 text-green-600 border-green-200"
                              : u.role === "admin"
                                ? "bg-orange-50 text-orange-600 border-orange-200"
                                : "bg-blue-50 text-blue-600 border-blue-200",
                          )}
                        >
                          {u.role || "buyer"}
                        </Badge>
                        <p className="text-xs text-muted-foreground hidden md:block">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString()
                            : "—"}
                        </p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-full h-9 w-9 shrink-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 rounded-2xl p-1 shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-white/80 backdrop-blur-xl border-none"
                          >
                            <DropdownMenuItem
                              className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                              onClick={() => handleSendEmail(u.email)}
                            >
                              <Mail className="h-4 w-4" /> Send Email
                            </DropdownMenuItem>
                            {!isAdminUser && !isSelf && (
                              <DropdownMenuItem
                                className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                                onClick={() =>
                                  setRoleTarget({
                                    id: u.id,
                                    name: u.name || "this user",
                                    currentRole: u.role || "buyer",
                                  })
                                }
                              >
                                {u.role === "seller" ? (
                                  <>
                                    <ShieldOff className="h-4 w-4" /> Remove
                                    Seller Role
                                  </>
                                ) : (
                                  <>
                                    <Shield className="h-4 w-4" /> Make Seller
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            {!isSelf && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer text-red-600"
                                  onClick={() =>
                                    setDeleteTarget({
                                      id: u.id,
                                      name: u.name || "this user",
                                    })
                                  }
                                >
                                  <Trash2 className="h-4 w-4" /> Delete User
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={() => !isDeleting && setDeleteTarget(null)}
        >
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Delete User
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <strong>{deleteTarget?.name}</strong>? This action cannot be
                undone and will permanently remove their account and all related
                data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full" disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-full bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
                onClick={() =>
                  deleteTarget && handleDeleteUser(deleteTarget.id)
                }
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Role Change Confirmation Dialog */}
        <AlertDialog
          open={!!roleTarget}
          onOpenChange={() => setRoleTarget(null)}
        >
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Change User Role</AlertDialogTitle>
              <AlertDialogDescription>
                Change <strong>{roleTarget?.name}</strong>&apos;s role from{" "}
                <strong>{roleTarget?.currentRole}</strong> to{" "}
                <strong>
                  {roleTarget?.currentRole === "seller" ? "buyer" : "seller"}
                </strong>
                ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-full"
                onClick={() =>
                  roleTarget &&
                  handleToggleRole(roleTarget.id, roleTarget.currentRole)
                }
              >
                Change Role
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import AdminTopNav from "@/components/AdminTopNav";
import PageState from "@/components/PageState";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, error } = useAuth();

  useEffect(() => {
    if (!loading && !error && user?.role !== "admin") {
      router.replace(user?.role === "tenant" ? "/tenant/dashboard" : "/login");
    }
  }, [loading, error, router, user?.role]);

  if (error) return <PageState message={error} error />;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-500 text-sm">กำลังโหลดหน้าผู้ดูแล…</p>
      </div>
    );
  }

  if (user?.role !== "admin") return null;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 lg:h-screen lg:flex-row">
      {/* Sidebar */}
      <Sidebar pathname={pathname} />

      {/* Main Content */}
      <div className="flex min-w-0 flex-col flex-1 lg:overflow-hidden">
        <AdminTopNav />

        <main className="min-w-0 flex-1 p-3 sm:p-6 lg:overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

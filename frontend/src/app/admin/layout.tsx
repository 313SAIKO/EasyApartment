"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import AdminTopNav from "@/components/AdminTopNav";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user?.role !== "admin") {
      router.replace(user?.role === "tenant" ? "/tenant/dashboard" : "/login");
    }
  }, [loading, router, user?.role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-500 text-sm">Loading admin panel...</p>
      </div>
    );
  }

  if (user?.role !== "admin") return null;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar pathname={pathname} />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminTopNav user={user} />

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

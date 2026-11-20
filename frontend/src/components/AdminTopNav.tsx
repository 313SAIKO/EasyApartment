"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function AdminTopNav() {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-2 border-b bg-white px-4 py-3 sm:px-6">
      <span className="font-bold text-slate-800">
        EasyApartment <span className="text-sm font-normal">· ผู้ดูแล</span>
      </span>
      <nav
        aria-label="บัญชีผู้ดูแล"
        className="flex items-center gap-2 text-sm"
      >
        <Link
          className="rounded-lg px-3 py-2 hover:bg-slate-100"
          href="/admin/profile"
        >
          โปรไฟล์
        </Link>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await logout();
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-lg border px-3 py-2 disabled:opacity-50"
        >
          {busy ? "กำลังออก…" : "ออกจากระบบ"}
        </button>
      </nav>
    </header>
  );
}

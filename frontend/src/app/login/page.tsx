"use client"

import Image from "next/image"
import { useState, ChangeEvent, FormEvent } from "react"
import { signIn } from "@/lib/api";

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login"| "forgot">("login")
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e?: FormEvent) {
    if (e) e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await signIn(email, password);

      // ถ้า backend ส่ง error กลับมา
      if (data?.error) {
        setError(
          Array.isArray(data.error) ? data.error[0] : data.error
        );
        return;
      }

      // กันกรณี structure ไม่ถูกต้อง
      if (!data.user) {
        setError("Login response ไม่ถูกต้อง");
        return;
      }

      if (data.user.role === "admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/tenant/dashboard";
      }

    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally { setBusy(false); }
  }
  return (
      <div className="flex min-h-dvh bg-white">

        {/* LEFT SIDE */}
        <div className="w-full lg:w-1/2 min-h-dvh bg-slate-50 px-5 sm:px-12 py-8 flex flex-col">

          {/* Logo - อยู่บนสุด */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold overflow-hidden">
              <Image
                src="/gemini.png"
                alt="Logo"
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
            <span className="text-lg font-semibold">EasyApartment</span>
          </div>

          {/* MAIN CONTENT - ส่วนนี้จะดันให้เนื้อหาอยู่กึ่งกลางพอดี */}
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-md w-full">
              {/* LOGIN MODE */}
              {mode === "login" && (
                <div className="w-full transition-all text-center">
                  <h2 className="text-3xl font-bold mb-2">ยินดีต้อนรับ!</h2>
                  <p className="text-slate-500 mb-8 font-medium">
                    ป้อนข้อมูลประจำตัวของคุณเพื่อเข้าสู่ระบบ
                  </p>

                  <form className="space-y-5" onSubmit={handleLogin}>
                    <Input type="email" placeholder="Email" onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
                    <Input placeholder="Password" type="password" onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />
                    {error && (
                      <p role="alert" className="text-red-500 text-sm text-left -mt-2">
                        {error}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        ลืมรหัสผ่าน?
                      </button>
                    </div>

                    <button disabled={busy} className="w-full rounded-xl bg-blue-600 py-3 text-white disabled:opacity-50">{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
                  </form>
                </div>
              )}

              {/* FORGOT MODE */}
              {mode === "forgot" && (
                <div className="w-full transition-all">
                  <h2 className="text-3xl font-bold mb-2 text-center">ลืมรหัสผ่าน!</h2>
                  <p className="text-slate-600 mb-6 leading-relaxed">
                    หากคุณเป็นผู้เช่า ให้ติดต่อผู้ดูแลอพาร์ตเมนต์และแจ้งอีเมลที่ใช้สมัคร
                    หลังตรวจสอบตัวตน ผู้ดูแลจะสร้างรหัสผ่านชั่วคราวให้คุณ
                  </p>
                  <p className="text-sm text-slate-500 mb-6">
                    เข้าสู่ระบบด้วยรหัสผ่านชั่วคราว แล้วเปลี่ยนรหัสผ่านในหน้า “บัญชีของฉัน”
                    ระบบสาธิตนี้ไม่มีบริการส่งอีเมลรีเซ็ตอัตโนมัติ
                    หากเป็นบัญชีผู้ดูแล ให้ติดต่อผู้ดูแลระบบที่ติดตั้งโปรเจกต์
                  </p>

                  <div className="mt-6 text-sm text-center">
                    <button
                      onClick={() => setMode("login")}
                      className="text-blue-600 font-bold hover:underline "
                    >
                      กลับเข้าสู่ระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer - อยู่ล่างสุด */}
          <div className="text-xs text-slate-400 mt-8 pt-4 border-t border-slate-200">
            © 2026 EasyApartment • Property Management System
          </div>
        </div>

        {/* RIGHT SIDE IMAGE */}
        <div className="hidden lg:block w-1/2 min-h-dvh relative overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1920&auto=format&fit=crop"
            alt="Modern House"
            fill
            className="object-cover scale-105 hover:scale-100 transition-transform duration-700"
            priority
          />
          {/* Overlay จางๆ ให้ภาพดูหรูขึ้น */}
          <div className="absolute inset-0 bg-blue-900/10 shadow-inner"></div>
        </div>

      </div>
  )
}

/* Reusable Components */

function Input({ placeholder, type = "text", onChange }: { placeholder: string; type?: string; onChange?: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <input
      required
      aria-label={placeholder}
      autoComplete={type === "password" ? "current-password" : "username"}
      type={type}
      placeholder={placeholder}
      onChange={onChange}
      className="w-full rounded-xl border border-slate-200 px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
    />
  )
}

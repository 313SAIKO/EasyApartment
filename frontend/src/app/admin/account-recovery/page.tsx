"use client";

import { FormEvent, useState } from "react";
import axios from "axios";
import api from "@/lib/api";

export default function AccountRecoveryPage() {
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [resultEmail, setResultEmail] = useState("");
  const [error, setError] = useState("");

  async function reset(event: FormEvent) {
    event.preventDefault();
    if (!verified || busy) return;
    setBusy(true); setError(""); setPassword("");
    try {
      const { data } = await api.post<{ temporaryPassword: string }>("/users/admin/reset-tenant-password", { email: email.trim() });
      setPassword(data.temporaryPassword); setResultEmail(email.trim()); setVerified(false);
    } catch (failure) {
      setError(axios.isAxiosError(failure) && failure.response?.status === 404 ? "ไม่พบบัญชีผู้เช่าที่ใช้อีเมลนี้" : "รีเซ็ตรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally { setBusy(false); }
  }

  return <section className="mx-auto max-w-2xl space-y-5 p-6 text-slate-900">
    <h1 className="text-2xl font-bold">กู้บัญชีผู้เช่า</h1>
    <p className="text-slate-600">ใช้เมื่อผู้เช่าลืมรหัสผ่าน ตรวจสอบตัวตนผู้เช่าก่อนดำเนินการ ระบบจะยกเลิกการเข้าสู่ระบบเดิมทั้งหมด และสร้างรหัสผ่านชั่วคราวให้ส่งมอบแก่เจ้าของบัญชี</p>
    <form onSubmit={reset} className="space-y-4 rounded-xl border bg-white p-6">
      <label className="grid gap-2">อีเมลผู้เช่า<input type="email" required value={email} onChange={event => { setEmail(event.target.value); setVerified(false); setPassword(""); }} disabled={busy} className="rounded-lg border p-3" /></label>
      <label className="flex items-start gap-2"><input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} disabled={busy} className="mt-1" />ตรวจสอบแล้วว่าผู้ขอรีเซ็ตเป็นเจ้าของบัญชีนี้</label>
      <button disabled={!verified || busy} className="rounded-lg bg-slate-900 px-4 py-3 text-white disabled:opacity-50">{busy ? "กำลังรีเซ็ต…" : "สร้างรหัสผ่านชั่วคราว"}</button>
    </form>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {password && <div role="status" className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-6">
      <p>รีเซ็ตบัญชี {resultEmail} สำเร็จ</p>
      <label className="grid gap-2">รหัสผ่านชั่วคราว<input readOnly value={password} onFocus={event => event.target.select()} className="w-full rounded-lg border bg-white p-3 font-mono" /></label>
      <p>ส่งรหัสนี้ให้เจ้าของบัญชีโดยตรง และให้เปลี่ยนรหัสผ่านที่หน้า “บัญชีของฉัน” หลังเข้าสู่ระบบ รหัสนี้จะไม่ถูกเก็บในเบราว์เซอร์เมื่อออกจากหน้านี้</p>
      <button onClick={() => setPassword("")} className="underline">ซ่อนรหัสผ่าน</button>
    </div>}
  </section>;
}

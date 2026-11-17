"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type Report = {
  period: string;
  summary: { totalInvoices: number; paidInvoices: number; totalBilled: number; collected: number; outstanding: number };
  invoices: { id: string; roomNumber: string; tenant: string; amount: number; status: string }[];
};
const money = (value: number) => value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const statuses: Record<string, string> = { pending: "รอชำระ", paid_pending_review: "รอตรวจสอบ", paid: "ชำระแล้ว", rejected: "สลิปถูกปฏิเสธ", overdue: "เกินกำหนด" };

export default function ReportsPage() {
  const [period, setPeriod] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setReport(null);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      setError("กรุณาเลือกเดือนที่ต้องการดูรายงาน"); setLoading(false); return;
    }
    api.get<Report>("/dashboard-admin/reports", { params: { period } })
      .then(({ data }) => { if (active) setReport(data); })
      .catch(() => { if (active) setError("โหลดรายงานไม่สำเร็จ กรุณาลองอีกครั้ง"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period, reload]);

  function exportCsv() {
    if (!report) return;
    const cell = (value: string | number) => {
      const text = String(value);
      const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const rows = [["รอบบิล", "ห้อง", "ผู้เช่า", "ยอดเงิน", "สถานะ"], ...report.invoices.map(item =>
      [report.period, item.roomNumber, item.tenant, item.amount, statuses[item.status] ?? item.status])];
    const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `invoices-${report.period}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  return <section className="mx-auto max-w-6xl space-y-6 p-6 text-slate-900">
    <div><h1 className="text-2xl font-bold">รายงานใบแจ้งหนี้</h1>
      <p className="mt-2 text-slate-600">สรุปตามเดือนของรอบบิล ยอดรับชำระนับเฉพาะบิลที่ผู้ดูแลยืนยันแล้ว ไม่ใช่รายงานตามวันที่รับเงิน</p></div>
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid gap-2">รอบบิล<input type="month" value={period} onChange={event => setPeriod(event.target.value)} className="rounded-lg border bg-white p-2" /></label>
      <button onClick={() => setReload(value => value + 1)} disabled={loading} className="rounded-lg border px-4 py-2 disabled:opacity-50">โหลดใหม่</button>
      <button onClick={exportCsv} disabled={!report || loading} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">ดาวน์โหลด CSV</button>
    </div>
    {loading && <p role="status">กำลังโหลดรายงาน…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {report && !loading && <>
      <div className="grid gap-4 sm:grid-cols-3">
        {[["ยอดออกบิล", report.summary.totalBilled], ["ยอดรับชำระ", report.summary.collected], ["ยอดค้างชำระ", report.summary.outstanding]].map(([label, value]) =>
          <div key={label} className="rounded-xl border bg-white p-5"><p className="text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">฿{money(Number(value))}</p></div>)}
      </div>
      <p>ทั้งหมด {report.summary.totalInvoices} บิล · ชำระแล้ว {report.summary.paidInvoices} บิล</p>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left"><thead className="bg-slate-100"><tr>{["ห้อง", "ผู้เช่า", "ยอดเงิน (บาท)", "สถานะ"].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead>
          <tbody>{report.invoices.map(item => <tr key={item.id} className="border-t"><td className="p-4">{item.roomNumber}</td><td className="p-4">{item.tenant}</td><td className="p-4">{money(item.amount)}</td><td className="p-4">{statuses[item.status] ?? item.status}</td></tr>)}
            {!report.invoices.length && <tr><td colSpan={4} className="p-8 text-center text-slate-500">ไม่มีใบแจ้งหนี้ในเดือนนี้</td></tr>}</tbody>
        </table>
      </div>
    </>}
  </section>;
}

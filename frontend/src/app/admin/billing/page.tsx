"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageState from "@/components/PageState";
import { uiError } from "@/lib/ui-error";
import ModalAlert from "@/components/ModalAlert";

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  const currentRoom = contracts.find((c) => c.roomId?._id === selectedRoomId);

  // ----- DTO FIELDS (อ้างอิง create-invoice.dto ฝั่ง BE) -----

  const rent = Number(currentRoom?.roomId?.prices || 0);

  const [waterCurrent, setWaterCurrent] = useState<string>("");

  const [electricCurrent, setElectricCurrent] = useState<string>("");

  const [serviceFee, setServiceFee] = useState(0);

  const [billingPeriod, setBillingPeriod] = useState("");
  const [contractId, setContractId] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"success" | "error">("success");
  const [modalMessage, setModalMessage] = useState("");

  useEffect(() => {
    const fetchContracts: () => Promise<void> = async () => {
      try {
        const res = await api.get("/contracts");

        const activeContracts = res.data.filter(
          (c: any) => c.status === "active",
        );

        setContracts(activeContracts);

        if (activeContracts.length > 0) {
          setSelectedRoomId(activeContracts[0].roomId._id);
          setContractId(activeContracts[0]._id);
        }
      } catch (err) {
        setLoadError(uiError(err, "โหลดข้อมูลห้องไม่สำเร็จ"));
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  const previousWater = Number(
    currentRoom?.roomId?.lastMeterReading?.water || 0,
  );
  const waterUsedRaw = Number(waterCurrent || 0) - previousWater;
  const waterUsed = waterUsedRaw > 0 ? waterUsedRaw : 0;

  const previousElectric = Number(
    currentRoom?.roomId?.lastMeterReading?.electric || 0,
  );
  const electricUsedRaw = Number(electricCurrent || 0) - previousElectric;
  const electricUsed = electricUsedRaw > 0 ? electricUsedRaw : 0;

  const grandTotal =
    Number(rent) + Number(serviceFee) + waterUsed * 10 + electricUsed * 8;

  // ✅ แก้ไขส่วนนี้: ส่งเฉพาะฟิลด์ที่ Backend อนุญาต (ตัดฟิลด์ที่เกินออก)
  const handleCreateInvoice = async () => {
    if (saving) return;
    if (!contractId || !billingPeriod || !waterCurrent || !electricCurrent || Number(waterCurrent) < previousWater || Number(electricCurrent) < previousElectric || serviceFee < 0) {
      setModalType("error"); setModalMessage("กรุณาเลือกห้องและรอบบิล กรอกมิเตอร์ไม่น้อยกว่าครั้งก่อน และค่าบริการไม่ติดลบ"); setModalOpen(true); return;
    }
    setSaving(true);
    try {
      const payload = {
        contractId,
        billingPeriod,
        meters: {
          water: {
            current: Number(waterCurrent || 0),
          },
          electric: {
            current: Number(electricCurrent || 0),
          },
        },
        amounts: {
          rent: Number(rent),
          serviceFee: Number(serviceFee || 0),
          // ❌ ห้ามส่ง waterTotal, electricTotal, grandTotal มาที่นี่ เพราะ DTO ไม่รองรับ
        },
      };

      const res = await api.post("/invoices", payload);

      setContracts((items) => items.map((contract) => contract._id === contractId
        ? { ...contract, roomId: res.data.roomId } : contract));


      setModalType("success");
      setModalMessage("สร้างใบแจ้งหนี้สำเร็จ");
      setModalOpen(true);

      // reset meter inputs after success
      setWaterCurrent("");
      setElectricCurrent("");
      setServiceFee(0);
    } catch (error: any) {
      console.error("Create invoice failed:", error.response?.data || error);
      setModalType("error");
      setModalMessage(uiError(error, "สร้างใบแจ้งหนี้ไม่สำเร็จ"));
      setModalOpen(true);
    } finally { setSaving(false); }
  };

  if (loading) return <PageState message="กำลังโหลดข้อมูลห้อง..." />;
  if (loadError) return <PageState message={loadError} error />;
  if (!contracts.length) return <PageState message="ยังไม่มีห้องที่มีสัญญาใช้งาน กรุณาลงทะเบียนผู้เช่าและสร้างสัญญาก่อนออกใบแจ้งหนี้" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {/* ── Page Title ── */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-amber-600 uppercase mb-1">
            สร้างใบแจ้งหนี้
          </p>
          <h1 className="text-3xl font-bold text-gray-900">
            แจ้งค่าเช่า · ค่าน้ำ · ค่าไฟ
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            กรุณากรอกข้อมูลมิเตอร์และค่าใช้จ่าย เพื่อสร้างบิลสำหรับผู้เช่า
          </p>
        </div>

        {/* ── Card 1: ห้องและผู้เช่า ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 pt-5 pb-3 flex items-center gap-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-base">
              🏠
            </div>
            <span className="font-semibold text-gray-800 text-sm">
              ข้อมูลห้องและผู้เช่า
            </span>
          </div>
          <div className="p-6 space-y-5">
            {/* Room select */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                เลือกห้องที่มีผู้เช่าอยู่
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => {
                  const roomId = e.target.value;
                  setSelectedRoomId(roomId);
                  setWaterCurrent(""); setElectricCurrent("");
                  const found = contracts.find((c) => c.roomId._id === roomId);
                  if (found) setContractId(found._id);
                }}
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition"
              >
                {contracts.map((contract) => (
                  <option key={contract.roomId._id} value={contract.roomId._id}>
                    ห้อง {contract.roomId.roomNumber}
                  </option>
                ))}
              </select>
            </div>

            {/* Tenant info */}
            <div className="bg-gray-900 rounded-xl p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">ผู้เช่า</p>
                <p className="font-semibold text-white text-sm">
                  {currentRoom?.tenantId?.profile?.fullName || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">อีเมล</p>
                <p className="font-semibold text-white text-sm truncate">
                  {currentRoom?.tenantId?.email || "—"}
                </p>
              </div>
            </div>

            {/* Billing Period */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                รอบเก็บเงิน (Billing Period)
              </label>
              <input
                type="month"
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                ตัวอย่าง: 2026-02 (กุมภาพันธ์ 2026)
              </p>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
            ข้อมูลมิเตอร์
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* ── Card 2: มิเตอร์ ── */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Water */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💧</span>
                <span className="font-semibold text-blue-800 text-sm">
                  ค่าน้ำ
                </span>
              </div>
              <span className="text-xs bg-blue-700 text-white px-2.5 py-0.5 rounded-full font-mono">
                ฿10 / หน่วย
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-blue-400 mb-1.5">
                  เลขมิเตอร์ครั้งก่อน
                </label>
                <input
                  type="number"
                  value={currentRoom?.roomId?.lastMeterReading?.water || 0}
                  disabled
                  className="w-full p-3 rounded-xl border border-blue-100 bg-white text-gray-400 font-mono text-base font-semibold cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-blue-600 font-semibold mb-1.5">
                  เลขมิเตอร์ล่าสุด
                </label>
                <input
                  type="number"
                  value={waterCurrent}
                  onChange={(e) => {
                    setWaterCurrent(e.target.value);
                  }}
                  className="w-full p-3 rounded-xl border-2 border-blue-300 bg-white text-blue-900 font-mono text-base font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 flex justify-between items-center border border-blue-100">
              <span className="text-sm text-gray-500">จำนวนหน่วยที่ใช้</span>
              <span className="text-lg font-bold text-blue-700 font-mono">
                {waterUsed > 0 ? waterUsed : 0} หน่วย
              </span>
            </div>
          </div>

          {/* Electric */}
          <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <span className="font-semibold text-yellow-800 text-sm">
                  ค่าไฟ
                </span>
              </div>
              <span className="text-xs bg-yellow-500 text-white px-2.5 py-0.5 rounded-full font-mono">
                ฿8 / หน่วย
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-yellow-400 mb-1.5">
                  เลขมิเตอร์ครั้งก่อน
                </label>
                <input
                  type="number"
                  value={currentRoom?.roomId?.lastMeterReading?.electric || 0}
                  disabled
                  className="w-full p-3 rounded-xl border border-yellow-100 bg-white text-gray-400 font-mono text-base font-semibold cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-yellow-700 font-semibold mb-1.5">
                  เลขมิเตอร์ล่าสุด
                </label>
                <input
                  type="number"
                  value={electricCurrent}
                  onChange={(e) => {
                    setElectricCurrent(e.target.value);
                  }}
                  className="w-full p-3 rounded-xl border-2 border-yellow-300 bg-white text-yellow-900 font-mono text-base font-semibold focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 outline-none transition"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 flex justify-between items-center border border-yellow-100">
              <span className="text-sm text-gray-500">จำนวนหน่วยที่ใช้</span>
              <span className="text-lg font-bold text-yellow-600 font-mono">
                {electricUsed > 0 ? electricUsed : 0} หน่วย
              </span>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
            สรุปค่าใช้จ่าย
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* ── Card 3: ค่าใช้จ่าย ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 pt-5 pb-3 flex items-center gap-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-base">
              🧾
            </div>
            <span className="font-semibold text-gray-800 text-sm">
              รายการค่าใช้จ่าย
            </span>
          </div>

          <div className="px-6 pt-2 pb-6">
            {/* ค่าเช่า */}
            <div className="flex items-center justify-between py-3.5 border-b border-gray-50">
              <span className="text-sm text-gray-600">🏠 ค่าเช่าห้อง</span>
              <div className="text-right">
                <input
                  type="number"
                  value={rent}
                  disabled
                  className="text-right w-28 font-mono font-semibold text-sm text-gray-400 bg-transparent outline-none cursor-not-allowed"
                />
                <span className="text-xs text-gray-300 ml-0.5">บาท</span>
              </div>
            </div>

            {/* ค่าบริการ */}
            <div className="flex items-center justify-between py-3.5 border-b border-gray-50">
              <span className="text-sm text-gray-600">🔧 ค่าบริการอื่น ๆ</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={serviceFee}
                  onChange={(e) => setServiceFee(Number(e.target.value))}
                  className="text-right w-28 font-mono font-semibold text-sm text-gray-800 bg-transparent border-b-2 border-gray-200 focus:border-gray-900 outline-none transition"
                />
                <span className="text-xs text-gray-400">บาท</span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="bg-gray-900 rounded-xl p-5 flex flex-wrap gap-3 items-center justify-between mt-5">
              <div>
                <p className="text-xs text-gray-400">ยอดรวมทั้งหมด</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {billingPeriod
                    ? new Date(billingPeriod + "-01").toLocaleDateString(
                        "th-TH",
                        {
                          month: "long",
                          year: "numeric",
                        },
                      )
                    : "กรุณาเลือกรอบบิล"}
                </p>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-sm text-yellow-500 font-mono mb-1">
                  ฿
                </span>
                <span className="text-4xl font-bold text-yellow-400 font-mono tracking-tight leading-none">
                  {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Submit ── */}
        <button
          disabled={saving}
          onClick={handleCreateInvoice}
          className="w-full bg-gray-900 hover:bg-gray-700 active:scale-[0.99] text-white py-4 rounded-2xl font-semibold text-base tracking-wide transition-all duration-150 shadow-lg shadow-gray-900/20"
        >
          {saving ? "กำลังสร้างใบแจ้งหนี้..." : "สร้างใบแจ้งหนี้"}
        </button>
      </div>
      <ModalAlert
        open={modalOpen}
        type={modalType}
        message={modalMessage}
        duration={5000}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

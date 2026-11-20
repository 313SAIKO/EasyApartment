import axios from "axios";
const messages: Record<string, string> = {
  "Incorrect password": "รหัสผ่านปัจจุบันไม่ถูกต้อง",
  "Email already exists": "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาใช้อีเมลอื่น",
  "No active room for tenant":
    "ยังไม่มีห้องพักที่มีสัญญาใช้งาน กรุณาติดต่อผู้ดูแล",
  "Active contract required": "ต้องมีสัญญาที่ใช้งานอยู่ก่อนออกใบแจ้งหนี้",
  "End date must not precede start date":
    "วันสิ้นสุดสัญญาต้องไม่ก่อนวันเริ่มสัญญา",
  "Meter cannot decrease": "เลขมิเตอร์ล่าสุดต้องไม่น้อยกว่าครั้งก่อน",
  "Invoice cannot accept a payment":
    "ใบแจ้งหนี้นี้รับสลิปไม่ได้แล้ว กรุณาโหลดข้อมูลใหม่",
  "Invoice changed; reload and retry":
    "สถานะใบแจ้งหนี้เปลี่ยนแล้ว กรุณาโหลดข้อมูลใหม่",
  "Invoice is not awaiting review":
    "ใบแจ้งหนี้นี้ไม่ได้อยู่ในสถานะรอตรวจสอบ กรุณาโหลดข้อมูลใหม่",
  "Only unpaid invoices without payment evidence can be deleted":
    "ลบได้เฉพาะบิลที่ยังไม่ชำระและไม่มีหลักฐานการชำระเงิน",
  "Delete the latest room invoice first to preserve meter readings":
    "กรุณาลบบิลล่าสุดของห้องก่อน เพื่อให้เลขมิเตอร์ถูกต้อง",
  "Room meter readings have changed":
    "เลขมิเตอร์ของห้องเปลี่ยนแล้ว กรุณาโหลดข้อมูลใหม่",
  "A record with these values already exists":
    "ข้อมูลนี้มีอยู่แล้ว กรุณาตรวจสอบก่อนบันทึกซ้ำ",
  "Only image files are allowed": "กรุณาเลือกไฟล์รูปภาพ",
  "File size must not exceed 5MB": "ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5 MB",
};
export function uiError(
  error: unknown,
  fallback = "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง",
) {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response)
    return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่";
  const message = error.response.data?.message;
  if (typeof message === "string" && messages[message])
    return messages[message];
  const status = error.response.status;
  if (status === 401) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
  if (status === 403) return "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ";
  if (status === 404) return "ไม่พบข้อมูล หรือข้อมูลนี้ไม่อยู่ในบัญชีของคุณ";
  if (status === 429) return "ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  if (status === 503)
    return "บริการยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลหรือลองใหม่ภายหลัง";
  if (status >= 500) return "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่ภายหลัง";
  return typeof message === "string"
    ? message
    : Array.isArray(message)
      ? message.join(" · ")
      : fallback;
}

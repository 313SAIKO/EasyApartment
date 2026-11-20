import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg space-y-4 p-8 text-center">
      <h1 className="text-2xl font-bold">ไม่พบหน้าที่ต้องการ</h1>
      <p>ลิงก์อาจไม่ถูกต้องหรือหน้านี้ถูกย้ายแล้ว</p>
      <Link
        href="/"
        className="inline-block rounded-lg bg-blue-600 px-5 py-3 text-white"
      >
        กลับหน้าหลัก EasyApartment
      </Link>
    </main>
  );
}

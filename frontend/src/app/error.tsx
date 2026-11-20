"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main role="alert" className="mx-auto max-w-lg space-y-4 p-8 text-center">
      <h1 className="text-2xl font-bold">เปิดหน้านี้ไม่สำเร็จ</h1>
      <p>กรุณาลองใหม่ หากยังพบปัญหาให้กลับเข้าสู่ระบบอีกครั้ง</p>
      <button
        onClick={reset}
        className="rounded-lg bg-blue-600 px-5 py-3 text-white"
      >
        ลองใหม่
      </button>
      <a href="/login" className="block underline">
        กลับเข้าสู่ระบบ
      </a>
    </main>
  );
}

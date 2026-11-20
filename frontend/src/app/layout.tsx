import type { Metadata } from "next";
export const metadata: Metadata = { title: "EasyApartment", description: "ระบบจัดการอพาร์ตเมนต์สำหรับผู้ดูแลและผู้เช่า" };
import "../styles/globals.css"
import { AuthProvider } from "@/context/AuthContext"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ย้ายคอมเมนต์มาไว้ตรงนี้แทนครับ
  return (
    <html lang="th" data-theme="light" style={{ colorScheme: 'light' }}>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
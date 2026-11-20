"use client"


import Link from 'next/link'

import { Home, Calendar, FileText, Wrench, BarChart2, Receipt, UserPlus, CreditCard, DollarSign } from 'lucide-react'


const items = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/Contracts', label: 'Contracts', icon: Calendar },
  { href: '/admin/Invoices', label: 'Invoices', icon: FileText },
  { href: '/admin/Register', label: 'ลงทะเบียนผู้เช่า', icon: UserPlus},
  { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard },
  { href: '/admin/reports', label: 'Reports', icon: BarChart2 },
  { href: '/admin/account-recovery', label: 'กู้บัญชีผู้เช่า', icon: UserPlus },
]

interface SidebarProps {
  pathname: string;
}

export default function Sidebar({ pathname }: SidebarProps) {

  return (
    <aside className="w-full bg-slate-900 text-slate-100 flex flex-col p-3 lg:w-60 lg:h-full lg:p-6 shrink-0">
      <div className="hidden lg:block mb-8">
        <div className="text-white text-2xl font-extrabold">EasyApartment</div>
        <div className="text-sm text-slate-400 mt-1">Admin</div>
      </div>

      <p className="mb-1 text-right text-xs text-slate-300 lg:hidden">เลื่อนเพื่อดูเมนูทั้งหมด →</p>
      <nav aria-label="เมนูผู้ดูแล" className="flex gap-1 overflow-x-auto lg:flex-1 lg:block lg:space-y-1">
        {items.map((it) => {
          const Icon = it.icon
          
          // --- Logic Fix: Dashboard จะ active เฉพาะตอนอยู่หน้า /admin เท่านั้น ---
          const active = it.href === '/admin' 
            ? pathname === '/admin' 
            : pathname === it.href || pathname?.startsWith(it.href + '/')
          
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 px-3 py-3 rounded-md transition-all duration-200 ${
                active 
                ? 'bg-slate-800 border-l-4 border-blue-500 text-white' 
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{it.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="hidden lg:block mt-6 text-xs text-slate-400">
        © 2026 EasyApartment
      </div>
    </aside>
  )
}

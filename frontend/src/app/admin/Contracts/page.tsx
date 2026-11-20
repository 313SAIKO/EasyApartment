"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getAllContracts,
  deleteContract,
} from "@/services/contracts.service"
import PageState from "@/components/PageState"
import { uiError } from "@/lib/ui-error"
import ModalAlert from "@/components/ModalAlert"

export default function ContractsPage() {
  const router = useRouter()

  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertType, setAlertType] = useState<"success" | "error" | "info">("info")
  const [alertMessage, setAlertMessage] = useState("")
  const [alertConfirmAction, setAlertConfirmAction] = useState<(() => void) | undefined>(undefined)

  const fetchContracts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllContracts()
      setContracts(data)
    } catch (err: any) {
      console.error(err)
      setError(uiError(err, "โหลดสัญญาไม่สำเร็จ"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContracts()
  }, [])

  const handleView = (id: string) => {
    router.push(`/admin/Contracts/${id}`)
  }

  const handleEdit = (id: string) => {
    router.push(`/admin/Contracts/${id}?edit=true`)
  }

  const handleDelete = (id: string) => {
    setAlertType("info")
    setAlertMessage("ต้องการยกเลิกสัญญานี้หรือไม่?")
    setAlertConfirmAction(() => async () => {
      try {
        await deleteContract(id)
        await fetchContracts()
        setAlertType("success")
        setAlertMessage("ยกเลิกสัญญาสำเร็จ")
        setAlertConfirmAction(undefined)
      } catch (err) {
        console.error("Delete failed", err)
        setAlertType("error")
        setAlertMessage(uiError(err, "ยกเลิกสัญญาไม่สำเร็จ"))
        setAlertConfirmAction(undefined)
      }
    })
    setAlertOpen(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap gap-3 justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">จัดการสัญญา</h1>
          <button
            onClick={() => router.push("/admin/Register")}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition"
          >
            + สร้างสัญญา
          </button>
        </div>

        {loading && (
          <div className="text-center py-10 font-semibold">กำลังโหลดสัญญา...</div>
        )}

        {error && (
          <PageState message={error} error retry={fetchContracts} />
        )}

        {!loading && !error && (
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto border">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-100 text-slate-600 text-sm uppercase">
                <tr>
                  <th className="px-6 py-4">Room</th>
                  <th className="px-6 py-4">Tenant</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Start Date</th>
                  <th className="px-6 py-4">End Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">ยังไม่มีสัญญา เริ่มต้นด้วยการสร้างสัญญาและลงทะเบียนผู้เช่า</td></tr>}
                {contracts.map((contract) => (
                  <tr
                    key={contract._id}
                    className="border-t hover:bg-slate-50 transition"
                  >
                    <td className="px-6 py-4 font-medium">
                      {contract?.roomId?.roomNumber || "-"}
                    </td>
                    <td className="px-6 py-4">
                      {contract?.tenantId?.profile?.fullName || "-"}
                    </td>
                    <td className="px-6 py-4 capitalize">
                      {contract.type}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(contract.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(contract.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-200">
                        {contract.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <button
                        onClick={() => handleView(contract._id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-500"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(contract._id)}
                        className="px-3 py-1 text-sm bg-yellow-500 text-white rounded-md hover:bg-yellow-400"
                      >
                        Edit
                      </button>
                      <button
                        disabled={contract.status === "cancelled"}
                        onClick={() => handleDelete(contract._id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-500"
                      >
                        ยกเลิกสัญญา
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ModalAlert
        open={alertOpen}
        type={alertType}
        message={alertMessage}
        onClose={() => {
          setAlertOpen(false)
          setAlertConfirmAction(undefined)
        }}
        onConfirm={alertConfirmAction}
      />
    </div>
  )
}
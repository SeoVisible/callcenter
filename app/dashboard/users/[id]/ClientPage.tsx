"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { InvoiceList } from "@/components/invoice-list"
import { userService } from "@/lib/users"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function ClientPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; name?: string; role?: string } | null>(null)
  useEffect(() => {
    let mounted = true
    userService.getAllUsers().then((users) => {
      const u = users.find((x) => x.id === id)
      if (mounted) setUser(u ?? null)
    })
    return () => { mounted = false }
  }, [id])

  if (!user) return <div className="p-4">Loading user...</div>

  const handleSectionChange = (section: string) => {
    // Map section ids to dashboard routes
    switch (section) {
      case 'dashboard':
        router.push('/dashboard')
        break
      case 'users':
        router.push('/dashboard/users')
        break
      case 'products':
        router.push('/dashboard/products')
        break
      case 'clients':
        router.push('/dashboard/clients')
        break
      case 'invoices':
        router.push('/dashboard/invoices')
        break
      default:
        router.push('/dashboard')
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout activeSection="invoices" onSectionChange={handleSectionChange}>
        <div className="p-4">
          <h1 className="text-xl font-bold">Invoices by {user.name}</h1>
          <InvoiceList initialFilterUserId={id} onAddInvoice={() => {}} onEditInvoice={() => {}} onViewInvoice={() => {}} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from 'next/navigation'
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { UserList } from "@/components/user-list"
import { UserForm } from "@/components/user-form"
import { ProductList } from "@/components/product-list"
import { ProductForm } from "@/components/product-form"
import { ClientList } from "@/components/client-list"
import { ClientForm } from "@/components/client-form"
import { InvoiceList } from "@/components/invoice-list"
import { InvoiceForm } from "@/components/invoice-form"
import { InvoiceView } from "@/components/invoice-view"
import { invoiceService } from "@/lib/invoices"

import { DashboardHome } from "@/components/dashboard-home"
import dynamic from 'next/dynamic'
import { useAuth } from "@/contexts/auth-context"
import type { User } from "@/lib/auth"
import type { Product } from "@/lib/products"
import type { Client } from "@/lib/clients"
import type { Invoice } from "@/lib/invoices"
// Icons imported previously but unused in this file were removed to satisfy lint

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const paramFilterUserId = searchParams?.get('filterUserId') ?? undefined
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState<string>(paramFilterUserId ? "invoices" : "dashboard")
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>()
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>()
  const [showStatsProductId, setShowStatsProductId] = useState<string | undefined>()
  const [showClientForm, setShowClientForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | undefined>()
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>()
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | undefined>()

  // User management handlers
  const handleAddUser = () => {
    setEditingUser(undefined)
    setShowUserForm(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setShowUserForm(true)
  }

  const handleUserFormSuccess = () => {
    setShowUserForm(false)
    setEditingUser(undefined)
  }

  const handleUserFormCancel = () => {
    setShowUserForm(false)
    setEditingUser(undefined)
  }

  // Product management handlers
  const handleAddProduct = () => {
    setEditingProduct(undefined)
    setShowProductForm(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setShowProductForm(true)
  }

  const handleProductFormSuccess = () => {
    setShowProductForm(false)
    setEditingProduct(undefined)
  }

  const handleProductFormCancel = () => {
    setShowProductForm(false)
    setEditingProduct(undefined)
  }

  const handleShowProductStats = (id: string) => {
    if (user?.role !== 'superadmin') return
    setShowStatsProductId(id)
    // ensure product form isn't visible
    setShowProductForm(false)
    setEditingProduct(undefined)
  }

  const handleCloseProductStats = () => setShowStatsProductId(undefined)

  // Client management handlers
  const handleAddClient = () => {
    setEditingClient(undefined)
    setShowClientForm(true)
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setShowClientForm(true)
  }

  const handleClientFormSuccess = () => {
    setShowClientForm(false)
    setEditingClient(undefined)
  }

  const handleClientFormCancel = () => {
    setShowClientForm(false)
    setEditingClient(undefined)
  }

  // Invoice management handlers
  const handleAddInvoice = () => {
    setEditingInvoice(undefined)
    setViewingInvoice(undefined)
    setShowInvoiceForm(true)
  }

  const handleEditInvoice = async (invoice: Invoice) => {
    // Ensure we have the most recent/full invoice payload (line items, dates)
    try {
      const full = await invoiceService.getInvoiceById(invoice.id)
      if (full) {
        setEditingInvoice(full)
      } else {
        setEditingInvoice(invoice)
      }
    } catch (e) {
      // fallback to provided invoice
      setEditingInvoice(invoice)
    }
    setViewingInvoice(undefined)
    setShowInvoiceForm(true)
  }

  const handleViewInvoice = (invoice: Invoice) => {
    setActiveSection("invoices")
    setViewingInvoice(invoice)
    setShowInvoiceForm(false)
    setEditingInvoice(undefined)
  }

  const handleInvoiceFormSuccess = () => {
    setShowInvoiceForm(false)
    setEditingInvoice(undefined)
    setViewingInvoice(undefined)
  }

  const handleInvoiceFormCancel = () => {
    setShowInvoiceForm(false)
    setEditingInvoice(undefined)
  }

  const handleInvoiceViewBack = () => {
    setViewingInvoice(undefined)
  }

  const handleInvoiceViewEdit = async () => {
    if (!viewingInvoice) return
    try {
      const full = await invoiceService.getInvoiceById(viewingInvoice.id)
      if (full) setEditingInvoice(full)
      else setEditingInvoice(viewingInvoice)
    } catch (e) {
      setEditingInvoice(viewingInvoice)
    }
    setShowInvoiceForm(true)
    setViewingInvoice(undefined)
  }

  const renderContent = () => {
    // User Management (Superadmin only)
    if (activeSection === "users" && user?.role === "superadmin") {
      if (showUserForm) {
        return <UserForm user={editingUser} onSuccess={handleUserFormSuccess} onCancel={handleUserFormCancel} />
      }
      return <UserList onAddUser={handleAddUser} onEditUser={handleEditUser} />
    }

    // Product Management
    if (activeSection === "products") {
      if (showProductForm) {
        return (
          <ProductForm
            product={editingProduct}
            onSuccess={handleProductFormSuccess}
            onCancel={handleProductFormCancel}
          />
        )
      }
      if (showStatsProductId) {
        // render stats panel inline via dynamic import (avoid require())
        const ProductStatsPanel = dynamic(() => import('@/components/product-stats-panel').then(m => m.ProductStatsPanel), { ssr: false })
        return <ProductStatsPanel id={showStatsProductId} onClose={handleCloseProductStats} />
      }
      return <ProductList onAddProduct={handleAddProduct} onEditProduct={handleEditProduct} onShowStats={handleShowProductStats} />
    }

    // Client Management
    if (activeSection === "clients") {
      if (showClientForm) {
        return (
          <ClientForm
            client={editingClient}
            onSuccess={handleClientFormSuccess}
            onCancel={handleClientFormCancel}
            onViewInvoice={handleViewInvoice}
          />
        )
      }
      return <ClientList onAddClient={handleAddClient} onEditClient={handleEditClient} />
    }

    // Invoice Management
  if (activeSection === "invoices") {
      if (viewingInvoice) {
        return <InvoiceView invoice={viewingInvoice} onBack={handleInvoiceViewBack} onEdit={handleInvoiceViewEdit} />
      }
      if (showInvoiceForm) {
        return (
          <InvoiceForm
            invoice={editingInvoice}
            onSuccess={handleInvoiceFormSuccess}
            onCancel={handleInvoiceFormCancel}
          />
        )
      }
      return (
        <InvoiceList
          onAddInvoice={handleAddInvoice}
          onEditInvoice={handleEditInvoice}
          onViewInvoice={handleViewInvoice}
          initialFilterUserId={paramFilterUserId}
        />
      )
    }

    // Default dashboard view: show DashboardHome (graphs/statistics)
    // Prevent non-superadmin users from seeing DashboardHome: show Clients instead.
      if (activeSection === "dashboard") {
      // Always show the DashboardHome but let it decide whether to display
      // full statistics or a lightweight quick-links view based on role.
      if (showClientForm) {
        return (
          <ClientForm
            client={editingClient}
            onSuccess={handleClientFormSuccess}
            onCancel={handleClientFormCancel}
            onViewInvoice={handleViewInvoice}
          />
        )
      }
      return (
        <DashboardHome showStats={user?.role === 'superadmin'} onNavigate={setActiveSection} />
      )
    }
  }

  // If the URL contains a filterUserId param (e.g. via /dashboard?filterUserId=...),
  // ensure the invoices tab is selected when the param appears or changes.
  useEffect(() => {
    if (paramFilterUserId) setActiveSection("invoices")
  }, [paramFilterUserId])

  // Note: don't force non-superadmin users away from the dashboard anymore.
  // DashboardHome will render a compact quick-links view when `showStats` is false.

  return (
    <ProtectedRoute>
      <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
        {renderContent()}
      </DashboardLayout>
    </ProtectedRoute>
  )
}

"use client"

import { useState } from "react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHome } from "@/components/dashboard-home"
import { useAuth } from "@/contexts/auth-context"
import type { User } from "@/lib/auth"
import type { Product } from "@/lib/products"
import type { Client } from "@/lib/clients"
import type { Invoice } from "@/lib/invoices"
// Icons imported previously but unused in this file were removed to satisfy lint

export default function DashboardPage() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState("dashboard")
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>()
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>()
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

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice)
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

  const handleInvoiceViewEdit = () => {
    if (viewingInvoice) {
      setEditingInvoice(viewingInvoice)
      setShowInvoiceForm(true)
      setViewingInvoice(undefined)
    }
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
      return <ProductList onAddProduct={handleAddProduct} onEditProduct={handleEditProduct} />
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
        />
      )
    }

    // Default dashboard view: show DashboardHome (graphs/statistics)
    return <DashboardHome />
  }

  return (
    <ProtectedRoute>
      <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
        {renderContent()}
      </DashboardLayout>
    </ProtectedRoute>
  )
}

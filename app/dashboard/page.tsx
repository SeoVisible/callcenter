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
import { useAuth } from "@/contexts/auth-context"
import type { User } from "@/lib/auth"
import type { Product } from "@/lib/products"
import type { Client } from "@/lib/clients"
import type { Invoice } from "@/lib/invoices"
import { Users, Package, FileText, UserCheck } from "lucide-react"

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

    // Default dashboard view
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground mt-2">Here&apos;s an overview of your system access and capabilities.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {user?.role === "superadmin" && (
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveSection("users")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Management</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Full Access</div>
                <p className="text-xs text-muted-foreground">Manage all users and roles</p>
              </CardContent>
            </Card>
          )}

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveSection("products")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user?.role === "superadmin" ? "Full Access" : "Limited Access"}</div>
              <p className="text-xs text-muted-foreground">
                {user?.role === "superadmin" ? "Add, edit, delete all products" : "Add products for your clients"}
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveSection("clients")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clients</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Full Access</div>
              <p className="text-xs text-muted-foreground">View, add, edit, delete clients</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveSection("invoices")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Full Access</div>
              <p className="text-xs text-muted-foreground">View, create, send, edit invoices</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Add New Client</h3>
                <p className="text-sm text-muted-foreground mb-3">Create a new client profile</p>
                <button className="text-sm text-primary hover:underline" onClick={() => setActiveSection("clients")}>
                  Get Started →
                </button>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Create Invoice</h3>
                <p className="text-sm text-muted-foreground mb-3">Generate a new invoice</p>
                <button className="text-sm text-primary hover:underline" onClick={() => setActiveSection("invoices")}>
                  Get Started →
                </button>
              </div>
              {user?.role === "superadmin" && (
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Manage Users</h3>
                  <p className="text-sm text-muted-foreground mb-3">Add or edit user accounts</p>
                  <button className="text-sm text-primary hover:underline" onClick={() => setActiveSection("users")}>
                    Get Started →
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
        {renderContent()}
      </DashboardLayout>
    </ProtectedRoute>
  )
}

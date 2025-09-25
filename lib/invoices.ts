export interface InvoiceLineItem {
  id: string
  productId: string
  productName: string
  description: string
  quantity: number
  unitPrice: number
  total: number


}


export interface Invoice {
  id: string
  invoiceNumber: string
  clientId: string
  clientName: string
  clientEmail: string
  clientCompany: string
  status: "pending" | "maker" | "sent" | "paid" | "not_paid" | "completed"
  issueDate: string
  dueDate: string
  lineItems: InvoiceLineItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  notes: string
  createdBy: string
  createdAt: string
  updatedAt: string
  sentAt?: string
  paidAt?: string
  userName?: string
  userEmail?: string
}

export interface CreateInvoiceData {
  clientId: string
  dueDate: string
  lineItems: Omit<InvoiceLineItem, "id" | "total">[]
  taxRate: number
  notes: string
  createdBy: string
}

export interface UpdateInvoiceData {
  clientId?: string
  dueDate?: string
  lineItems?: Omit<InvoiceLineItem, "id" | "total">[]
  taxRate?: number
  notes?: string
  status?: Invoice["status"]
}

class InvoiceService {
  async getAllInvoices(userId?: string, userRole?: string): Promise<Invoice[]> {
    let url = "/api/invoices"
    if (userId && userRole) {
      url += `?userId=${encodeURIComponent(userId)}&userRole=${encodeURIComponent(userRole)}`
    }
    const res = await fetch(url, { credentials: "include" })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to fetch invoices")
    }
    return res.json()
  }

  async getInvoiceById(id: string): Promise<Invoice | null> {
    const res = await fetch(`/api/invoices/${id}`, { credentials: "include" })
    if (!res.ok) return null
    return res.json()
  }

  async createInvoice(invoiceData: CreateInvoiceData): Promise<Invoice> {
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoiceData),
      credentials: "include",
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to create invoice")
    }
    return res.json()
  }

  async updateInvoice(id: string, invoiceData: UpdateInvoiceData): Promise<Invoice> {
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoiceData),
      credentials: "include",
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to update invoice")
    }
    return res.json()
  }

  async deleteInvoice(id: string): Promise<void> {
    const res = await fetch(`/api/invoices/${id}`, {
      method: "DELETE",
      credentials: "include",
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to delete invoice")
    }
  }

  async sendInvoice(id: string): Promise<{ previewUrl?: string }> {
    const res = await fetch(`/api/invoices/${id}/send`, {
      method: "POST",
      credentials: "include",
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to send invoice email")
    }
    return res.json()
  }

  // Optionally, implement markAsPaid with API endpoints if needed
}

export const invoiceService = new InvoiceService()


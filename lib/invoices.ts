export interface InvoiceLineItem {
  id: string
  productId: string | null
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
  async getAllInvoices(userId?: string, userRole?: string, status?: string, sortBy?: string, sortDir?: string, clientId?: string, filterUserId?: string): Promise<Invoice[]> {
    const buildUrl = (userId?: string, userRole?: string, status?: string, sortBy?: string, sortDir?: string, clientId?: string, filterUserId?: string) => {
      let url = "/api/invoices"
      const params: string[] = []
      // userId/userRole refer to the caller (auth) context used to restrict results server-side
      if (userId && userRole) {
        params.push(`userId=${encodeURIComponent(userId)}`)
        params.push(`userRole=${encodeURIComponent(userRole)}`)
      }
      // filterUserId is an explicit filter to fetch invoices for a specific user (superadmin can use it)
      if (filterUserId) params.push(`filterUserId=${encodeURIComponent(filterUserId)}`)
      if (status) params.push(`status=${encodeURIComponent(status)}`)
      if (clientId) params.push(`clientId=${encodeURIComponent(clientId)}`)
      if (sortBy) params.push(`sortBy=${encodeURIComponent(sortBy)}`)
      if (sortDir) params.push(`sortDir=${encodeURIComponent(sortDir)}`)
      if (params.length) url += `?${params.join('&')}`
      return url
    }
    const url = buildUrl(userId, userRole, status, sortBy, sortDir, clientId, filterUserId)
    const res = await fetch(url, { credentials: "include" })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to fetch invoices")
    }
    return res.json()
  }

  async getInvoiceById(id: string): Promise<Invoice | null> {
    // First try the dedicated endpoint (may not be implemented in all deployments)
    try {
      const res = await fetch(`/api/invoices/${id}`, { credentials: "include" })
      if (res.ok) return res.json()
    } catch {
      // ignore and fall back to list search
    }

    // Fallback: fetch the invoices list and find the invoice by id
    try {
      const listRes = await fetch(`/api/invoices`, { credentials: "include" })
      if (!listRes.ok) return null
      const all: Invoice[] = await listRes.json()
      return all.find((inv) => inv.id === id) ?? null
    } catch {
      return null
    }
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

  async sendInvoice(id: string): Promise<{ previewUrl?: string; success?: boolean; error?: string; messageId?: string; accepted?: string[]; rejected?: string[]; response?: string }> {
    const res = await fetch(`/api/invoices/${id}/send`, {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "include",
    })
    if (!res.ok) {
      const contentType = res.headers.get('content-type') || ''
      let message = `Failed to send invoice email (HTTP ${res.status})`
      try {
        if (contentType.includes('application/json')) {
          const data = await res.json()
          const base = data?.error || message
          // Surface structured diagnostics when available
          const parts: string[] = []
          if (data?.code) parts.push(`code=${String(data.code)}`)
          if (data?.stage) parts.push(`stage=${String(data.stage)}`)
          if (data?.message && data.message !== data.error) parts.push(`message=${String(data.message)}`)
          if (data?.cause) parts.push(`cause=${String(data.cause)}`)
          if (data?.details && data.details !== data.error) parts.push(`details=${String(data.details)}`)
          // SMTP diagnostics
          if (typeof data?.host !== 'undefined') parts.push(`host=${String(data.host)}`)
          if (typeof data?.port !== 'undefined') parts.push(`port=${String(data.port)}`)
          if (typeof data?.secure !== 'undefined') parts.push(`secure=${String(data.secure)}`)
          message = parts.length ? `${base} — ${parts.join(', ')}` : base
        } else {
          const text = await res.text()
          // Include a short snippet of any HTML/text response
          const snippet = text.slice(0, 200)
          message = `${message}: ${snippet}`
        }
      } catch {
        // ignore parse errors and keep default message
      }
      throw new Error(message)
    }
    try {
      return await res.json()
    } catch {
      // In case server returns empty body
      return { success: true }
    }
  }

  // Optionally, implement markAsPaid with API endpoints if needed
}

export const invoiceService = new InvoiceService()


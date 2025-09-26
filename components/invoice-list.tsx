"use client"

import { useState, useEffect } from "react"
import type { Invoice } from "@/lib/invoices"
import { formatStatusLabel } from '@/lib/status'
import { invoiceService } from "@/lib/invoices"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu"
import { Plus, Edit, Trash2, Loader2, MoreHorizontal, Send, Eye, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { clientService } from "@/lib/clients"
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency'
import { userService } from "@/lib/users"

type InvoiceStatus = "pending" | "maker" | "sent" | "paid" | "not_paid" | "completed" | undefined
const toInvoiceStatus = (s: unknown): InvoiceStatus => {
  const v = String(s)
  if (["pending","maker","sent","paid","not_paid","completed"].includes(v)) return v as InvoiceStatus
  return undefined
}

interface InvoiceListProps {
  onAddInvoice: () => void
  onEditInvoice: (invoice: Invoice) => void
  onViewInvoice: (invoice: Invoice) => void
  // optional pre-filter to show invoices for a specific user (used by per-user page)
  initialFilterUserId?: string
}

export function InvoiceList({ onAddInvoice, onEditInvoice, onViewInvoice, initialFilterUserId }: InvoiceListProps) {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | "">("")
  const [filterClient, setFilterClient] = useState<string | "">("")
  const [filterUser, setFilterUser] = useState<string | "">("")
  const [clients, setClients] = useState<Array<{id:string,name:string}>>([])
  const [users, setUsers] = useState<Array<{id:string,name:string}>>([])
  const [deleteInvoice, setDeleteInvoice] = useState<Invoice | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

  const loadInvoices = async (opts?: { status?: string, sortBy?: string, sortDir?: string, clientId?: string, filterUserId?: string }) => {
    try {
      // If this is the initial load (loading flag), keep that behavior. Otherwise show tableLoading.
      if (!loading) setTableLoading(true)
      // prefer explicit opts -> component state -> initialFilterUserId
      const statusParam = opts?.status ?? (filterStatus ? String(filterStatus) : undefined)
      const clientParam = opts?.clientId ?? (filterClient ? String(filterClient) : undefined)
      const filterUserId = opts?.filterUserId ?? (filterUser ? String(filterUser) : initialFilterUserId)
      const data = await invoiceService.getAllInvoices(user?.id, user?.role, statusParam, opts?.sortBy, opts?.sortDir, clientParam, filterUserId)
      setInvoices(data)
    } catch {
      // Log to console to aid debugging in dev. The UI shows a toast too.
      console.error("InvoiceList: failed to load invoices")
      toast.error("Failed to load invoices")
    } finally {
      setLoading(false)
      setTableLoading(false)
    }
  }

  useEffect(() => {
    // On initial mount, load invoices and pass initialFilterUserId if present
    loadInvoices({ filterUserId: initialFilterUserId })
    // If an initial user filter was provided (from per-user page), set the select value so it appears selected
    if (initialFilterUserId) {
      setFilterUser(initialFilterUserId)
    }
    // load clients and users for filters
    ;(async () => {
      try {
        const cs = await clientService.getAllClients()
        setClients(cs.map(c => ({ id: c.id, name: c.name })))
      } catch (e) {
        // ignore
      }
      try {
        const us = await userService.getAllUsers()
        setUsers(us.map(u => ({ id: u.id, name: u.name })))
      } catch (e) {
        // ignore
      }
    })()
  }, [user])

  // Auto-apply filters when status changes (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      void applyFilters()
    }, 250)
    return () => clearTimeout(t)
  }, [filterStatus])

  // Auto-apply filters when client or user select changes (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      void applyFilters()
    }, 250)
    return () => clearTimeout(t)
  }, [filterClient, filterUser])

  const applyFilters = async () => {
    setTableLoading(true)
    try {
      const statusParam = filterStatus ? String(filterStatus) : undefined
  const clientParam = filterClient ? String(filterClient) : undefined
  const userParam = filterUser ? String(filterUser) : undefined
  // pass caller's user id/role as the auth context, and clientParam and userParam as explicit filters
  const data = await invoiceService.getAllInvoices(user?.id, user?.role, statusParam, undefined, undefined, clientParam, userParam)
      setInvoices(data)
    } catch {
      toast.error('Failed to apply filters')
    } finally {
      setTableLoading(false)
    }
  }

  // debounce the query to avoid frequent re-renders while typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 250)
    return () => clearTimeout(t)
  }, [query])

  const filteredInvoices = invoices.filter((inv) => {
    if (!debouncedQuery) return true
    const q = debouncedQuery
    return (
      inv.invoiceNumber?.toLowerCase()?.includes(q) ||
      inv.clientName?.toLowerCase()?.includes(q) ||
      inv.userName?.toLowerCase()?.includes(q) ||
      inv.id?.toLowerCase()?.includes(q) ||
      inv.status?.toLowerCase()?.includes(q)
    )
  })

  const handleDelete = async () => {
    if (!deleteInvoice || !user) return

    setDeleting(true)
    try {
  await invoiceService.deleteInvoice(deleteInvoice.id)
      setInvoices(invoices.filter((inv) => inv.id !== deleteInvoice.id))
      toast.success("Invoice deleted successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete invoice")
    } finally {
      setDeleting(false)
      setDeleteInvoice(null)
    }
  }

  const handleSendInvoice = async (invoice: Invoice) => {
    if (!user) return

    setSendingId(invoice.id)
    try {
  const result = await invoiceService.sendInvoice(invoice.id)
  // Optionally, show previewUrl or refetch invoices
  toast.success("Invoice sent!", { description: result.previewUrl ? `Preview: ${result.previewUrl}` : undefined })
  // Optionally, reload invoices to update status
  void loadInvoices()
      toast.success(`Invoice sent to ${invoice.clientEmail}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invoice")
    } finally {
      setSendingId(null)
    }
  }

  const handleMarkAsPaid = async (invoice: Invoice) => {
    if (!user) return

    setMarkingPaidId(invoice.id)
    try {
  // Mark as paid not implemented in service. You may want to implement it in the API and service.
  toast.info("Mark as paid is not implemented.")
      toast.success("Invoice marked as paid")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update invoice")
    } finally {
      setMarkingPaidId(null)
    }
  }

  const canEditInvoice = (invoice: Invoice) => {
    return user?.role === "superadmin" || invoice.createdBy === user?.id
  }

  const canDeleteInvoice = (invoice: Invoice) => {
    return user?.role === "superadmin" || invoice.createdBy === user?.id
  }

  const getStatusBadge = (status: Invoice["status"]) => {
    const variants = {
      pending: "secondary",
      maker: "secondary",
      sent: "default",
      paid: "default",
      not_paid: "destructive",
      completed: "default",
    } as const

    const colors: Record<string,string> = {
      pending: "bg-gray-100 text-gray-800",
      maker: "bg-amber-100 text-amber-800",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      not_paid: "bg-red-100 text-red-800",
      completed: "bg-teal-100 text-teal-800",
    }

    if (!status) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Unknown</Badge>
    }
    // Format status label (handle underscores like not_paid -> Not Paid)
    const label = typeof status === 'string' ? formatStatusLabel(status) : 'Unknown'
    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {label}
      </Badge>
    )
  }

  // Render UI immediately and show inline loading states (skeletons) instead

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Invoice Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {user?.role === "superadmin" ? "Manage all invoices in the system" : "Manage your invoices"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            <Button onClick={onAddInvoice} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Input
              placeholder="Search invoices by number, client, user, id or status..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="w-48">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as InvoiceStatus | "")} className="w-full rounded-lg border px-3 py-2">
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="maker">Maker</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="not_paid">Not Paid</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="w-48">
              <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="w-full rounded-lg border px-3 py-2">
                <option value="">All clients</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="w-48">
              <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="w-full rounded-lg border px-3 py-2">
                <option value="">All users</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            {/* status select only; removed sort selects for a cleaner UI */}
          </div>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Render 6 skeleton rows while loading
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell><div className="h-4 bg-gray-200 rounded w-32 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-gray-200 rounded w-48 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-gray-200 rounded w-32 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-gray-200 rounded w-20 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-gray-200 rounded w-24 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-gray-200 rounded w-24 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-gray-200 rounded w-24 animate-pulse" /></TableCell>
                    <TableCell className="text-right"><div className="h-4 bg-gray-200 rounded w-16 ml-auto animate-pulse" /></TableCell>
                  </TableRow>
                ))
              ) : (
                filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <div className="font-mono text-sm">{invoice.id}</div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{invoice.clientName}</div>
                      <div className="text-sm text-muted-foreground">{invoice.clientCompany}</div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm">{invoice.userName}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{typeof invoice.total === 'number' ? formatCurrency(invoice.total, DEFAULT_CURRENCY) : formatCurrency(0, DEFAULT_CURRENCY)}</div>
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="text-sm">{new Date(invoice.dueDate).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => onViewInvoice(invoice)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEditInvoice(invoice) && (
                            <DropdownMenuItem onClick={() => onEditInvoice(invoice)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                setSendingId(invoice.id)
                                const result = await invoiceService.sendInvoice(invoice.id)
                                setSendingId(null)
                                if (result.previewUrl) {
                                  toast.success('Invoice email sent! (Preview)', {
                                    description: (
                                      <a href={result.previewUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">View Email</a>
                                    )
                                  })
                                } else {
                                  toast.success('Invoice email sent!')
                                }
                              } catch (error) {
                                setSendingId(null)
                                toast.error(error instanceof Error ? error.message : 'Failed to send invoice email')
                              }
                            }}
                            disabled={sendingId === invoice.id}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Email Invoice
                          </DropdownMenuItem>
                          {/* Single Download submenu: Client PDF (with prices) and Maker PDF (no prices) */}
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              Download PDF
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={async () => {
                                // Client PDF (with prices) - trigger client-side generation and save
                                const jsPDF = (await import('jspdf')).default;
                                const autoTable = (await import('jspdf-autotable')).default;
                                const doc = new jsPDF();
                                // Header
                                doc.setFontSize(22);
                                doc.setTextColor(40, 40, 80);
                                doc.text(`INVOICE`, 14, 18);
                                doc.setFontSize(12);
                                doc.setTextColor(100);
                                doc.text(`invoice-${invoice.id}`, 14, 26);
                                doc.setTextColor(0);
                                doc.setFontSize(11);
                              doc.text(`Status: ${formatStatusLabel(invoice.status)}`, 150, 18, { align: "right" });
                                doc.text(`Created: ${new Date(invoice.createdAt).toLocaleDateString()}`, 150, 26, { align: "right" });
                                doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`, 150, 34, { align: "right" });

                                // Bill To
                                doc.setFontSize(13);
                                doc.setTextColor(40, 40, 80);
                                doc.text("Bill To:", 14, 42);
                                doc.setFontSize(11);
                                doc.setTextColor(0);
                                doc.text(invoice.clientName, 14, 48);
                                if (invoice.clientCompany) doc.text(invoice.clientCompany, 14, 54);
                                if (invoice.clientEmail) doc.text(invoice.clientEmail, 14, 60);

                                // Table (with prices)
                                autoTable(doc, {
                                  startY: 70,
                                  head: [["Description", "Qty", "Unit Price", "Total"]],
                                  body: invoice.lineItems.map(item => [
                                    item.productName + (item.description ? `\n${item.description}` : ""),
                                    item.quantity,
                                    formatCurrency(item.unitPrice, DEFAULT_CURRENCY),
                                    formatCurrency(item.total, DEFAULT_CURRENCY)
                                  ]),
                                  headStyles: { fillColor: [40, 40, 80], textColor: 255, fontStyle: 'bold' },
                                  bodyStyles: { fontSize: 10 },
                                  alternateRowStyles: { fillColor: [245, 245, 255] },
                                  styles: { cellPadding: 2 },
                                });

                                const finalY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY) || 100;
                                // Totals
                                doc.setFontSize(11);
                                doc.setTextColor(40, 40, 80);
                                doc.text(`Subtotal:`, 130, finalY + 10);
                                doc.text(formatCurrency(invoice.subtotal, DEFAULT_CURRENCY), 180, finalY + 10, { align: "right" });
                                doc.text(`Tax (${invoice.taxRate}%):`, 130, finalY + 18);
                                doc.text(formatCurrency(invoice.taxAmount, DEFAULT_CURRENCY), 180, finalY + 18, { align: "right" });
                                doc.setFont("helvetica", "bold");
                                doc.setFontSize(13);
                                doc.text(`Total:`, 130, finalY + 28);
                                doc.text(formatCurrency(invoice.total, DEFAULT_CURRENCY), 180, finalY + 28, { align: "right" });
                                doc.setFont("helvetica", "normal");
                                doc.setFontSize(11);
                                doc.setTextColor(0);

                                // Notes
                                if (invoice.notes) {
                                  doc.setFontSize(11);
                                  doc.setTextColor(40, 40, 80);
                                  doc.text("Notes:", 14, finalY + 40);
                                  doc.setFontSize(10);
                                  doc.setTextColor(80);
                                  doc.text(invoice.notes, 14, finalY + 48, { maxWidth: 180 });
                                  doc.setTextColor(0);
                                }

                                doc.save(`invoice-${invoice.id}.pdf`);
                              }}>
                                Client PDF (with prices)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={async () => {
                                // Maker PDF (no prices)
                                const jsPDF = (await import('jspdf')).default;
                                const autoTable = (await import('jspdf-autotable')).default;
                                const doc = new jsPDF();
                                // Header
                                doc.setFontSize(22);
                                doc.setTextColor(40, 40, 80);
                                doc.text(`INVOICE`, 14, 18);
                                doc.setFontSize(12);
                                doc.setTextColor(100);
                                doc.text(`invoice-${invoice.id}`, 14, 26);
                                doc.setTextColor(0);
                                doc.setFontSize(11);
                                doc.text(`Status: ${formatStatusLabel(invoice.status)}`, 150, 18, { align: "right" });
                                doc.text(`Created: ${new Date(invoice.createdAt).toLocaleDateString()}`, 150, 26, { align: "right" });
                                doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`, 150, 34, { align: "right" });

                                // Bill To
                                doc.setFontSize(13);
                                doc.setTextColor(40, 40, 80);
                                doc.text("Bill To:", 14, 42);
                                doc.setFontSize(11);
                                doc.setTextColor(0);
                                doc.text(invoice.clientName, 14, 48);
                                if (invoice.clientCompany) doc.text(invoice.clientCompany, 14, 54);
                                if (invoice.clientEmail) doc.text(invoice.clientEmail, 14, 60);

                                // Table (no prices)
                                autoTable(doc, {
                                  startY: 70,
                                  head: [["Description", "Qty"]],
                                  body: invoice.lineItems.map(item => [
                                    item.productName + (item.description ? `\n${item.description}` : ""),
                                    item.quantity
                                  ]),
                                  headStyles: { fillColor: [40, 40, 80], textColor: 255, fontStyle: 'bold' },
                                  bodyStyles: { fontSize: 10 },
                                  alternateRowStyles: { fillColor: [245, 245, 255] },
                                  styles: { cellPadding: 2 },
                                });

                                // Notes
                                const finalY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY) || 100;
                                if (invoice.notes) {
                                  doc.setFontSize(11);
                                  doc.setTextColor(40, 40, 80);
                                  doc.text("Notes:", 14, finalY + 20);
                                  doc.setFontSize(10);
                                  doc.setTextColor(80);
                                  doc.text(invoice.notes, 14, finalY + 28, { maxWidth: 180 });
                                  doc.setTextColor(0);
                                }

                                doc.save(`invoice-${invoice.id}-no-prices.pdf`);
                              }}>
                                Maker PDF (no prices)
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          {canEditInvoice(invoice) && (invoice.status === "pending" || invoice.status === "maker") && (
                            <DropdownMenuItem
                              onClick={() => handleSendInvoice(invoice)}
                              disabled={sendingId === invoice.id}
                            >
                              {sendingId === invoice.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="mr-2 h-4 w-4" />
                              )}
                              Send Invoice
                            </DropdownMenuItem>
                          )}
                          {canEditInvoice(invoice) && (invoice.status === "sent" || invoice.status === "not_paid") && (
                            <DropdownMenuItem
                              onClick={() => handleMarkAsPaid(invoice)}
                              disabled={markingPaidId === invoice.id}
                            >
                              {markingPaidId === invoice.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="mr-2 h-4 w-4" />
                              )}
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          {canDeleteInvoice(invoice) && (
                            <DropdownMenuItem onClick={() => setDeleteInvoice(invoice)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                          <div className="border-t my-1" />
                          <div className="px-2 text-xs text-muted-foreground">Change status</div>
                          {['pending','maker','sent','paid','not_paid','completed'].map((s) => (
                            <DropdownMenuItem key={s} onClick={async () => {
                              const newStatus = toInvoiceStatus(s)
                              if (!newStatus) return
                              // optimistic update: update state immediately, call API, revert on failure
                              const prev = invoices
                              try {
                                setInvoices(prev.map(i => i.id === invoice.id ? { ...i, status: newStatus } : i))
                                setUpdatingStatusId(invoice.id)
                                await invoiceService.updateInvoice(invoice.id, { status: newStatus })
                                toast.success(`Status updated to ${s}`)
                              } catch (err) {
                                // revert
                                setInvoices(prev)
                                toast.error(err instanceof Error ? err.message : 'Failed to update status')
                              } finally {
                                setUpdatingStatusId(null)
                              }
                            }}>
                              {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {invoices.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No invoices found. Create your first invoice to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteInvoice} onOpenChange={() => setDeleteInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice &quot;{deleteInvoice?.invoiceNumber}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

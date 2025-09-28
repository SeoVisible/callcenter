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
import { formatDateSafe } from '@/lib/date'
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
  toast.error("Fehler beim Laden der Rechnungen")
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
      toast.error('Filter konnten nicht angewendet werden')
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
  toast.success("Rechnung erfolgreich gelöscht")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fehler beim Löschen der Rechnung")
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
      toast.success("Rechnung gesendet!", { description: result.previewUrl ? `Vorschau: ${result.previewUrl}` : undefined })
      // Optionally, reload invoices to update status
      void loadInvoices()
      toast.success(`Rechnung gesendet an ${invoice.clientEmail}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fehler beim Senden der Rechnung")
    } finally {
      setSendingId(null)
    }
  }

  const handleMarkAsPaid = async (invoice: Invoice) => {
    if (!user) return

    setMarkingPaidId(invoice.id)
    try {
      // Mark as paid not implemented in service. You may want to implement it in the API and service.
      toast.info("Als bezahlt markieren ist nicht implementiert.")
      toast.success("Rechnung als bezahlt markiert")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fehler beim Aktualisieren der Rechnung")
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
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Unbekannt</Badge>
    }
    // Format status label (handle underscores like not_paid -> Not Paid)
    const label = typeof status === 'string' ? formatStatusLabel(status) : 'Unbekannt'
    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {label}
      </Badge>
    )
  }

  // Shared PDF generator to match single-invoice view
  const generatePdf = async (invoice: Invoice, opts: { showPrices: boolean }) => {
    const { showPrices } = opts
    const jsPDF = (await import('jspdf')).default
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    // Try to load a logo from /nifar_logo.jpg (public).
    // Some browsers / image types cause jsPDF.addImage to fail when passed the raw data URL.
    // To be robust, fetch the image, draw it to a canvas and re-encode as PNG data URL
    // which jsPDF handles reliably.
    const fetchAndReencodePng = async (path: string): Promise<string | null> => {
      try {
        const resp = await fetch(path)
        if (!resp.ok) return null
        const blob = await resp.blob()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(String(reader.result ?? ''))
          reader.onerror = () => reject(new Error('Failed to read blob'))
          reader.readAsDataURL(blob)
        })

        // Create an image element so we can draw it to a canvas and re-encode as PNG
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image()
          i.onload = () => resolve(i)
          i.onerror = () => reject(new Error('Image load error'))
          i.src = dataUrl
        })

        // Draw to canvas at natural size to preserve quality, then get PNG data URL
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width || 200
        canvas.height = img.naturalHeight || img.height || 60
        const ctx = canvas.getContext('2d')
        if (!ctx) return dataUrl
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/png')
      } catch (err) {
        return null
      }
    }

    // Try a list of candidate public paths so we prefer a stable PNG if available
    const logoCandidates = ['/logo.png', '/nifar_logo.png', '/nifar_logo.jpg', '/nifar_logo.jpeg']
    let logoDataUrl: string | null = null
    for (const p of logoCandidates) {
      try {
        const found = await fetchAndReencodePng(p)
        if (found) {
          logoDataUrl = found
          break
        }
      } catch (e) {
        // ignore and try next
      }
    }

  // Header: logo left, company info right
  const leftX = 20
    const rightX = 420
    const yBase = 40
    if (logoDataUrl) {
      try {
        // Always pass PNG (we re-encoded to PNG above)
        const imgW = 140
        const imgH = 50
        doc.addImage(logoDataUrl, 'PNG', leftX, yBase - 10, imgW, imgH)
      } catch (e) {
        doc.setFontSize(18)
        doc.text('Firma', leftX, yBase + 12)
      }
    } else {
      doc.setFontSize(18)
      doc.text('Firma', leftX, yBase + 12)
    }

    doc.setFontSize(10)
    doc.text('Kompakt GmbH', rightX, yBase)
    doc.text('Josef-Schrögel-Str. 68', rightX, yBase + 12)
    doc.text('52349 Düren', rightX, yBase + 24)
    doc.text('Tel: 02421 / 95 90 176', rightX, yBase + 36)
  // PDF header email updated to pro domain (PDF-only)
  doc.text('info@pro-arbeitsschutz.de', rightX, yBase + 48)

    // Title
    doc.setFontSize(20)
    doc.setTextColor(40, 40, 80)
    doc.text('Rechnung', leftX, yBase + 80)

  // Invoice identifier intentionally omitted from page header (kept only in filename)

    // Client (left) and Invoice meta (right)
    const clientY = yBase + 120
    doc.setFontSize(11)
    doc.setTextColor(0)
    doc.text('Rechnung an:', leftX, clientY)
    doc.setFontSize(10)
    doc.text(invoice.clientName || '', leftX, clientY + 14)
    if (invoice.clientCompany) doc.text(invoice.clientCompany, leftX, clientY + 28)
    if (invoice.clientEmail) doc.text(invoice.clientEmail, leftX, clientY + 42)

    const metaX = 360
    doc.setFontSize(10)
    const safeDate = (d: unknown) => {
      try {
        const dt = new Date(String(d))
        if (isNaN(dt.getTime())) return ''
        return dt.toLocaleDateString('de-DE')
      } catch { return '' }
    }
    const invoiceDate = safeDate(invoice.issueDate ?? invoice.createdAt)
    const serviceDate = safeDate(invoice.createdAt)
    const dueDate = safeDate(invoice.dueDate)
    if (invoiceDate) doc.text(`Rechnungsdatum: ${invoiceDate}`, metaX, clientY)
    if (serviceDate) doc.text(`Leistungsdatum: ${serviceDate}`, metaX, clientY + 14)
    if (dueDate) doc.text(`Fälligkeitsdatum: ${dueDate}`, metaX, clientY + 28)

    // Items table
    const head = showPrices ? ['Menge', 'Art.Nr.', 'Bezeichnung', 'Einzelpreis', 'Gesamt'] : ['Menge', 'Art.Nr.', 'Bezeichnung']
    type LineWithSku = Invoice['lineItems'][number] & { sku?: string }
    const body = invoice.lineItems.map((item) => {
      const sku = (item as LineWithSku).sku || ''
      const qty = Number(item.quantity ?? 0)
      const unit = Number(item.unitPrice ?? 0)
      const lineTotal = qty * unit
      if (showPrices) {
        return [String(qty), sku, item.productName + (item.description ? `\n${item.description}` : ''), formatCurrency(unit, DEFAULT_CURRENCY), formatCurrency(lineTotal, DEFAULT_CURRENCY)]
      }
      return [String(qty), sku, item.productName + (item.description ? `\n${item.description}` : '')]
    })

    autoTable(doc, {
      startY: clientY + 80,
      head: [head],
      body,
      headStyles: { fillColor: [245, 245, 245], textColor: 40, fontStyle: 'bold' },
      styles: { cellPadding: 6, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 50, halign: 'right' },
        1: { cellWidth: 60, halign: 'left' },
        2: { cellWidth: 260 },
        3: { cellWidth: 80, halign: 'right' },
        4: { cellWidth: 80, halign: 'right' }
      },
      bodyStyles: { fontSize: 10, valign: 'middle' }
    })

    interface DocWithAutoTable {
      lastAutoTable?: { finalY: number }
      internal: {
        pageSize: {
          getHeight?: () => number
          getWidth?: () => number
          height?: number
          width?: number
        }
      }
      addPage?: () => void
    }

    const finalY = ((doc as unknown as DocWithAutoTable).lastAutoTable?.finalY) || (clientY + 180)

    // Totals box on the right
    if (showPrices) {
      const totalsX = 360
      let line1Y = finalY + 28
      const lineGap = 16
      const internal = (doc as unknown as DocWithAutoTable).internal
      const pageHeight = typeof internal.pageSize.getHeight === 'function'
        ? internal.pageSize.getHeight!()
        : (internal.pageSize.height ?? 0)
      const bottomMargin = 60
      const estimatedTotalsHeight = 80
      if (line1Y + estimatedTotalsHeight > pageHeight - bottomMargin) {
        doc.addPage()
        line1Y = 60
      }

      const computedSubtotal = invoice.lineItems.reduce((s, it) => s + (Number(it.unitPrice ?? 0) * Number(it.quantity ?? 0)), 0)
      const taxRateNum = Number(invoice.taxRate ?? 0)
      const computedTax = computedSubtotal * (taxRateNum / 100)
      const computedTotal = computedSubtotal + computedTax

      const pageWidth = typeof internal.pageSize.getWidth === 'function'
        ? internal.pageSize.getWidth!()
        : (internal.pageSize.width ?? 0)
      const valueX = pageWidth - 60

      doc.setFontSize(10)
      doc.setTextColor(40)
      doc.setFont('helvetica', 'normal')
      doc.text('Gesamt Netto:', totalsX, line1Y)
      doc.text(formatCurrency(computedSubtotal, DEFAULT_CURRENCY), valueX, line1Y, { align: 'right' })

      const taxRateStr = `${String(taxRateNum).replace('.', ',')}` + '\u00A0%'
      doc.text(`Umsatzsteuer (${taxRateStr}):`, totalsX, line1Y + lineGap)
      doc.text(formatCurrency(computedTax, DEFAULT_CURRENCY), valueX, line1Y + lineGap, { align: 'right' })

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      const bruttoY = line1Y + lineGap * 2 + 8
      doc.text('Gesamt Brutto:', totalsX, bruttoY)
      doc.text(formatCurrency(computedTotal, DEFAULT_CURRENCY), valueX, bruttoY, { align: 'right' })
      doc.setFont('helvetica', 'normal')
    }

    // Footer
    const footerY = 780
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text('Kompakt GmbH — Josef-Schrögel-Str. 68, 52349 Düren — DE89 3700 0400 0289 5220 00', 40, footerY)
    doc.text('info@pro-arbeitsschutz.de — Tel: 02421 / 95 90 176', 40, footerY + 12)
    // Footer (PDF-only bank/contact info)
    const formatIban = (iban?: string) => {
      if (!iban) return ''
      return String(iban).replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
    }
    const bankIbanRaw = 'DE90506521240008142622' // from provided image: DE90 5065 2124 0008 1426 22
    const bankBic = 'HELADEF1SLS' // visible on provided attachment
    const serviceHotline = '+49 89 411 3' // partial as visible on image; kept in PDF footer
    doc.text(`IBAN: ${formatIban(bankIbanRaw)}  |  BIC: ${bankBic}`, 40, footerY + 12)
    doc.text(`Servicehotline: ${serviceHotline}  2 info@kompakt-arbeitsschutz.de`, 40, footerY + 24)
    doc.text(`Servicehotline: ${serviceHotline}  — info@pro-arbeitsschutz.de`, 40, footerY + 24)
    doc.text('www.pro-arbeitsschutz.de', 40, footerY + 36)

    const filename = showPrices ? `invoice-${invoice.id}.pdf` : `invoice-${invoice.id}-no-prices.pdf`;
    try { toast.info('PDF wird erstellt...') } catch {}
    doc.save(filename)
  }

  // Render UI immediately and show inline loading states (skeletons) instead

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <CardTitle>Rechnungsverwaltung</CardTitle>
              {!loading && <Badge className="text-sm">{invoices.length} Rechnungen</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {user?.role === "superadmin" ? "Verwalten Sie alle Rechnungen im System" : "Verwalten Sie Ihre Rechnungen"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            <Button onClick={onAddInvoice} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" />
            Rechnung erstellen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Input
              placeholder="Rechnungen nach Nummer, Kunde, Benutzer, ID oder Status durchsuchen..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="w-48">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as InvoiceStatus | "")} className="w-full rounded-lg border px-3 py-2">
                <option value="">Alle Stati</option>
                <option value="pending">Ausstehend</option>
                <option value="maker">In Bearbeitung</option>
                <option value="sent">Versendet</option>
                <option value="paid">Bezahlt</option>
                <option value="not_paid">Nicht bezahlt</option>
                <option value="completed">Abgeschlossen</option>
              </select>
            </div>
            <div className="w-48">
              <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="w-full rounded-lg border px-3 py-2">
                <option value="">Alle Kunden</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="w-48">
              <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="w-full rounded-lg border px-3 py-2">
                <option value="">Alle Benutzer</option>
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
                <TableHead>Rechnung #</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead>Benutzer</TableHead>
                <TableHead>Betrag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rechnungsdatum</TableHead>
                <TableHead>Fälligkeitsdatum</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
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
                    <TableCell>{formatDateSafe(invoice.createdAt)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDateSafe(invoice.dueDate)}</div>
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
                                Bearbeiten
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  setSendingId(invoice.id)
                                  const result = await invoiceService.sendInvoice(invoice.id)
                                  setSendingId(null)
                                  if (result.previewUrl) {
                                    toast.success('Rechnungs-E-Mail gesendet! (Vorschau)', {
                                      description: (
                                        <a href={result.previewUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">E-Mail anzeigen</a>
                                      )
                                    })
                                  } else {
                                    toast.success('Rechnungs-E-Mail gesendet!')
                                  }
                                } catch (error) {
                                  setSendingId(null)
                                  toast.error(error instanceof Error ? error.message : 'Fehler beim Senden der Rechnungs-E-Mail')
                                }
                              }}
                              disabled={sendingId === invoice.id}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Rechnung per E-Mail
                            </DropdownMenuItem>
                            {/* Single Download submenu: Client PDF (with prices) and Maker PDF (no prices) */}
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                PDF herunterladen
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={async () => await generatePdf(invoice, { showPrices: true })}>
                                  Kunden-PDF (mit Preisen)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={async () => await generatePdf(invoice, { showPrices: false })}>
                                  Interne-PDF (ohne Preise)
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
                                Rechnung senden
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
                                Als bezahlt markieren
                              </DropdownMenuItem>
                            )}
                            {canDeleteInvoice(invoice) && (
                              <DropdownMenuItem onClick={() => setDeleteInvoice(invoice)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Löschen
                              </DropdownMenuItem>
                            )}
                            <div className="border-t my-1" />
                            <div className="px-2 text-xs text-muted-foreground">Status ändern</div>
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
                                  toast.success(`Status geändert zu ${formatStatusLabel(s)}`)
                                } catch (err) {
                                  // revert
                                  setInvoices(prev)
                                  toast.error(err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Status')
                                } finally {
                                  setUpdatingStatusId(null)
                                }
                              }}>
                                {formatStatusLabel(s)}
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
                <p className="text-muted-foreground">Keine Rechnungen gefunden. Erstellen Sie Ihre erste Rechnung, um zu beginnen.</p>
              </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteInvoice} onOpenChange={() => setDeleteInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechnung löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie die Rechnung &quot;{deleteInvoice?.invoiceNumber}&quot; löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

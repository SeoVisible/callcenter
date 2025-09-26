/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type { Invoice } from "@/lib/invoices"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, Send } from "lucide-react"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { invoiceService } from "@/lib/invoices"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency'
import { toast } from "sonner"
import { formatStatusLabel } from '@/lib/status'

const toInvoiceStatus = (s: unknown) => {
  const v = String(s)
  return ["pending","maker","sent","paid","not_paid","completed"].includes(v) ? (v as Invoice["status"]) : undefined
}

interface InvoiceViewProps {
  invoice: Invoice
  onBack: () => void
  onEdit: () => void
  onSend?: () => void
}

export function InvoiceView({ invoice, onBack, onEdit, onSend }: InvoiceViewProps) {
  const [statusSelectOpen, setStatusSelectOpen] = useState(false)
  const getStatusBadge = (status: Invoice["status"]) => {
    const colors: Record<string,string> = {
      pending: "bg-gray-100 text-gray-800",
      maker: "bg-amber-100 text-amber-800",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      not_paid: "bg-red-100 text-red-800",
      completed: "bg-teal-100 text-teal-800",
    }

    const label = typeof status === 'string' ? formatStatusLabel(status) : 'Unknown'
    return <Badge className={colors[status] ?? 'bg-gray-100 text-gray-800'}>{label}</Badge>
  }

  const generatePdf = async (opts: { showPrices: boolean }) => {
    const { showPrices } = opts;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    // Try to load a logo from /nifar_logo.jpg (public) using fetch->blob->dataURL
    // This is more reliable than Image + canvas for local dev and avoids CORS issues.
    let logoDataUrl: string | null = null
    try {
      const resp = await fetch('/nifar_logo.jpg')
      if (resp.ok) {
        const blob = await resp.blob()
        logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(String(reader.result ?? ''))
          reader.readAsDataURL(blob)
        })
      }
    } catch (e) {
      logoDataUrl = null
    }

    // Header: logo left, company info right
    const leftX = 40
    const rightX = 420
    const yBase = 40
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', leftX, yBase - 8, 120, 40)
      } catch (e) {
        doc.setFontSize(18)
        doc.text('Company', leftX, yBase + 12)
      }
    } else {
      doc.setFontSize(18)
      doc.text('Company', leftX, yBase + 12)
    }

    doc.setFontSize(10)
    doc.text('Kompakt GmbH', rightX, yBase)
    doc.text('Josef-Schrögel-Str. 68', rightX, yBase + 12)
    doc.text('52349 Düren', rightX, yBase + 24)
    doc.text('Tel: 02421 / 95 90 176', rightX, yBase + 36)
    doc.text('info@kompakt-arbeitsschutz.de', rightX, yBase + 48)

  // Title: render main label
  doc.setFontSize(20)
  doc.setTextColor(40, 40, 80)
  doc.text('Rechnung', leftX, yBase + 80)

  // Invoice identifier: place near company block (top-right)
  const idText = String(invoice.invoiceNumber || invoice.id || '')
  doc.setFontSize(10)
  doc.setTextColor(80)
  const idMaxWidth = 240
  const idLines = typeof (doc as any).splitTextToSize === 'function' ? (doc as any).splitTextToSize(idText, idMaxWidth) : [idText]
  doc.text(idLines, rightX, yBase + 70)

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
    // Use safe date handling: prefer issueDate, fall back to createdAt; show empty if invalid
    const safeDate = (d: any) => {
      try {
        const dt = new Date(d)
        if (isNaN(dt.getTime())) return ''
        return dt.toLocaleDateString()
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
    const body = invoice.lineItems.map((item) => {
      const sku = (item as any).sku || ''
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

    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || (clientY + 180)

    // Totals box on the right: compute totals from line items (avoid relying on possibly-mismatched invoice fields)
    if (showPrices) {
      const totalsX = 360
      let line1Y = finalY + 28 // give a bit more breathing room
      const lineGap = 16

      // If there isn't enough space on the current page for totals, add a new page and reset Y
      const pageHeight = typeof (doc as any).internal.pageSize.getHeight === 'function'
        ? (doc as any).internal.pageSize.getHeight()
        : (doc as any).internal.pageSize.height
      const bottomMargin = 60
      const estimatedTotalsHeight = 80
      if (line1Y + estimatedTotalsHeight > pageHeight - bottomMargin) {
        doc.addPage()
        // place totals near top on new page
        line1Y = 60
      }

      // compute subtotal from invoice.lineItems to avoid duplication errors
      const computedSubtotal = invoice.lineItems.reduce((s, it) => s + (Number(it.unitPrice ?? 0) * Number(it.quantity ?? 0)), 0)
      const taxRateNum = Number(invoice.taxRate ?? 0)
      const computedTax = computedSubtotal * (taxRateNum / 100)
      const computedTotal = computedSubtotal + computedTax

      doc.setFontSize(10)
      doc.setTextColor(40)
      // Netto
      doc.setFont('helvetica', 'normal')
      doc.text('Gesamt Netto:', totalsX, line1Y)
      doc.text(formatCurrency(computedSubtotal, DEFAULT_CURRENCY), totalsX + 120, line1Y, { align: 'right' })

      // Tax
      doc.text(`Umsatzsteuer (${taxRateNum}%):`, totalsX, line1Y + lineGap)
      doc.text(formatCurrency(computedTax, DEFAULT_CURRENCY), totalsX + 120, line1Y + lineGap, { align: 'right' })

      // Brutto (bold) - draw once
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      const bruttoY = line1Y + lineGap * 2 + 8
      doc.text('Gesamt Brutto:', totalsX, bruttoY)
      doc.text(formatCurrency(computedTotal, DEFAULT_CURRENCY), totalsX + 120, bruttoY, { align: 'right' })
      doc.setFont('helvetica', 'normal')
    }

    // Footer with bank/contact info
    const footerY = 780
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text('Kompakt GmbH — Josef-Schrögel-Str. 68, 52349 Düren — DE89 3700 0400 0289 5220 00', 40, footerY)
    doc.text('info@kompakt-arbeitsschutz.de — Tel: 02421 / 95 90 176', 40, footerY + 12)

  const filename = showPrices ? `invoice-${invoice.id}.pdf` : `invoice-${invoice.id}-no-prices.pdf`;
  // debug markers so we can confirm the client generator is executed in the browser
  try { console.log('[PDF] generating client PDF for', invoice.id) } catch {}
  try { toast.info('Generating PDF...') } catch {}
  doc.save(filename);
  }

  const handleDownloadWithPrices = async () => await generatePdf({ showPrices: true })
  const handleDownloadWithoutPrices = async () => await generatePdf({ showPrices: false })

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="flex items-center gap-3">
                Invoice {invoice.invoiceNumber}
                {/* compact inline badge + select positioned under the badge */}
                <div className="flex items-center gap-2">
                  <div className="relative inline-flex items-center">
                    <button
                      type="button"
                      aria-label="Change status"
                      onClick={() => setStatusSelectOpen(true)}
                      className="-ml-1 rounded-md focus:outline-none"
                    >
                      {getStatusBadge(invoice.status)}
                    </button>

                    <Select
                      value={invoice.status}
                      open={statusSelectOpen}
                      onOpenChange={setStatusSelectOpen}
          onValueChange={async (value: string) => {
                        try {
            // convert to known invoice status if possible
            const statusValue = toInvoiceStatus(value) || (value as Invoice["status"])
            await invoiceService.updateInvoice(invoice.id, { status: statusValue })
                          toast.success(`Status updated to ${value}`)
                          setStatusSelectOpen(false)
                          setTimeout(() => window.location.reload(), 250)
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed to update status")
                        }
                      }}
                    >
                      <SelectTrigger className="ml-2 h-9 w-36 rounded-md text-sm px-3 py-1 bg-white border border-[#e5e8f0] shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={6} className="!w-36 mt-1 shadow-lg rounded-md">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="maker">Maker</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="not_paid">Not Paid</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Created on {new Date(invoice.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            { (invoice.status === "pending" || invoice.status === "maker") && onSend && (
              <Button onClick={onSend}>
                <Send className="mr-2 h-4 w-4" />
                Send Invoice
              </Button>
            )}
            <Button variant="outline" onClick={onEdit}>
              Edit
            </Button>

            {/* Single Download dropdown: Client PDF (with prices) / Maker PDF (no prices) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" aria-label="Download PDF">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadWithPrices}>
                  Client PDF (with prices)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadWithoutPrices}>
                  Maker PDF (no prices)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
      </Card>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Bill To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-medium">{invoice.clientName}</div>
              <div className="text-sm text-muted-foreground">{invoice.clientCompany}</div>
              <div className="text-sm text-muted-foreground">{invoice.clientEmail}</div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Information */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Issue Date:</span>
                <span className="text-sm">{new Date(invoice.issueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Due Date:</span>
                <span className="text-sm">{new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
              {invoice.sentAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sent Date:</span>
                  <span className="text-sm">{new Date(invoice.sentAt).toLocaleDateString()}</span>
                </div>
              )}
              {invoice.paidAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Paid Date:</span>
                  <span className="text-sm">{new Date(invoice.paidAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice, DEFAULT_CURRENCY)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.total, DEFAULT_CURRENCY)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="flex justify-end mt-6">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal, DEFAULT_CURRENCY)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({invoice.taxRate}%):</span>
                <span>{formatCurrency(invoice.taxAmount, DEFAULT_CURRENCY)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total, DEFAULT_CURRENCY)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

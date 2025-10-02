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
import { formatDateSafe } from '@/lib/date'
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
      maker: "bg-amber-200 text-amber-900",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      not_paid: "bg-red-100 text-red-800",
      completed: "bg-teal-100 text-teal-800",
    }

  const label = typeof status === 'string' ? formatStatusLabel(status) : 'Unbekannt'
    return <Badge className={colors[status] ?? 'bg-gray-100 text-gray-800'}>{label}</Badge>
  }

  const generatePdf = async (opts: { showPrices: boolean }) => {
    const { showPrices } = opts;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  // Try to load a logo from /nifar_logo.jpg (public).
  // Re-encode to PNG via a canvas to ensure jsPDF.getImage works reliably across browsers and image types.
    const fetchAndReencodePng = async (path: string): Promise<{ dataUrl: string; width: number; height: number } | null> => {
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
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image()
          i.onload = () => resolve(i)
          i.onerror = () => reject(new Error('Image load error'))
          i.src = dataUrl
        })

        const naturalW = img.naturalWidth || img.width || 200
        const naturalH = img.naturalHeight || img.height || 60
        const canvas = document.createElement('canvas')
        // re-encode at original resolution to avoid quality loss
        canvas.width = naturalW
        canvas.height = naturalH
        const ctx = canvas.getContext('2d')
        if (!ctx) return { dataUrl, width: naturalW, height: naturalH }
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const png = canvas.toDataURL('image/png')
        return { dataUrl: png, width: naturalW, height: naturalH }
      } catch (err) {
        return null
      }
    }

    // Try a list of candidate public paths so we prefer a stable PNG if available
    // prefer a pro-arbeitsschutz branded file if present in /public
    const logoCandidates = [
      '/pro-arbeitsschutz-logo.png',
      '/pro-arbeitsschutz-logo.jpg',
      '/logo.png',
      '/nifar_logo.png',
      '/nifar_logo.jpg',
      '/nifar_logo.jpeg'
    ]
    let logoDataUrl: string | null = null
    let logoNaturalW = 0
    let logoNaturalH = 0
    for (const p of logoCandidates) {
      try {
        const found = await fetchAndReencodePng(p)
        if (found) {
          logoDataUrl = found.dataUrl
          logoNaturalW = found.width
          logoNaturalH = found.height
          break
        }
      } catch (e) {
        // ignore and try next
      }
    }

  // Header: render logo on the left (replacing the textual company name), company info on the right
  const leftX = 20
  const rightX = 420
  const yBase = 40

  // Default info start (when no logo is present)
  let infoStartY = yBase

    if (logoDataUrl) {
      try {
        // compute scaled dimensions to preserve aspect ratio and fit within bounds
        const maxW = 140
        const maxH = 50
        const naturalW = logoNaturalW || maxW
        const naturalH = logoNaturalH || maxH
        const scale = Math.min(maxW / naturalW, maxH / naturalH, 1)
        const imgW = Math.round(naturalW * scale)
        const imgH = Math.round(naturalH * scale)
        // center vertically a little by offsetting yBase
        const imgY = yBase - 10
        doc.addImage(logoDataUrl, 'PNG', leftX, imgY, imgW, imgH)
        // move company text down to sit under the logo
        infoStartY = yBase + imgH - 8
      } catch (e) {
        // fallback: print site name on the left
        doc.setFontSize(18)
        doc.text('pro-arbeitsschutz.de', leftX, yBase + 12)
      }
    } else {
      // show site name as fallback when no logo file is available in public/
      doc.setFontSize(18)
      doc.text('pro-arbeitsschutz.de', leftX, yBase + 12)
    }

  doc.setFontSize(10)
  // render company/contact info starting at computed Y so it won't collide with the logo
  // Use Pro Arbeitsschutz address (PDF-only)
  doc.text('Pro Arbeitsschutz', rightX, infoStartY)
  doc.text('Dieselstraße 6–8', rightX, infoStartY + 12)
  doc.text('63165 Mühlheim am Main', rightX, infoStartY + 24)
  doc.text('Tel: +4961089944981', rightX, infoStartY + 36)
  // PDF header email updated to pro domain (PDF-only)
  doc.text('info@pro-arbeitsschutz.de', rightX, infoStartY + 48)

  // Title: render main label
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
    // Add client address
    const client = (invoice as any).client
    if (client?.address?.street) doc.text(client.address.street, leftX, clientY + 42)
    if (client?.address?.zipCode || client?.address?.city) {
      const cityLine = [client.address.zipCode, client.address.city].filter(Boolean).join(' ')
      if (cityLine) doc.text(cityLine, leftX, clientY + 56)
    }
    if (client?.address?.country && client.address.country !== 'Germany' && client.address.country !== 'Deutschland') {
      doc.text(client.address.country, leftX, clientY + 70)
    }

    const metaX = 360
    doc.setFontSize(10)
  // Use safe date handling: prefer issueDate, fall back to createdAt; show empty if invalid
    const safeDate = (d: any) => formatDateSafe(d, 'de-DE')
    const invoiceDate = safeDate(invoice.issueDate ?? invoice.createdAt)
    const serviceDate = safeDate(invoice.createdAt)
    const dueDate = safeDate(invoice.dueDate)
    if (invoiceDate) doc.text(`Rechnungsdatum: ${invoiceDate}`, metaX, clientY)
    if (serviceDate) doc.text(`Leistungsdatum: ${serviceDate}`, metaX, clientY + 14)
    if (dueDate) doc.text(`Fälligkeitsdatum: ${dueDate}`, metaX, clientY + 28)

  // Items table
    const head = showPrices ? ['Menge', 'Art.Nr.', 'Bezeichnung', 'Einzelpreis', 'Gesamt'] : ['Menge', 'Art.Nr.', 'Bezeichnung']
    const body = invoice.lineItems.map((item) => {
      const sku = (item as any)?.sku ?? ''
      const qty = Number(item.quantity ?? 0)
      const unit = Number(item.unitPrice ?? 0)
      const lineTotal = qty * unit
      if (showPrices) {
        return [String(qty), sku, item.productName + (item.description ? `\n${item.description}` : ''), formatCurrency(unit, DEFAULT_CURRENCY), formatCurrency(lineTotal, DEFAULT_CURRENCY)]
      }
      return [String(qty), sku, item.productName + (item.description ? `\n${item.description}` : '')]
    })

    // compute page dimensions and dynamic column widths so tables span the page nicely
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

    const internalForTable = (doc as unknown as DocWithAutoTable).internal
    const pageW = typeof internalForTable.pageSize.getWidth === 'function'
      ? internalForTable.pageSize.getWidth()
      : (internalForTable.pageSize.width ?? 595)
    const rightMarginForTable = 60
    const availableWidth = Math.max(pageW - leftX - rightMarginForTable, 300)

    let columnStyles: Record<string, any>
    if (showPrices) {
      const w0 = 50 // qty
      const w1 = 60 // sku
      const w3 = 80 // unit price
      const w4 = 80 // total
      const descW = Math.max(availableWidth - (w0 + w1 + w3 + w4), 120)
      columnStyles = {
        '0': { cellWidth: w0, halign: 'right' },
        '1': { cellWidth: w1, halign: 'left' },
        '2': { cellWidth: descW },
        '3': { cellWidth: w3, halign: 'right' },
        '4': { cellWidth: w4, halign: 'right' }
      }
    } else {
      const w0 = 60
      const w1 = 80
      const descW = Math.max(availableWidth - (w0 + w1), 120)
      columnStyles = {
        '0': { cellWidth: w0, halign: 'right' },
        '1': { cellWidth: w1, halign: 'left' },
        '2': { cellWidth: descW }
      }
    }

    autoTable(doc, {
      startY: clientY + 80,
      head: [head],
      body,
      headStyles: { fillColor: [245, 245, 245], textColor: 40, fontStyle: 'bold' },
      styles: { cellPadding: 6, overflow: 'linebreak' },
      columnStyles,
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

      // place values right-aligned to a safe page margin to avoid collisions with labels
      const pageWidth = typeof (doc as any).internal.pageSize.getWidth === 'function'
        ? (doc as any).internal.pageSize.getWidth()
        : (doc as any).internal.pageSize.width
      const valueX = pageWidth - 60

      doc.setFontSize(10)
      doc.setTextColor(40)
      // Netto
      doc.setFont('helvetica', 'normal')
      doc.text('Gesamt Netto:', totalsX, line1Y)
      doc.text(formatCurrency(computedSubtotal, DEFAULT_CURRENCY), valueX, line1Y, { align: 'right' })

      // Tax (format percent with comma + NBSP)
      const taxRateStr = `${String(taxRateNum).replace('.', ',')}` + '\u00A0%'
      doc.text(`Umsatzsteuer (${taxRateStr}):`, totalsX, line1Y + lineGap)
      doc.text(formatCurrency(computedTax, DEFAULT_CURRENCY), valueX, line1Y + lineGap, { align: 'right' })

      // Brutto (bold) - draw once
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      const bruttoY = line1Y + lineGap * 2 + 8
      doc.text('Gesamt Brutto:', totalsX, bruttoY)
      doc.text(formatCurrency(computedTotal, DEFAULT_CURRENCY), valueX, bruttoY, { align: 'right' })
      doc.setFont('helvetica', 'normal')
    }

  // Footer with PDF-only bank/contact info — wrap long lines and place above bottom margin to avoid overlap
    const formatIban = (iban?: string) => {
      if (!iban) return ''
      return String(iban).replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
    }
    doc.setFontSize(9)
    doc.setTextColor(100)
    // Bank details shown only in the generated PDF (not added to invoice objects)
    const bankIbanRaw = 'DE90506521240008142622' // from provided image: DE90 5065 2124 0008 1426 22
    const bankBic = 'HELADEF1SLS'
    const serviceHotline = '+49 89 411 3'
    const website = 'www.pro-arbeitsschutz.de'

    // compute page dimensions safely
    const pageWidth = typeof (doc as any).internal.pageSize.getWidth === 'function'
      ? (doc as any).internal.pageSize.getWidth()
      : (doc as any).internal.pageSize.width
    const pageHeight = typeof (doc as any).internal.pageSize.getHeight === 'function'
      ? (doc as any).internal.pageSize.getHeight()
      : (doc as any).internal.pageSize.height

  const rightMargin = 40
    const maxWidth = pageWidth - leftX - rightMargin

    // PDF-only closing/signature block (show only the full signature/address once)
    const signatureLines = [
      'Mit freundlichen Grüßen',
      '',
      'Pro Arbeitsschutz',
      'Dieselstraße 6–8',
      '63165 Mühlheim am Main',
      'Tel: +4961089944981',
      'E-Mail: info@pro-arbeitsschutz.de',
      'IBAN: DE90 5065 2124 0008 1426 22',
    ]
    const lines: string[] = []
    for (const s of signatureLines) {
      lines.push(...doc.splitTextToSize(s, maxWidth))
    }

    // estimate line height (pts). 9pt font roughly 12pt line height
    const lineHeight = 12
    const totalHeight = lines.length * lineHeight
    const bottomMargin = 40

  // Preferred Y to place footer so it fits above the bottom margin
    let footerStartY = pageHeight - bottomMargin - totalHeight

    // If footer would overlap the invoice content/totals area, move it to a new page
    // finalY is where the table/totals finished; ensure at least 24pt gap
    const minGap = 24
    if (finalY + minGap > footerStartY) {
      doc.addPage()
      footerStartY = 60
    }

    // render wrapped lines starting at computed Y — draw per-line to avoid overlapping
    let y = footerStartY
    for (const l of lines) {
      doc.text(String(l), leftX, y)
      y += lineHeight
    }

  const filename = showPrices ? `invoice-${invoice.id}.pdf` : `invoice-${invoice.id}-no-prices.pdf`;
  // debug markers so we can confirm the client generator is executed in the browser
  try { console.log('[PDF] generating client PDF for', invoice.id) } catch {}
  try { toast.info('PDF wird erstellt...') } catch {}
  doc.save(filename);
  }

  const handleDownloadWithPrices = async () => await generatePdf({ showPrices: true })
  const handleDownloadWithoutPrices = async () => await generatePdf({ showPrices: false })

  return (
    <div className="space-y-6">
      {invoice.status === 'maker' && (
        <div className="p-4 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase">Entwurf</div>
              <div className="text-xs">Diese Rechnung ist als Entwurf markiert und noch nicht finalisiert. Verwenden Sie &quot;Bearbeiten&quot;, um Änderungen vorzunehmen.</div>
            </div>
            <div>
              <Button variant="ghost" onClick={onEdit}>Bearbeiten</Button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="flex items-center gap-3">
                Rechnung {invoice.invoiceNumber}
                {/* compact inline badge + select positioned under the badge */}
                <div className="flex items-center gap-2">
                  <div className="relative inline-flex items-center">
                    <button
                      type="button"
                      aria-label="Status ändern"
                      onClick={() => setStatusSelectOpen(true)}
                      className="-ml-1 rounded-md focus:outline-none"
                    >
                      {getStatusBadge(invoice.status)}
                    </button>

                    {/* <Select
                              value={invoice.status}
                              open={statusSelectOpen}
                              onOpenChange={setStatusSelectOpen}
                  onValueChange={async (value: string) => {
                                try {
                    // convert to known invoice status if possible
                    const statusValue = toInvoiceStatus(value) || (value as Invoice["status"])
                    await invoiceService.updateInvoice(invoice.id, { status: statusValue })
                                  toast.success(`Status geändert zu ${value}`)
                                  setStatusSelectOpen(false)
                                  setTimeout(() => window.location.reload(), 250)
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : "Fehler beim Aktualisieren des Status")
                                }
                              }}
                            >
                              <SelectTrigger className="ml-2 h-9 w-36 rounded-md text-sm px-3 py-1 bg-white border border-[#e5e8f0] shadow-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" sideOffset={6} className="!w-36 mt-1 shadow-lg rounded-md">
                                <SelectItem value="pending">Ausstehend</SelectItem>
                                <SelectItem value="maker">In Bearbeitung</SelectItem>
                                <SelectItem value="sent">Versendet</SelectItem>
                                <SelectItem value="paid">Bezahlt</SelectItem>
                                <SelectItem value="not_paid">Nicht bezahlt</SelectItem>
                                <SelectItem value="completed">Abgeschlossen</SelectItem>
                              </SelectContent>
                            </Select> */}
                  </div>
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Erstellt am {formatDateSafe(invoice.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            { (invoice.status === "pending" || invoice.status === "maker") && onSend && (
              <Button onClick={onSend}>
                <Send className="mr-2 h-4 w-4" />
                Rechnung senden
              </Button>
            )}
            <Button variant="outline" onClick={onEdit}>
              Bearbeiten
            </Button>

            {/* Single Download dropdown: Client PDF (with prices) / Maker PDF (no prices) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" aria-label="PDF herunterladen">
                  <Download className="mr-2 h-4 w-4" />
                  PDF herunterladen
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadWithPrices}>
                  Kunden-PDF (mit Preisen)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadWithoutPrices}>
                  Interne PDF (ohne Preise)
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
            <CardTitle>Rechnung an</CardTitle>
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
            <CardTitle>Rechnungsdetails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Ausstellungsdatum:</span>
                <span className="text-sm">{formatDateSafe(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Fälligkeitsdatum:</span>
                <span className="text-sm">{formatDateSafe(invoice.dueDate)}</span>
              </div>
              {invoice.sentAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Versendet am:</span>
                  <span className="text-sm">{formatDateSafe(invoice.sentAt)}</span>
                </div>
              )}
              {invoice.paidAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Bezahlt am:</span>
                  <span className="text-sm">{formatDateSafe(invoice.paidAt)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Positionen</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beschreibung</TableHead>
                <TableHead className="text-right">Menge</TableHead>
                <TableHead className="text-right">Einzelpreis</TableHead>
                <TableHead className="text-right">Gesamt</TableHead>
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
                <span>Zwischensumme:</span>
                <span>{formatCurrency(invoice.subtotal, DEFAULT_CURRENCY)}</span>
              </div>
              <div className="flex justify-between">
                <span>Umsatzsteuer ({invoice.taxRate}%):</span>
                <span>{formatCurrency(invoice.taxAmount, DEFAULT_CURRENCY)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Gesamt:</span>
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
            <CardTitle>Notizen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

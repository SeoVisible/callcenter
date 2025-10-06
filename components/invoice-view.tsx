/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type { Invoice } from "@/lib/invoices"
import { Button } from "@/components/ui/button"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, Send } from "lucide-react"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency'
import { formatDateSafe } from '@/lib/date'
import { toast } from "sonner"
import { formatStatusLabel } from '@/lib/status'



interface InvoiceViewProps {
  invoice: Invoice
  onBack: () => void
  onEdit: () => void
  onSend?: () => void
}

export function InvoiceView({ invoice, onBack, onEdit, onSend }: InvoiceViewProps) {
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
      } catch {
        // ignore and try next
      }
    }

  // Header: render logo on the left (replacing the textual company name), company info on the right
  const leftX = 40
  const rightX = 420
  const yBase = 40



    if (logoDataUrl) {
      try {
        // compute scaled dimensions to preserve aspect ratio and fit within bounds
        const maxW = 300
        const maxH = 120
        const naturalW = logoNaturalW || maxW
        const naturalH = logoNaturalH || maxH
        const scale = Math.min(maxW / naturalW, maxH / naturalH, 1)
        const imgW = Math.round(naturalW * scale)
        const imgH = Math.round(naturalH * scale)
        // Position logo at the very top left
        const imgY = 20
        doc.addImage(logoDataUrl, 'PNG', leftX, imgY, imgW, imgH)
      } catch {
        // fallback: print site name on the left
        doc.setFontSize(18)
        doc.text('pro-arbeitsschutz.de', leftX, yBase + 12)
      }
    } else {
      // show site name as fallback when no logo file is available in public/
      doc.setFontSize(18)
      doc.text('pro-arbeitsschutz.de', leftX, yBase + 12)
    }

  // Company name larger and positioned higher
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Pro Arbeitsschutz', rightX, yBase)
  
  // Rest of company info in normal size
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Dieselstraße 6–8', rightX, yBase + 18)
  doc.text('63165 Mühlheim am Main', rightX, yBase + 30)
  doc.text('Tel: +4961089944981', rightX, yBase + 42)
  // PDF header email updated to pro domain (PDF-only)
  doc.text('info@pro-arbeitsschutz.com', rightX, yBase + 54)

  // LEFT SIDE: Client address section (without heading)
  const clientY = yBase + 110
  
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0) // Black text
  doc.text(invoice.clientName || '', leftX, clientY)
  if (invoice.clientCompany) doc.text(invoice.clientCompany, leftX, clientY + 14)
  
  // Add client address with proper spacing
  const client = (invoice as any).client
  if (client?.address?.street) doc.text(client.address.street, leftX, clientY + 28)
  if (client?.address?.zipCode || client?.address?.city) {
    const cityLine = [client.address.zipCode, client.address.city].filter(Boolean).join(' ')
    if (cityLine) doc.text(cityLine, leftX, clientY + 42)
  }
  if (client?.address?.country && client.address.country !== 'Germany' && client.address.country !== 'Deutschland') {
    doc.text(client.address.country, leftX, clientY + 56)
  }

  // RIGHT SIDE: Only Auftragsdatum and Rechnungsdatum
  const invoiceInfoX = 420
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0) // Black text
  
  // Continue with invoice dates on the right side
  const safeDate = (d: any) => formatDateSafe(d, 'de-DE')
  const invoiceDate = safeDate(invoice.issueDate ?? invoice.createdAt)
  const serviceDate = safeDate(invoice.createdAt)

  // Add back invoice number
  const invNo = (invoice as any).invoiceNumber
  if (invNo) doc.text(`Rechnungsnummer: ${invNo}`, invoiceInfoX, clientY)
  
  const line1Y = invNo ? clientY + 14 : clientY
  if (serviceDate) doc.text(`Auftragsdatum: ${serviceDate}`, invoiceInfoX, line1Y)
  if (invoiceDate) doc.text(`Rechnungsdatum: ${invoiceDate}`, invoiceInfoX, line1Y + 14)
  if (client?.clientUniqueNumber) {
    doc.text(`Kundennummer: ${client.clientUniqueNumber}`, invoiceInfoX, line1Y + 28)
  }

  // Items table - headers matching the image exactly
    const head = showPrices ? ['Pos.', 'Menge', 'Artikel-Bezeichnung', 'Einzelpreis', 'Gesamtpreis'] : ['Pos.', 'Menge', 'Artikel-Bezeichnung']
    
    // Sort items so shipping appears last
    const sortedItems = [...invoice.lineItems].sort((a, b) => {
      const aIsShipping = a.productName.toLowerCase().includes('shipping') || a.productName.toLowerCase().includes('versand')
      const bIsShipping = b.productName.toLowerCase().includes('shipping') || b.productName.toLowerCase().includes('versand')
      
      if (aIsShipping && !bIsShipping) return 1
      if (!aIsShipping && bIsShipping) return -1
      return 0
    })
    
    const body = sortedItems.map((item, index) => {
      const position = (index + 1).toString() // Position number starting from 1
      const qty = Number(item.quantity ?? 0)
      const unit = Number(item.unitPrice ?? 0)
      const lineTotal = qty * unit
      
      // Replace "Shipping" with "Versand" in product name
      let productName = item.productName
      if (productName.toLowerCase().includes('shipping')) {
        productName = productName.replace(/shipping/gi, 'Versand')
      }
      
      if (showPrices) {
        return [position, String(qty), productName + (item.description ? ` - ${item.description}` : ''), `€ ${unit.toFixed(2)}`, `€ ${lineTotal.toFixed(2)}`]
      }
      return [position, String(qty), productName + (item.description ? ` - ${item.description}` : '')]
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
    const rightMarginForTable = 45
    const availableWidth = Math.max(pageW - leftX - rightMarginForTable, 300)

    let columnStyles: Record<string, any>
    if (showPrices) {
      const w0 = 35 // position
      const w1 = 40 // qty
      const w3 = 70 // unit price
      const w4 = 80 // total
      const descW = Math.max(availableWidth - (w0 + w1 + w3 + w4), 150)
      columnStyles = {
        '0': { cellWidth: w0, halign: 'center' }, // Position centered
        '1': { cellWidth: w1, halign: 'center' }, // Quantity centered
        '2': { cellWidth: descW, halign: 'left' }, // Description left
        '3': { cellWidth: w3, halign: 'right' }, // Unit price right
        '4': { cellWidth: w4, halign: 'right' }  // Total right
      }
    } else {
      const w0 = 35 // position
      const w1 = 40 // qty
      const descW = Math.max(availableWidth - (w0 + w1), 150)
      columnStyles = {
        '0': { cellWidth: w0, halign: 'center' }, // Position centered
        '1': { cellWidth: w1, halign: 'center' }, // Quantity centered
        '2': { cellWidth: descW, halign: 'left' } // Description left
      }
    }

    // Add document type header before table - with 22px left margin
    const documentType = showPrices ? 'Rechnung' : 'Lieferschein'
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(documentType, 42, clientY + 65) // 20 + 22px margin
    doc.setFont('helvetica', 'normal') // Reset font style

    autoTable(doc, {
      startY: clientY + 80, // Start after client and invoice info sections
      head: [head],
      body,
      headStyles: { 
        fillColor: [240, 240, 240], // Light gray header like professional invoices
        textColor: [0, 0, 0], // Black text
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: { 
        cellPadding: 4, 
        overflow: 'linebreak',
        fontSize: 9,
        lineColor: [200, 200, 200],
        lineWidth: 0.3
      },
      columnStyles,
      bodyStyles: { 
        fontSize: 9, 
        valign: 'middle'
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250] // Very light gray for alternating rows
      }
    })

    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || (clientY + 180)

  // Totals box on the right: compute totals from line items (avoid relying on possibly-mismatched invoice fields)
    if (showPrices) {
      const totalsX = 365
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

      // place values right-aligned with proper spacing from labels
      const pageWidth = typeof (doc as any).internal.pageSize.getWidth === 'function'
        ? (doc as any).internal.pageSize.getWidth()
        : (doc as any).internal.pageSize.width
      const valueX = pageWidth - 50

      // Professional totals section - clean and readable
      doc.setFontSize(11)
      doc.setTextColor(0, 0, 0) // Black text
      
      // Netto
      doc.setFont('helvetica', 'normal')
      doc.text('Gesamt Netto:', totalsX, line1Y)
      doc.text(formatCurrency(computedSubtotal, DEFAULT_CURRENCY), valueX, line1Y, { align: 'right' })

      // Tax - clear and readable format
      doc.text(`Umsatzsteuer (${taxRateNum}%):`, totalsX, line1Y + lineGap)
      doc.text(formatCurrency(computedTax, DEFAULT_CURRENCY), valueX, line1Y + lineGap, { align: 'right' })

      // Brutto (bold) - professional styling
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      const bruttoY = line1Y + lineGap * 2 + 8
      doc.text('Gesamt Brutto:', totalsX, bruttoY)
      doc.text(formatCurrency(computedTotal, DEFAULT_CURRENCY), valueX, bruttoY, { align: 'right' })
      doc.setFont('helvetica', 'normal')
    }

  // Footer with IBAN distributed in 4 columns
    const pageHeight = typeof (doc as any).internal.pageSize.getHeight === 'function'
      ? (doc as any).internal.pageSize.getHeight()
      : (doc as any).internal.pageSize.height
    
    // Footer at bottom of page
    const footerY = pageHeight - 60
    
    // Add a line separator above footer
    doc.setLineWidth(0.5)
    doc.setDrawColor(200, 200, 200)
    doc.line(leftX, footerY - 20, 550, footerY - 20)
    
    // Clean, readable footer - single line format
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    
    // Single line with proper spacing and readable information
    const footerText = 'Pro Arbeitsschutz | Dieselstraße 6–8, 63165 Mühlheim am Main | Tel: +4961089944981 | info@pro-arbeitsschutz.com'
    doc.text(footerText, leftX, footerY)
    
    // Second line with banking and VAT info
    const footerText2 = 'IBAN: DE90 5065 2124 0008 1426 22 | BIC: HELADEF1SLS'
    doc.text(footerText2, leftX, footerY + 12)

  const filename = showPrices ? `rechnung-${invoice.invoiceNumber}.pdf` : `rechnung-${invoice.invoiceNumber}-no-prices.pdf`;
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
                    <div className="-ml-1 rounded-md">
                      {getStatusBadge(invoice.status)}
                    </div>

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

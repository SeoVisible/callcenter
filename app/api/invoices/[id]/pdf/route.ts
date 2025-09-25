import { NextRequest } from "next/server"
import { PrismaClient } from "@prisma/client"
import PDFDocument from "pdfkit"
import path from 'path'

const prisma = new PrismaClient()

function writeLine(doc: PDFDocument, text: string, x: number, yRef: { y: number }, options: any = {}) {
  doc.text(text, x, yRef.y, options)
  // Advance reasonable amount — pdfkit manages line breaking; update y by height estimate
  yRef.y += 14
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const url = new URL(request.url)
  const showPrices = url.searchParams.get("prices") !== "false" // default true

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { lineItems: true, client: true },
  })
  if (!invoice) return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404 })

  // Compute totals server-side similar to other handlers
  const lineItemsWithTotal = invoice.lineItems.map((li) => ({ ...li, total: Number(li.unitPrice) * Number(li.quantity) }))
  const subtotal = lineItemsWithTotal.reduce((s, it) => s + Number(it.total), 0)
  const taxAmount = subtotal * (Number(invoice.taxRate) / 100)
  const total = subtotal + taxAmount

  // Create PDF in-memory and stream
  const doc = new PDFDocument({ size: 'A4', margin: 40 })

  // Prepare a stream to collect chunks
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer | Uint8Array) => chunks.push(Buffer.from(chunk)))
  const endPromise = new Promise<Buffer>((resolve: (buf: Buffer) => void) => doc.on('end', () => resolve(Buffer.concat(chunks))))

  // Header
  // Try render logo on top-left (if present in public folder)
  const logoPath = path.join(process.cwd(), 'public', 'nifar_logo.jpg')
  try {
    // Center the logo across the top like the dashboard header
    const pageWidth = doc.page.width
    const imgWidth = 320
    const imgX = Math.max(40, (pageWidth - imgWidth) / 2)
    doc.image(logoPath, imgX, 36, { width: imgWidth })
  } catch (e) {
    // ignore if missing
  }

  // Company block (top-right)
  const companyX = 320
  // Company title and contact (German styling)
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#c53030').text('Kompakt Arbeitsschutz', companyX, 40)
  doc.font('Helvetica').fontSize(9).fillColor('#374151')
  doc.text('Berufsbekleidung von Kopf bis Fuß', companyX, doc.y + 2)
  doc.text('Kompakt GmbH', companyX, doc.y + 6)
  doc.text('Josef-Schregel-Str. 68, 52349 Düren', companyX)
  doc.text('Tel: 02421 / 95 90 176', companyX)
  doc.text('info@kompakt-arbeitsschutz.de', companyX)

  // Invoice meta box (right)
  const metaX = 320
  const metaY = 120
  doc.rect(metaX - 6, metaY - 6, 220, 64).fillOpacity(0.03).fillAndStroke('#f3f4f6', '#e5e7eb')
  doc.fillOpacity(1)
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text(`Rechnung ${invoice.id}`, metaX, metaY)
  doc.font('Helvetica').fontSize(9).fillColor('black')
  doc.text(`Rechnungsdatum: ${new Date(invoice.createdAt).toLocaleDateString('de-DE')}`, metaX, doc.y + 4)

  // Bill To (left under logo)
  const billToY = 140
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Rechnung an:', 40, billToY)
  doc.font('Helvetica').fontSize(10).fillColor('black')
  if (invoice.client) {
    if (invoice.client.company) doc.text(invoice.client.company, 40, doc.y + 2)
    if (invoice.client.name) doc.text(invoice.client.name, 40)
    // invoice.client.address may be JSON; stringify safely
    try { if (invoice.client.address) doc.text(String(invoice.client.address), 40) } catch {}
    if (invoice.client.email) doc.text(invoice.client.email, 40)
  }

  // Table header
  const startX = 40
  let yRef = { y: Math.max(doc.y + 12, billToY + 60) }
  const tableWidth = 515
  const colDescriptionWidth = 300
  const colQtyX = startX + colDescriptionWidth + 8
  const colUnitX = colQtyX + 50
  const colTotalX = startX + tableWidth - 60

  doc.fontSize(10).fillColor('white')
  doc.rect(startX - 2, yRef.y - 6, tableWidth, 20).fill('#111827')
  doc.fillColor('white').text('Beschreibung', startX, yRef.y)
  doc.text('Menge', colQtyX, yRef.y)
  if (showPrices) doc.text('Einzelpreis', colUnitX, yRef.y, { width: 80, align: 'right' })
  if (showPrices) doc.text('Gesamt', colTotalX, yRef.y, { width: 60, align: 'right' })
  yRef.y += 24
  doc.fillColor('black')

  // Table rows
  // German formatting with comma decimals
  const formatCurrency = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  for (const item of lineItemsWithTotal) {
    const desc = item.productName + (item.description ? `\n${item.description}` : '')
    // Description column
    doc.text(desc, startX, yRef.y, { width: colDescriptionWidth })
    // Qty
    doc.text(String(item.quantity), colQtyX, yRef.y)
  if (showPrices) doc.text(formatCurrency(Number(item.unitPrice)), colUnitX, yRef.y, { width: 80, align: 'right' })
  if (showPrices) doc.text(formatCurrency(Number(item.total)), colTotalX, yRef.y, { width: 60, align: 'right' })
    yRef.y += 20
    if (yRef.y > 720) { doc.addPage(); yRef.y = 40 }
  }

  // Totals
  if (showPrices) {
    const totalsX = startX + tableWidth - 260
    // Draw a small totals table with three columns: Netto | Umsatzsteuer | Brutto
    const colNetX = totalsX
    const colTaxX = totalsX + 90
    const colGrossX = totalsX + 180
    const totalsY = yRef.y + 12

    doc.fontSize(9).fillColor('#374151').text('Gesamt Netto', colNetX, totalsY - 12, { width: 80, align: 'right' })
    doc.text('Umsatzsteuer', colTaxX, totalsY - 12, { width: 80, align: 'right' })
    doc.text('Gesamt Brutto', colGrossX, totalsY - 12, { width: 80, align: 'right' })

    doc.font('Helvetica').fontSize(10).fillColor('black')
    doc.text(`${formatCurrency(subtotal)} €`, colNetX, totalsY, { width: 80, align: 'right' })
    doc.text(`${formatCurrency(taxAmount)} €`, colTaxX, totalsY, { width: 80, align: 'right' })
    doc.font('Helvetica-Bold').text(`${formatCurrency(total)} €`, colGrossX, totalsY, { width: 80, align: 'right' })
  }

  // Subtle watermark (large light initial)
  try {
    doc.save()
    doc.rotate(-30, { origin: [300, 400] })
    doc.fontSize(80).fillColor('#f3f4f6').text('K', 200, 350, { opacity: 0.2 })
    doc.restore()
  } catch {}

  // Notes
  if (invoice.notes) {
    doc.moveDown(1)
    doc.fontSize(11).fillColor('#111827').text('Hinweise:')
    doc.fontSize(10).fillColor('black').text(invoice.notes, { width: 480 })
  }

  // Footer with bank details (example)
  const footerY = 760
  doc.fontSize(9).fillColor('#6b7280').text('Kompakt GmbH · Josef-Schregel-Str. 68 · 52349 Düren', 40, footerY)
  doc.text('Deutsche Bank · IBAN: DE89 3705 0040 0288 9522 00 · BIC: DEUTDEDB395', 40, footerY + 12)

  doc.end()
  const pdfBuffer = await endPromise

  // Convert Node Buffer to Uint8Array for Web Response
  const body = Uint8Array.from(pdfBuffer)

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.id}${showPrices ? '' : '-no-prices'}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
      // Diagnostic header to confirm this route generated the PDF and the time
      'X-PDF-BUILT-AT': new Date().toISOString(),
    },
  })
}

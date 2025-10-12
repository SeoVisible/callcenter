/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from "pdfkit"
import fs from "fs"
import path from "path"

// -----------------------------------------------------
// Types
// -----------------------------------------------------
interface InvoiceLineItem {
  productName: string
  description?: string | null
  unitPrice: number
  quantity: number
}

interface Client {
  name: string
  address?: any
  clientUniqueNumber?: string | null
}

interface Invoice {
  id: string
  invoiceNumber?: string | null
  createdAt: Date
  issueDate?: Date | null
  dueDate?: Date | null
  client: Client
  lineItems: InvoiceLineItem[]
  taxRate?: number | null
}

// -----------------------------------------------------
// Function
// -----------------------------------------------------
export async function generateInvoicePDF(invoice: Invoice): Promise<Buffer> {
  // ✅ Patch Helvetica AFM issue for serverless environments
  try {
    const AnyPDF: any = PDFDocument as any
    const proto = AnyPDF?.prototype
    if (proto && !proto.__noCoreFontsPatched) {
        const original = proto.initFonts
        proto.initFonts = function () {
        this._fontFamilies = {}
        this._fontCount = 0
        this._fontSize = 12
        this._font = null
        this._registeredFonts = {}
        // intentionally skip Helvetica default
        }
        proto.__noCoreFontsPatched = true
        proto.__initFontsOriginal = original
    }
  } catch (e) {
    console.warn('[PDF] Font patch failed:', e)
  }

  const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: false })
  const streamChunks: Buffer[] = []
  doc.on("data", (chunk: Buffer) => streamChunks.push(Buffer.from(chunk)))

  // ✅ Use Helvetica safely
  doc.font('Helvetica')

  // Currency formatter (German / EUR)
  const formatEUR = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(v || 0))

  // -----------------------------------------------------
  // Start Page
  // -----------------------------------------------------
  doc.addPage()
  const pageWidth = doc.page.width - 100
  const left = 50
  const right = 420

  // Header logo or fallback text
  try {
    const logo = path.join(process.cwd(), "public", "nifar_logo.jpg")
    if (fs.existsSync(logo)) {
      doc.image(logo, left - 10, 10, { width: 121.4, height: 118 })
    } else {
      doc.fontSize(18).text("PRO", left, 50)
      doc.text("ARBEITS", left, 68)
      doc.text("SCHUTZ", left, 86)
    }
  } catch {
    doc.fontSize(18).text("PRO", left, 50)
    doc.text("ARBEITS", left, 68)
    doc.text("SCHUTZ", left, 86)
  }

  // Company info
  doc.fontSize(11).text("Pro Arbeitsschutz", right, 50, { align: "right" })
  doc.fontSize(9)
  doc.text("Tel: +4961089944981", right, 68, { align: "right" })
  doc.text("info@pro-arbeitsschutz.com", right, 82, { align: "right" })

  // -----------------------------------------------------
  // Invoice Header Info
  // -----------------------------------------------------
  const invoiceNumber = invoice.invoiceNumber || "N/A"
  const orderDate = new Date(invoice.createdAt).toLocaleDateString("de-DE")
  const invoiceDate = invoice.issueDate
    ? new Date(invoice.issueDate).toLocaleDateString("de-DE")
    : orderDate

  let currentY = 140
  const client = invoice.client

  doc.fontSize(10).text(client.name, left, currentY)
  const addr = client.address
  if (typeof addr === "string") {
    doc.fontSize(9).text(addr, left, currentY + 14)
  } else if (addr) {
    if (addr.street) doc.text(addr.street, left, currentY + 14)
    const cityLine = [addr.zipCode, addr.city].filter(Boolean).join(" ")
    if (cityLine) doc.text(cityLine, left, currentY + 26)
  }

  doc.fontSize(9)
  doc.text(`Rechnungsnummer: ${invoiceNumber}`, right, currentY, { align: "right" })
  doc.text(`Auftragsdatum: ${orderDate}`, right, currentY + 14, { align: "right" })
  doc.text(`Rechnungsdatum: ${invoiceDate}`, right, currentY + 28, { align: "right" })
  if (client.clientUniqueNumber)
    doc.text(`Kundennummer: ${client.clientUniqueNumber}`, right, currentY + 42, { align: "right" })

  currentY += 100
  doc.fontSize(18).text("Rechnung", left, currentY)
  currentY += 30

  // -----------------------------------------------------
  // Table Header
  // -----------------------------------------------------
  const col = { pos: left + 10, qty: left + 50, desc: left + 100, unit: left + 320, total: left + 400 }
  const tableStartY = currentY + 10

  doc.rect(left, tableStartY - 5, pageWidth, 22).fillAndStroke("#e8e8e8", "#ccc")
  doc.fontSize(9).fillColor("#000")
  doc.text("Pos.", col.pos, tableStartY + 2)
  doc.text("Menge", col.qty, tableStartY + 2)
  doc.text("Artikel-Bezeichnung", col.desc, tableStartY + 2)
  doc.text("Einzelpreis", col.unit, tableStartY + 2, { width: 70, align: "right" })
  doc.text("Gesamtpreis", col.total, tableStartY + 2, { width: 70, align: "right" })

  // -----------------------------------------------------
  // Table Rows
  // -----------------------------------------------------
  let rowY = tableStartY + 28
  let subtotal = 0
  let pos = 1
  const rowHeight = 20
  const maxY = 700 // bottom limit before new page

  for (const item of invoice.lineItems) {
    const lineTotal = (item.unitPrice || 0) * (item.quantity || 0)
    subtotal += lineTotal

    if (rowY > maxY) {
      doc.addPage()
      rowY = 100
    }

    doc.fontSize(9)
    doc.text(String(pos), col.pos, rowY)
    doc.text(String(item.quantity), col.qty, rowY)
    doc.text(item.productName + (item.description ? ` - ${item.description}` : ""), col.desc, rowY, {
      width: 200,
    })
    doc.text(formatEUR(item.unitPrice), col.unit, rowY, { width: 70, align: "right" })
    doc.text(formatEUR(lineTotal), col.total, rowY, { width: 70, align: "right" })

    rowY += rowHeight
    pos++
  }

  // -----------------------------------------------------
  // Totals
  // -----------------------------------------------------
  const taxRate = invoice.taxRate ?? 19
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  const totalsY = rowY + 30
  const totalsX = 360
  doc.fontSize(10)
  doc.text("Gesamt Netto:", totalsX, totalsY)
  doc.text(formatEUR(subtotal), totalsX + 80, totalsY, { width: 70, align: "right" })
  doc.text(`Umsatzsteuer (${taxRate}%):`, totalsX, totalsY + 18)
  doc.text(formatEUR(taxAmount), totalsX + 80, totalsY + 18, { width: 70, align: "right" })
  doc.fontSize(11).text("Gesamt Brutto:", totalsX, totalsY + 42)
  doc.text(formatEUR(total), totalsX + 80, totalsY + 42, { width: 70, align: "right" })

  // -----------------------------------------------------
  // Footer
  // -----------------------------------------------------
  const footerY = 750
  doc.moveTo(left, footerY - 10).lineTo(left + pageWidth, footerY - 10).stroke("#ccc")
  doc.fontSize(9).fillColor("#666")
  doc.text(
    "Pro Arbeitsschutz | Dieselstraße 6–8, 63165 Mühlheim am Main | Tel: +4961089944981 | info@pro-arbeitsschutz.com",
    left,
    footerY
  )
  doc.text("IBAN: DE90 5065 2124 0008 1426 22 | BIC: HELADEF1SLS", left, footerY + 12)

  // -----------------------------------------------------
  // Return PDF Buffer
  // -----------------------------------------------------
  const buffer: Buffer = await new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(streamChunks)))
    doc.on("error", reject)
    doc.end()
  })

  return buffer
}

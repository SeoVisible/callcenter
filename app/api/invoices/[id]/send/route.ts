/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
// ✅ Force Node runtime – PDFKit won’t work on Edge
export const runtime = "nodejs"
import { PrismaClient } from "@prisma/client"
// @ts-expect-error - nodemailer ESM import
import nodemailer from "nodemailer"
import PDFDocument from "pdfkit"
import path from "path"
import fs from "fs"

const prisma = new PrismaClient()

// === FIXED PDF GENERATOR (no Helvetica.afm errors) ===
async function generateInvoicePDF(invoice: any): Promise<Buffer> {
  // 🔹 Step 1: find a TTF font to embed (any will do)
  const fontCandidates = [
    path.join(process.cwd(), "public", "fonts", "DejaVuSans.ttf"),
    path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"),
    path.join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf"),
    path.join(process.cwd(), "public", "fonts", "Geist-Regular.ttf"),
  ]
  const fontPath = fontCandidates.find((p) => fs.existsSync(p))
  if (!fontPath) {
    throw new Error(
      "No embeddable font found. Place a .ttf file in public/fonts/ (e.g., DejaVuSans.ttf)."
    )
  }

  // 🔹 Step 2: disable first page so no AFM lookup happens
  const doc = new PDFDocument({ size: "A4", margin: 50, autoFirstPage: false })
  const chunks: Buffer[] = []
  doc.on("data", (chunk: Buffer) => chunks.push(chunk))
  doc.on("error", (err: Error) => {
    console.error("[PDF] Stream error:", err)
  })


  // 🔹 Step 3: register and use our embedded font
  doc.registerFont("Body", fontPath)
  doc.font("Body")

  // 🔹 Step 4: now safely add the first page
  doc.addPage({ size: "A4", margins: { top: 50, left: 50, right: 50, bottom: 50 } })

  const pageWidth = doc.page.width - 100
  const leftMargin = 50
  const formatEUR = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v || 0)

  // Header logo or fallback
  try {
    const logoPath = path.join(process.cwd(), "public", "nifar_logo.jpg")
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, leftMargin, 50, { width: 180, height: 60 })
    } else {
      doc.fontSize(24).fillColor("#e74c3c").text("Kompakt Arbeitsschutz", leftMargin, 50)
      doc.fontSize(12).fillColor("#666").text("Berufsbekleidung von Kopf bis Fuß", leftMargin, 80)
    }
  } catch {
    doc.fontSize(24).fillColor("#e74c3c").text("Kompakt Arbeitsschutz", leftMargin, 50)
  }

  // Top-right company info
  const companyX = 400
  doc.fontSize(10).fillColor("#000")
  doc.text("Pro Arbeitsschutz", companyX, 50)
  doc.text("Dieselstraße 6–8", companyX, 58)
  doc.text("63165 Mühlheim am Main", companyX, 70)
  doc.text("Tel: +4961089944981", companyX, 82)
  doc.text("info@pro-arbeitsschutz.com", companyX, 94)

  let currentY = 130
  const invoiceNumber = invoice.invoiceNumber || "N/A"
  const orderDate = new Date(invoice.createdAt).toLocaleDateString("de-DE")
  const invoiceDate = (invoice as any).issueDate
    ? new Date(invoice.issueDate).toLocaleDateString("de-DE")
    : orderDate

  // Title
  doc.fontSize(20).fillColor("#000").text("RECHNUNG", leftMargin, currentY)
  currentY += 40

  // Client info (LEFT)
  if (invoice.client) {
    doc.fontSize(11).fillColor("#000").text(invoice.client.name, leftMargin, currentY)
    const clientAddress = invoice.client.address as any
    if (typeof clientAddress === "string") {
      doc.fontSize(10).text(clientAddress, leftMargin, currentY + 14)
    } else if (clientAddress) {
      if (clientAddress.street)
        doc.fontSize(10).text(clientAddress.street, leftMargin, currentY + 14)
      if (clientAddress.zipCode || clientAddress.city) {
        const cityLine = [clientAddress.zipCode, clientAddress.city].filter(Boolean).join(" ")
        doc.text(cityLine, leftMargin, currentY + 28)
      }
    }
  }

  // Invoice metadata (RIGHT)
  const invoiceInfoX = 350
  doc.fontSize(10).fillColor("#000")
  doc.text(`Rechnungsnummer: ${invoiceNumber}`, invoiceInfoX, currentY)
  let metaY = currentY + 14
  doc.text(`Auftragsdatum: ${orderDate}`, invoiceInfoX, metaY)
  metaY += 14
  doc.text(`Rechnungsdatum: ${invoiceDate}`, invoiceInfoX, metaY)
  metaY += 14
  if ((invoice.client as any)?.clientUniqueNumber) {
    doc.text(`Kundennummer: ${(invoice.client as any).clientUniqueNumber}`, invoiceInfoX, metaY)
    metaY += 14
  }
  doc.text(`Leistungsdatum: ${invoiceDate}`, invoiceInfoX, metaY)
  metaY += 14
  if (invoice.dueDate) {
    const due = new Date(invoice.dueDate).toLocaleDateString("de-DE")
    doc.text(`Fälligkeitsdatum: ${due}`, invoiceInfoX, metaY)
  }

  currentY += 100
  doc.fontSize(16).fillColor("#000").text("Rechnung", leftMargin + 22, currentY)
  currentY += 25
  doc.y = currentY + 20
  const tableStartY = doc.y

  // Table header
  const col = {
    pos: leftMargin,
    qty: leftMargin + 30,
    desc: leftMargin + 70,
    unit: leftMargin + 280,
    total: leftMargin + 350,
  }
  doc.rect(leftMargin, tableStartY - 5, pageWidth, 20).fillAndStroke("#f0f0f0", "#cccccc")
  doc.fontSize(9).fillColor("#000")
  doc.text("Pos.", col.pos, tableStartY, { width: 25, align: "center" })
  doc.text("Menge", col.qty, tableStartY, { width: 35, align: "center" })
  doc.text("Artikel-Bezeichnung", col.desc, tableStartY, { width: 200 })
  doc.text("Einzelpreis", col.unit, tableStartY, { width: 60, align: "right" })
  doc.text("Gesamtpreis", col.total, tableStartY, { width: 70, align: "right" })

  let rowY = tableStartY + 25
  let subtotal = 0
  let position = 1
  invoice.lineItems.forEach((item: any, i: number) => {
    const lineTotal = Number(item.unitPrice || 0) * Number(item.quantity || 0)
    subtotal += lineTotal
    if (i % 2 === 0) doc.rect(leftMargin, rowY - 3, pageWidth, 18).fill("#fafafa")
    doc.fontSize(9).fillColor("#000")
    doc.text(String(position), col.pos, rowY, { width: 25, align: "center" })
    doc.text(String(item.quantity), col.qty, rowY, { width: 35, align: "center" })
    doc.text(
      item.productName + (item.description ? ` - ${item.description}` : ""),
      col.desc,
      rowY,
      { width: 200 }
    )
    doc.text(formatEUR(item.unitPrice || 0), col.unit, rowY, { width: 60, align: "right" })
    doc.text(formatEUR(lineTotal), col.total, rowY, { width: 70, align: "right" })
    rowY += 18
    position++
  })
  doc.moveTo(leftMargin, rowY + 5).lineTo(leftMargin + pageWidth, rowY + 5).stroke("#cccccc")

  // Totals
  const totalsY = rowY + 25
  const totalsX = leftMargin + 280
  const taxRate = invoice.taxRate ?? 19
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  doc.fontSize(10).fillColor("#000")
  doc.text("Gesamt Netto:", totalsX, totalsY)
  doc.text(formatEUR(subtotal), totalsX + 100, totalsY, { width: 70, align: "right" })
  doc.text(`Umsatzsteuer (${taxRate}%):`, totalsX, totalsY + 15)
  doc.text(formatEUR(taxAmount), totalsX + 100, totalsY + 15, { width: 70, align: "right" })
  doc.fontSize(12)
  doc.text("Gesamt Brutto:", totalsX, totalsY + 35)
  doc.text(formatEUR(total), totalsX + 100, totalsY + 35, { width: 70, align: "right" })

  doc.fontSize(9).fillColor("#666").text("Zahlbar binnen 14 Tagen netto.", leftMargin, totalsY + 70)

  const footerY = 750
  doc.moveTo(leftMargin, footerY - 10).lineTo(leftMargin + pageWidth, footerY - 10).stroke("#cccccc")
  doc.fontSize(9).fillColor("#666")
  doc.text(
    "Pro Arbeitsschutz | Dieselstraße 6–8, 63165 Mühlheim am Main | Tel: +4961089944981 | info@pro-arbeitsschutz.com",
    leftMargin,
    footerY
  )
  doc.text("IBAN: DE90 5065 2124 0008 1426 22 | BIC: HELADEF1SLS", leftMargin, footerY + 12)

  doc.end()
  return await new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)))
  })
}

// === EMAIL SENDER ===
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const { email: overrideEmail, subject = "Rechnung", message = "" } = body

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, lineItems: true },
    })
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

    const email = overrideEmail || invoice.client?.email
    if (!email) {
      return NextResponse.json({ error: "Missing email address" }, { status: 400 })
    }

    const pdfBuffer = await generateInvoicePDF(invoice)

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "mail.privateemail.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "info@pro-arbeitsschutz.com",
        pass: process.env.SMTP_PASS || "proarbeit2024!",
      },
      tls: { rejectUnauthorized: false },
    })

    const invoiceNumber = invoice.invoiceNumber || invoice.id.slice(-6)
    const mailSubject = subject.includes("Rechnung")
      ? subject
      : `Rechnung ${invoiceNumber}`
    const mailText =
      message ||
      `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie die Rechnung ${invoiceNumber}.\n\nMit freundlichen Grüßen\nPro Arbeitsschutz Team`

    const mailOptions = {
      from: process.env.SMTP_USER || "info@pro-arbeitsschutz.com",
      to: email,
      subject: mailSubject,
      text: mailText,
      attachments: [
        {
          filename: `Rechnung-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    }

    const info = await transporter.sendMail(mailOptions)
    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected || [],
    })
  } catch (error) {
    console.error("Email send error:", error)
    return NextResponse.json(
      { error: "Failed to send email", details: (error as Error).message },
      { status: 500 }
    )
  }
}

// Optional GET debug helper
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return NextResponse.json({
    usage: "POST to this endpoint to send invoice email",
    id,
  })
}

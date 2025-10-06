import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
// @ts-expect-error: nodemailer has no types for ESM import
import nodemailer from "nodemailer"
import { formatCurrency, DEFAULT_CURRENCY } from '../../../../../lib/currency'
import PDFDocument from 'pdfkit'

// Minimal shape of Nodemailer response we care about (avoid any)
interface MailDeliveryInfo {
  messageId: string
  accepted: string[]
  rejected?: string[]
  response?: string
  envelope?: { from?: string; to?: string | string[] }
}

const prisma = new PrismaClient()

// Function to generate PDF as buffer
async function generateInvoicePDF(invoice: any): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const streamChunks: Buffer[] = []
  doc.on('data', (chunk: any) => streamChunks.push(Buffer.from(chunk)))

  // Page dimensions
  const pageWidth = doc.page.width - 100
  const leftMargin = 50

  // Header with logo and company info
  try {
    const fs = await import('fs')
    const path = await import('path')
    const logoPath = path.join(process.cwd(), 'public', 'nifar_logo.jpg')
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, leftMargin, 50, { width: 180, height: 60 })
    }
  } catch {
    // Fallback - draw company name as header
    doc.fontSize(24).fillColor('#e74c3c').text('Kompakt Arbeitsschutz', leftMargin, 50)
    doc.fontSize(12).fillColor('#666').text('Berufsbekleidung von Kopf bis Fuß', leftMargin, 80)
  }

  // Top right company details
  const companyX = 400
  doc.fontSize(10).fillColor('#000')
  doc.text('Pro Arbeitsschutz', companyX, 50)
  doc.text('Tel: +4961089944981', companyX, 65)
  doc.text('info@pro-arbeitsschutz.com', companyX, 80)
  
  let currentY = 130
  const invoiceNumber = invoice.invoiceNumber || 'N/A'
  const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('de-DE')
  
  // RECHNUNG title
  doc.fontSize(24).fillColor('#e74c3c').text('RECHNUNG', leftMargin, currentY)
  currentY += 40

  // Invoice details
  doc.fontSize(12).fillColor('#000')
  doc.text(`Rechnungsnummer: ${invoiceNumber}`, companyX, currentY)
  doc.text(`Datum: ${invoiceDate}`, companyX, currentY + 15)
  if (invoice.client.clientUniqueNumber) {
    doc.text(`Kundennummer: ${invoice.client.clientUniqueNumber}`, companyX, currentY + 30)
  }
  
  // Client information
  doc.text('Rechnungsadresse:', leftMargin, currentY)
  currentY += 20
  doc.fontSize(11)
  doc.text(invoice.client.name, leftMargin, currentY)
  if (invoice.client.address) {
    const address = typeof invoice.client.address === 'string' 
      ? invoice.client.address 
      : `${invoice.client.address.street || ''}, ${invoice.client.address.city || ''} ${invoice.client.address.zipCode || ''}`
    doc.text(address, leftMargin, currentY + 15)
    currentY += 30
  }
  
  currentY += 40

  // Add 'Rechnung' header before table - with 22px left margin
  doc.fontSize(16).fillColor('#000').font('Helvetica-Bold')
  doc.text('Rechnung', leftMargin + 22, currentY)
  doc.font('Helvetica') // Reset font
  currentY += 25

  // Table header
  const tableTop = currentY
  const itemX = leftMargin
  const quantityX = 300
  const priceX = 400
  const totalX = 500

  doc.fontSize(12).fillColor('#000')
  doc.text('Artikel', itemX, tableTop)
  doc.text('Menge', quantityX, tableTop)
  doc.text('Einzelpreis', priceX, tableTop)
  doc.text('Gesamt', totalX, tableTop)
  
  // Draw line under header
  doc.moveTo(leftMargin, tableTop + 20)
     .lineTo(pageWidth + leftMargin, tableTop + 20)
     .stroke()

  currentY = tableTop + 30

  // Table rows
  let subtotal = 0
  invoice.lineItems.forEach((item: any) => {
    const total = item.unitPrice * item.quantity
    subtotal += total
    
    doc.fontSize(10)
    doc.text(item.productName, itemX, currentY, { width: 250 })
    doc.text(item.quantity.toString(), quantityX, currentY)
    doc.text(formatCurrency(item.unitPrice, DEFAULT_CURRENCY), priceX, currentY)
    doc.text(formatCurrency(total, DEFAULT_CURRENCY), totalX, currentY)
    
    currentY += 25
  })

  // Totals
  currentY += 20
  const taxAmount = subtotal * (Number(invoice.taxRate) / 100)
  const finalTotal = subtotal + taxAmount

  doc.fontSize(11)
  doc.text(`Nettobetrag: ${formatCurrency(subtotal, DEFAULT_CURRENCY)}`, 400, currentY)
  doc.text(`MwSt. (${invoice.taxRate}%): ${formatCurrency(taxAmount, DEFAULT_CURRENCY)}`, 400, currentY + 15)
  doc.fontSize(14).fillColor('#e74c3c')
  doc.text(`Gesamtbetrag: ${formatCurrency(finalTotal, DEFAULT_CURRENCY)}`, 400, currentY + 35)

  // Payment info
  currentY += 80
  doc.fontSize(10).fillColor('#666')
  doc.text('Zahlungsinformationen:', leftMargin, currentY)
  doc.text('IBAN: DE90 5065 2124 0008 1426 22', leftMargin, currentY + 15)
  doc.text('BIC: HELADEF1SLS', leftMargin, currentY + 30)
  doc.text(`Verwendungszweck: Rechnung ${invoiceNumber}`, leftMargin, currentY + 45)

  doc.end()

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(streamChunks))
    })
  })
}

// Await dynamic route params per Next.js guidance
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    // Fetch invoice and client info
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, lineItems: true }
    })
    if (!invoice || !invoice.client?.email) {
      return NextResponse.json({ error: "Invoice or client email not found" }, { status: 404 })
    }

    // Strict SMTP transport: use configured SMTP only; no fallback to Ethereal
    const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_FROM_NAME } = process.env as Record<string, string | undefined>
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return NextResponse.json({ error: 'SMTP is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env' }, { status: 500 })
    }

    const port = Number(SMTP_PORT || (SMTP_SECURE === 'true' ? 465 : 587))
    const secure = SMTP_SECURE === 'true' || port === 465

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
    try {
      await transporter.verify()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return NextResponse.json({ error: `SMTP verify failed: ${msg}` }, { status: 500 })
    }

    // Generate PDF attachment
    const pdfBuffer = await generateInvoicePDF(invoice)
    
    // Compute total for email reference
    const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const taxAmount = subtotal * (Number(invoice.taxRate) / 100)
    const total = subtotal + taxAmount
    
    // Compose simple email (details are in attached PDF)
    const invoiceNumber = (invoice as { invoiceNumber?: string }).invoiceNumber ? `${(invoice as { invoiceNumber?: string }).invoiceNumber}` : `${invoice.id.slice(-6)}`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Rechnung ${invoiceNumber}</h2>
        <p>Sehr geehrte/r ${invoice.client.name},</p>
        <p>anbei erhalten Sie Ihre Rechnung von <strong>Pro Arbeitsschutz</strong> als PDF-Anhang.</p>
        <p>Der Gesamtbetrag beträgt <strong>${formatCurrency(total, DEFAULT_CURRENCY)}</strong>.</p>
        <p>Wir bitten Sie, den Betrag bis zum Fälligkeitsdatum zu begleichen.</p>
        
        <hr style="margin: 30px 0;">
        <div style="font-size: 12px; color: #666;">
          <p><strong>Zahlungsinformationen:</strong></p>
          <p>IBAN: DE90 5065 2124 0008 1426 22<br>
          BIC: HELADEF1SLS<br>
          Verwendungszweck: Rechnung ${invoiceNumber}</p>
          
          <p><strong>Pro Arbeitsschutz</strong><br>
          Dieselstraße 6–8<br>
          63165 Mühlheim am Main<br>
          Tel: +49 6108 9944981<br>
          info@pro-arbeitsschutz.com</p>
          
          <p style="margin-top: 20px; color: #e74c3c;">
            📎 Die detaillierte Rechnung finden Sie im PDF-Anhang.
          </p>
        </div>
      </div>
    `

    const debugCopy = process.env.EMAIL_DEBUG_COPY === 'true' ? (SMTP_FROM || SMTP_USER) : undefined
    const rawInfo = await transporter.sendMail({
      from: `"${SMTP_FROM_NAME || 'Pro Arbeitsschutz'}" <${SMTP_FROM || SMTP_USER}>`,
      to: invoice.client.email,
      bcc: debugCopy,
      envelope: {
        from: SMTP_USER || SMTP_FROM, // sets Return-Path to the authenticated mailbox
        to: invoice.client.email,
      },
      replyTo: SMTP_FROM || SMTP_USER,
      subject: `Rechnung ${invoiceNumber} - Pro Arbeitsschutz`,
      text: `Sehr geehrte/r ${invoice.client.name},\n\nanbei erhalten Sie Ihre Rechnung ${invoiceNumber} als PDF-Anhang. Gesamtbetrag: ${formatCurrency(total, DEFAULT_CURRENCY)}.\n\nMit freundlichen Grüßen\nPro Arbeitsschutz`,
      html,
      attachments: [
        {
          filename: `rechnung-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    })
    const info = rawInfo as unknown as MailDeliveryInfo
    try {
      console.log('[mail] sent', {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        envelope: info.envelope,
      })
    } catch {}

    // Update invoice status to 'sent'
    await prisma.invoice.update({
      where: { id },
      data: { status: 'sent' },
    })

    // Return delivery info (no preview in real SMTP)
    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    })
  } catch (error) {
    // Provide clearer error message to the client UI
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

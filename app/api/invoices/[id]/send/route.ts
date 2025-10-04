import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
// @ts-expect-error: nodemailer has no types for ESM import
import nodemailer from "nodemailer"
import { formatCurrency, DEFAULT_CURRENCY } from '../../../../../lib/currency'

// Minimal shape of Nodemailer response we care about (avoid any)
interface MailDeliveryInfo {
  messageId: string
  accepted: string[]
  rejected?: string[]
  response?: string
  envelope?: { from?: string; to?: string | string[] }
}

const prisma = new PrismaClient()

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

    // Compute total
    const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const taxAmount = subtotal * (Number(invoice.taxRate) / 100)
    const total = subtotal + taxAmount
    // Compose email
    const invoiceNumber = (invoice as { invoiceNumber?: string }).invoiceNumber ? `#${(invoice as { invoiceNumber?: string }).invoiceNumber}` : `#${invoice.id.slice(-6)}`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Rechnung ${invoiceNumber}</h2>
        <p>Sehr geehrte/r ${invoice.client.name},</p>
        <p>anbei erhalten Sie Ihre Rechnung von <strong>Pro Arbeitsschutz</strong>. Wir bitten Sie, den Betrag bis zum Fälligkeitsdatum zu begleichen.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f8f9fa;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Artikel</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Menge</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Einzelpreis</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Gesamt</th>
          </tr>
          ${invoice.lineItems.map(item => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.productName}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(item.unitPrice, DEFAULT_CURRENCY)}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(item.unitPrice * item.quantity, DEFAULT_CURRENCY)}</td>
            </tr>
          `).join("")}
        </table>
        
        <div style="text-align: right; margin: 20px 0;">
          <p><strong>Nettobetrag: ${formatCurrency(subtotal, DEFAULT_CURRENCY)}</strong></p>
          <p><strong>MwSt. (${invoice.taxRate}%): ${formatCurrency(taxAmount, DEFAULT_CURRENCY)}</strong></p>
          <p style="font-size: 18px; color: #e74c3c;"><strong>Gesamtbetrag: ${formatCurrency(total, DEFAULT_CURRENCY)}</strong></p>
        </div>
        
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
      text: `Sehr geehrte/r ${invoice.client.name},\n\nBitte finden Sie unten die Details zu Ihrer Rechnung ${invoiceNumber}. Gesamtbetrag: ${formatCurrency(total, DEFAULT_CURRENCY)}.\n\nMit freundlichen Grüßen\nPro Arbeitsschutz`,
      html,
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

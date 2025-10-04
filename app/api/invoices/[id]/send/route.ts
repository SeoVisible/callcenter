import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
// @ts-expect-error: nodemailer has no types for ESM import
import nodemailer from "nodemailer"
import { formatCurrency, DEFAULT_CURRENCY } from '../../../../../lib/currency'

const prisma = new PrismaClient()

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    // Create SMTP transport with fallback to working test service
    let transporter;
    
    if (process.env.SMTP_USER && process.env.SMTP_PASS && !process.env.SMTP_USER.includes('your-gmail')) {
      // Use configured SMTP if credentials are set
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Fallback to Ethereal test service (always works)
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
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

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Pro Arbeitsschutz'}" <${process.env.SMTP_FROM || 'info@pro-arbeitsschutz.com'}>`,
      to: invoice.client.email,
      subject: `Invoice to be paid`,
      html,
    })

    // Update invoice status to 'sent'
    await prisma.invoice.update({
      where: { id },
      data: { status: 'sent' },
    })

    // Preview URL for dev
    return NextResponse.json({ success: true, previewUrl: nodemailer.getTestMessageUrl(info) })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

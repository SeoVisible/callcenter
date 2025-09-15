import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
// @ts-expect-error: nodemailer has no types for ESM import
import nodemailer from "nodemailer"

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

    // Create a test SMTP transport (Ethereal for dev)
    const testAccount = await nodemailer.createTestAccount()
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })

    // Compute total
    const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const taxAmount = subtotal * (Number(invoice.taxRate) / 100)
    const total = subtotal + taxAmount
    // Compose email
    const itemsHtml = invoice.lineItems.map(item =>
      `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>${item.unitPrice}</td></tr>`
    ).join("")
    const html = `
      <h2>Invoice to be paid</h2>
      <p>Dear ${invoice.client.name},</p>
      <p>Please find your invoice from ${invoice.client.company || "our company"} below. Kindly make the payment at your earliest convenience.</p>
      <table border="1" cellpadding="5"><tr><th>Product</th><th>Qty</th><th>Unit Price</th></tr>${itemsHtml}</table>
      <p><b>Total Due: $${total.toFixed(2)}</b></p>
    `

    const info = await transporter.sendMail({
      from: 'no-reply@example.com',
      to: invoice.client.email,
      subject: `Invoice to be paid`,
      html,
    })

    // Update invoice status to 'sent'
    await prisma.invoice.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date() },
    })

    // Preview URL for dev
    return NextResponse.json({ success: true, previewUrl: nodemailer.getTestMessageUrl(info) })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

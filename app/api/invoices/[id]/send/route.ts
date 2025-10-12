/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"
import { PrismaClient } from "@prisma/client"
// @ts-expect-error - nodemailer lacks proper ESM typings in Next.js API routes
import nodemailer from "nodemailer"
import { generateInvoicePDF } from '@/lib/generate-invoice-pdf'

const prisma = new PrismaClient()

// === EMAIL ROUTE ===
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
    if (!email) return NextResponse.json({ error: "Missing client email" }, { status: 400 })

    const pdf = await generateInvoicePDF(invoice)

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

    const invNum = invoice.invoiceNumber || invoice.id.slice(-6)
    const mailSubject = subject.includes("Rechnung") ? subject : `Rechnung ${invNum}`
    const mailText =
      message ||
      `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie die Rechnung ${invNum}.\n\nMit freundlichen Grüßen\nPro Arbeitsschutz Team`

    const info = await transporter.sendMail({
      from: process.env.SMTP_USER || "info@pro-arbeitsschutz.com",
      to: email,
      subject: mailSubject,
      text: mailText,
      attachments: [{ filename: `Rechnung-${invNum}.pdf`, content: pdf }],
    })

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
    })
  } catch (err) {
    console.error("Email send error:", err)
    return NextResponse.json(
      { error: "Failed to send email", details: (err as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return NextResponse.json({ message: "Use POST to send invoice email", id })
}

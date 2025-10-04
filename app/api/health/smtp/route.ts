import { NextResponse } from 'next/server'
// @ts-expect-error ESM import lacks types
import nodemailer from 'nodemailer'

export async function GET() {
  try {
    const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env as Record<string, string | undefined>
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return NextResponse.json({ ok: false, error: 'Missing SMTP env vars' }, { status: 500 })
    }
    const port = Number(SMTP_PORT || (SMTP_SECURE === 'true' ? 465 : 587))
    const secure = SMTP_SECURE === 'true' || port === 465
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
    await transporter.verify()
    return NextResponse.json({ ok: true, host: SMTP_HOST, port, secure })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

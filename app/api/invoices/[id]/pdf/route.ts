/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server"
// Ensure Node.js runtime (PDFKit is not compatible with Edge runtime)
export const runtime = 'nodejs'
import { PrismaClient } from '@prisma/client'
import { generateInvoicePDF } from '@/lib/generate-invoice-pdf'

const prisma = new PrismaClient()

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await context.params

	// Fetch invoice with relations
	const invoice = await prisma.invoice.findUnique({ where: { id }, include: { lineItems: true, client: true } })
	if (!invoice) return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404 })

	// Generate PDF using shared function
	const buffer = await generateInvoicePDF(invoice)

    const uint8 = new Uint8Array(buffer)
    const invoiceNumberForFilename = (invoice as any).invoiceNumber || invoice.id.slice(-6)
    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Length': String(buffer.length),
      'Content-Disposition': `attachment; filename="invoice-${invoiceNumberForFilename}.pdf"`,
    })
    return new Response(uint8, { status: 200, headers })
  } catch (err) {
    const anyErr: any = err
    const body = JSON.stringify({
      error: 'PDF generation failed',
      code: anyErr?.code || 'UNKNOWN',
      stage: anyErr?.stage || 'unknown',
      message: anyErr instanceof Error ? anyErr.message : String(anyErr),
      cause: anyErr?.cause,
    })
    return new Response(body, { status: 500, headers: { 'content-type': 'application/json' } })
  }
}


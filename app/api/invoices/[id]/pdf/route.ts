/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server"
import PDFDocument from 'pdfkit'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	const { id } = await context.params

	// Fetch invoice with relations
	const invoice = await prisma.invoice.findUnique({ where: { id }, include: { lineItems: true, client: true } })
	if (!invoice) return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404 })

	// Stream PDF to buffer
	const doc = new PDFDocument({ size: 'A4', margin: 40 })
	const streamChunks: Buffer[] = []
	doc.on('data', (chunk: any) => streamChunks.push(Buffer.from(chunk)))

	// Header - try to include logo if found in public
	try {
		const fs = await import('fs')
		const path = await import('path')
		const logoPath = path.join(process.cwd(), 'public', 'nifar_logo.jpg')
		if (fs.existsSync(logoPath)) {
			doc.image(logoPath, 40, 40, { width: 120 })
		}
	    } catch {
			// ignore logo errors
		}

	// Company block
	const rightX = 420
	const yBase = 40
	doc.fontSize(10).text('Kompakt GmbH', rightX, yBase)
	doc.text('Josef-Schrögel-Str. 68', rightX, yBase + 12)
	doc.text('52349 Düren', rightX, yBase + 24)
	doc.text('Tel: +4961089944981', rightX, yBase + 36)
	doc.text('info@pro-arbeitsschutz.de', rightX, yBase + 48)
	// Footer: wrap lines and place above bottom margin, move to new page if not enough room
	const footerLines = [
		'Kompakt GmbH — Josef-Schrögel-Str. 68, 52349 Düren',
		'IBAN: DE90 5065 2124 0008 1426 22  |  BIC: HELADEF1SLS',
		'Servicehotline: +49 89 411 3  — info@pro-arbeitsschutz.de',
		'www.pro-arbeitsschutz.de'
	]

	// estimate height and page dimensions
	const bottomMargin = 40
	const lineHeight = 12
	const totalHeight = footerLines.length * lineHeight
	const pageHeight = doc.page.height
	let footerStartY = pageHeight - bottomMargin - totalHeight

	// If current y (where content ended) would overlap footer, move footer to new page
	const currentY = doc.y || 0
	const minGap = 24
	if (currentY + minGap > footerStartY) {
		doc.addPage()
		footerStartY = 60
	}

	// render footer lines
	let y = footerStartY
	doc.fontSize(9).fillColor('#666')
	for (const line of footerLines) {
		doc.text(line, 40, y)
		y += lineHeight
	}

		// Title
		doc.moveDown(3)
		doc.fontSize(20).fillColor('#282850').text('Rechnung')

		// Invoice identifier: place near company block (top-right)
		const invoiceIdY = yBase + 70
		doc.fontSize(10).fillColor('#505050').text(`Rechnungs-Nr.: ${invoice.id}`, rightX, invoiceIdY)

	// Client and meta
	doc.moveDown(1)
	const clientY = doc.y
	doc.fontSize(11).fillColor('#000').text('Rechnung an:')
	doc.fontSize(10).text(invoice.client?.name || '')
	if (invoice.client?.company) doc.text(invoice.client.company)
	if (invoice.client?.email) doc.text(invoice.client.email)

	// move to right column for meta
	const metaX = 360
	const safeDate = (d: any) => {
		try { const dt = new Date(d); if (isNaN(dt.getTime())) return '' ; return dt.toLocaleDateString() } catch { return '' }
	}
	const invoiceDate = safeDate(invoice.createdAt)
	const serviceDate = safeDate(invoice.createdAt)
	const dueDate = safeDate(invoice.dueDate)
	doc.y = clientY
	doc.x = metaX
	if (invoiceDate) doc.text(`Rechnungsdatum: ${invoiceDate}`)
	if (serviceDate) doc.text(`Leistungsdatum: ${serviceDate}`)
	if (dueDate) doc.text(`Fälligkeitsdatum: ${dueDate}`)

	doc.moveDown(1)
	// Table header
	doc.fontSize(10)
	const tableTop = doc.y
	const itemX = { qty: 40, description: 100, unit: 420, total: 480 }
	doc.text('Menge', itemX.qty, tableTop, { width: 40, align: 'right' })
	doc.text('Bezeichnung', itemX.description, tableTop)
	doc.text('Einzelpreis', itemX.unit, tableTop, { width: 60, align: 'right' })
	doc.text('Gesamt', itemX.total, tableTop, { width: 80, align: 'right' })
	doc.moveDown(0.5)

	// Items
	let subtotal = 0
	for (const li of invoice.lineItems) {
		const y = doc.y
		doc.fontSize(10).text(String(li.quantity), itemX.qty, y, { width: 40, align: 'right' })
		doc.text(li.productName + (li.description ? '\n' + li.description : ''), itemX.description, y)
		doc.text((li.unitPrice ?? 0).toFixed(2), itemX.unit, y, { width: 60, align: 'right' })
		const lineTotal = Number(li.unitPrice ?? 0) * Number(li.quantity ?? 0)
		subtotal += lineTotal
		doc.text(lineTotal.toFixed(2), itemX.total, y, { width: 80, align: 'right' })
		doc.moveDown(1)
	}

	// Totals
	const taxRate = invoice.taxRate ?? 0
	const taxAmount = subtotal * (taxRate / 100)
	const total = subtotal + taxAmount
	const finalY = doc.y + 10
	const totalsX = 360
	doc.fontSize(10).text('Gesamt Netto:', totalsX, finalY)
	doc.text(subtotal.toFixed(2), totalsX + 110, finalY, { align: 'right' })
	doc.text(`Umsatzsteuer (${taxRate}%):`, totalsX, finalY + 16)
	doc.text(taxAmount.toFixed(2), totalsX + 110, finalY + 16, { align: 'right' })
	doc.font('Helvetica-Bold').fontSize(12).text('Gesamt Brutto:', totalsX, finalY + 36)
	doc.text(total.toFixed(2), totalsX + 110, finalY + 36, { align: 'right' })

	// Footer
	doc.moveTo(40, 760).lineTo(555, 760).stroke()
	doc.fontSize(9).fillColor('#666').text('Kompakt GmbH — Josef-Schrögel-Str. 68, 52349 Düren — DE89 3700 0400 0289 5220 00', 40, 770)

	// Wait for PDF to finish and collect buffer
	const buffer: Buffer = await new Promise((resolve, reject) => {
		doc.on('end', () => resolve(Buffer.concat(streamChunks)))
		doc.on('error', reject)
		doc.end()
	})

		const uint8 = new Uint8Array(buffer)
		const headers = new Headers({
			'Content-Type': 'application/pdf',
			'Content-Length': String(buffer.length),
			'Content-Disposition': `attachment; filename="invoice-${invoice.id}.pdf"`,
		})
		return new Response(uint8, { status: 200, headers })
}


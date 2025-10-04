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
	const doc = new PDFDocument({ size: 'A4', margin: 50 })
	const streamChunks: Buffer[] = []
	doc.on('data', (chunk: any) => streamChunks.push(Buffer.from(chunk)))

	// Page dimensions
	const pageWidth = doc.page.width - 100 // Account for margins
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

	// Top right company details - simple and clean
	const companyX = 400
	doc.fontSize(10).fillColor('#000')
	doc.text('Pro Arbeitsschutz', companyX, 50)
	doc.text('Tel: +4961089944981', companyX, 65)
	doc.text('info@pro-arbeitsschutz.com', companyX, 80)
	// Layout: Client info on LEFT, Invoice info on RIGHT
	let currentY = 130
	
	const invoiceNumber = invoice.invoiceNumber || 'N/A'
	const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('de-DE')
	
	// RECHNUNG title
	doc.fontSize(20).fillColor('#000')
	doc.text('RECHNUNG', leftMargin, currentY)
	
	currentY += 40
	
	// LEFT SIDE: Client address section
	if (invoice.client) {
		doc.fontSize(10).fillColor('#000')
		doc.text('Rechnungsadresse:', leftMargin, currentY)
		
		doc.fontSize(11)
		doc.text(invoice.client.name, leftMargin, currentY + 18)
		
		// Handle address as JSON object
		const clientAddress = invoice.client.address as any
		if (typeof clientAddress === 'string') {
			doc.fontSize(10).text(clientAddress, leftMargin, currentY + 32)
		} else if (clientAddress) {
			if (clientAddress.street) doc.fontSize(10).text(clientAddress.street, leftMargin, currentY + 32)
			if (clientAddress.zipCode || clientAddress.city) {
				const cityLine = [clientAddress.zipCode, clientAddress.city].filter(Boolean).join(' ')
				doc.text(cityLine, leftMargin, currentY + 46)
			}
		}
	}
	
	// RIGHT SIDE: Invoice metadata
	const invoiceInfoX = 350
	doc.fontSize(10).fillColor('#000')
	doc.text(`Rechnungsnummer: ${invoiceNumber}`, invoiceInfoX, currentY)
	doc.text(`Rechnungsdatum: ${invoiceDate}`, invoiceInfoX, currentY + 18)
	doc.text(`Leistungsdatum: ${invoiceDate}`, invoiceInfoX, currentY + 32)
	
	if (invoice.dueDate) {
		const formattedDueDate = new Date(invoice.dueDate).toLocaleDateString('de-DE')
		doc.text(`Fälligkeitsdatum: ${formattedDueDate}`, invoiceInfoX, currentY + 46)
	}
	
	currentY += 100

	// Table structure - matching the exact layout from image
	doc.y = currentY + 20
	const tableStartY = doc.y
	
	// Table header with proper spacing and borders
	const colPositions = {
		pos: leftMargin,         // Position number
		qty: leftMargin + 30,    // Quantity  
		description: leftMargin + 70,  // Description
		unit: leftMargin + 280,  // Unit price
		total: leftMargin + 350  // Total
	}
	
	// Header background - light gray like professional invoices
	doc.rect(leftMargin, tableStartY - 5, pageWidth, 20).fillAndStroke('#f0f0f0', '#cccccc')
	
	// Header text - black and bold
	doc.fontSize(9).fillColor('#000').font('Helvetica-Bold')
	doc.text('Pos.', colPositions.pos, tableStartY, { width: 25, align: 'center' })
	doc.text('Menge', colPositions.qty, tableStartY, { width: 35, align: 'center' })
	doc.text('Artikel-Bezeichnung', colPositions.description, tableStartY, { width: 200 })
	doc.text('Einzelpreis', colPositions.unit, tableStartY, { width: 60, align: 'right' })
	doc.text('Gesamtpreis', colPositions.total, tableStartY, { width: 70, align: 'right' })
	
	// Table rows - clean and professional
	let rowY = tableStartY + 25
	let subtotal = 0
	let position = 1
	
	invoice.lineItems.forEach((item, index) => {
		const lineTotal = Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0)
		subtotal += lineTotal
		
		// Subtle alternating row colors
		if (index % 2 === 0) {
			doc.rect(leftMargin, rowY - 3, pageWidth, 18).fillAndStroke('#fafafa', '#fafafa')
		}
		
		doc.fontSize(9).fillColor('#000').font('Helvetica')
		doc.text(String(position), colPositions.pos, rowY, { width: 25, align: 'center' })
		doc.text(String(item.quantity), colPositions.qty, rowY, { width: 35, align: 'center' })
		doc.text(item.productName + (item.description ? ` - ${item.description}` : ''), colPositions.description, rowY, { width: 200 })
		doc.text(`€ ${(item.unitPrice ?? 0).toFixed(2)}`, colPositions.unit, rowY, { width: 60, align: 'right' })
		doc.text(`€ ${lineTotal.toFixed(2)}`, colPositions.total, rowY, { width: 70, align: 'right' })
		
		rowY += 18
		position++
	})
	
	// Bottom border for table
	doc.moveTo(leftMargin, rowY + 5).lineTo(leftMargin + pageWidth, rowY + 5).stroke('#cccccc')
	
	// Totals section - clean and professional
	const totalsStartY = rowY + 25
	const totalsX = leftMargin + 280
	const taxRate = invoice.taxRate ?? 19 // Default 19% German VAT
	const taxAmount = subtotal * (taxRate / 100)
	const total = subtotal + taxAmount
	
	doc.fontSize(10).fillColor('#000').font('Helvetica')
	
	// Subtotal
	doc.text('Zwischensumme:', totalsX, totalsStartY)
	doc.text(`€ ${subtotal.toFixed(2)}`, totalsX + 100, totalsStartY, { width: 70, align: 'right' })
	
	// Tax - clear and readable
	doc.text(`Umsatzsteuer ${taxRate}%:`, totalsX, totalsStartY + 15)
	doc.text(`€ ${taxAmount.toFixed(2)}`, totalsX + 100, totalsStartY + 15, { width: 70, align: 'right' })
	
	// Total - bold and prominent
	doc.font('Helvetica-Bold').fontSize(12)
	doc.text('Gesamtbetrag:', totalsX, totalsStartY + 35)
	doc.text(`€ ${total.toFixed(2)}`, totalsX + 100, totalsStartY + 35, { width: 70, align: 'right' })
	
	// Payment terms
	doc.font('Helvetica').fontSize(9).fillColor('#666')
	doc.text('Zahlbar binnen 14 Tagen netto.', leftMargin, totalsStartY + 70)
	
	// Clean footer - simple and readable
	const footerY = 750
	doc.moveTo(leftMargin, footerY - 10).lineTo(leftMargin + pageWidth, footerY - 10).stroke('#cccccc')
	
	doc.fontSize(9).fillColor('#666')
	doc.text('Pro Arbeitsschutz | Dieselstraße 6–8, 63165 Mühlheim am Main | Tel: +4961089944981 | info@pro-arbeitsschutz.com', leftMargin, footerY)
	doc.text('IBAN: DE90 5065 2124 0008 1426 22 | BIC: HELADEF1SLS', leftMargin, footerY + 12)

	// Wait for PDF to finish and collect buffer
	const buffer: Buffer = await new Promise((resolve, reject) => {
		doc.on('end', () => resolve(Buffer.concat(streamChunks)))
		doc.on('error', reject)
		doc.end()
	})

		const uint8 = new Uint8Array(buffer)
		const invoiceNumberForFilename = (invoice as any).invoiceNumber || invoice.id.slice(-6)
		const headers = new Headers({
			'Content-Type': 'application/pdf',
			'Content-Length': String(buffer.length),
			'Content-Disposition': `attachment; filename="invoice-${invoiceNumberForFilename}.pdf"`,
		})
		return new Response(uint8, { status: 200, headers })
}


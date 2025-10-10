/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
// @ts-expect-error - nodemailer ESM default import lacks type definitions in this setup
import nodemailer from "nodemailer"
import PDFDocument from "pdfkit"

const prisma = new PrismaClient()

// EXACT same layout as the download route
async function generateInvoicePDF(invoice: any): Promise<Buffer> {
	const fs = await import("fs")
	const path = await import("path")

	// Ensure AFM fonts are available in Next.js runtime (prevents ENOENT on Helvetica.afm)
	try {
		const sourceDir = path.join(process.cwd(), 'node_modules', 'pdfkit', 'js', 'data')
		const nextServerDir = path.join(process.cwd(), '.next', 'server')
		const targets = [
			path.join(nextServerDir, 'vendor-chunks', 'data'),
			path.join(nextServerDir, 'chunks', 'data'), // Vercel path observed in logs
		]
		if (fs.existsSync(nextServerDir) && fs.existsSync(sourceDir)) {
			for (const dir of targets) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }) }
			for (const file of fs.readdirSync(sourceDir)) {
				if (file.endsWith('.afm')) {
					const src = path.join(sourceDir, file)
					for (const dir of targets) {
						const dest = path.join(dir, file)
						if (!fs.existsSync(dest)) { try { fs.copyFileSync(src, dest) } catch {} }
					}
				}
			}
		}
	} catch (e) {
		// Non-fatal: keep going but log context
		try { console.warn('[PDF] AFM ensure failed:', (e as Error).message) } catch {}
	}

	const doc = new PDFDocument({ size: "A4", margin: 50 })
	const streamChunks: Buffer[] = []
	doc.on("data", (chunk: any) => streamChunks.push(Buffer.from(chunk)))

	// Currency formatter (German / EUR)
	const formatEUR = (value: number) =>
		new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(value || 0))

	// Prefer a bundled TTF/OTF font to avoid AFM lookups in serverless/prod
	try {
		// Best-effort: resolve packaged font path even in serverless (Vercel) bundles
		try {
			const mod = await import('module') as any
			const req = mod.createRequire(import.meta.url)
			const ttfPath = req.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf')
			if (ttfPath) {
				doc.registerFont('Helvetica', ttfPath)
				doc.font(ttfPath)
			}
		} catch {}

		if (!doc._font) {
			const candidates = [
				process.env.PDF_FONT_PATH,
				// Fallbacks if the above resolution failed
				path.join(process.cwd(), 'node_modules', 'dejavu-fonts-ttf', 'ttf', 'DejaVuSans.ttf'),
				path.join(process.cwd(), 'public', 'fonts', 'Inter-Regular.ttf'),
				path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Regular.ttf'),
				path.join(process.cwd(), 'public', 'fonts', 'Geist-Regular.ttf'),
				path.join(process.cwd(), 'public', 'fonts', 'DejaVuSans.ttf'),
			].filter(Boolean) as string[]
			for (const p of candidates) {
				if (fs.existsSync(p)) {
					doc.registerFont('Helvetica', p)
					doc.font(p)
					break
				}
			}
		}
	} catch (e) {
		// Non-fatal: PDFKit will fallback to core fonts
		try { console.warn('[PDF] Font selection failed:', (e as Error).message) } catch {}
	}

	// Page layout
	const pageWidth = doc.page.width - 100
	const leftMargin = 50

	// Header logo or fallback
	try {
		const logoPath = path.join(process.cwd(), "public", "nifar_logo.jpg")
		if (fs.existsSync(logoPath)) {
			doc.image(logoPath, leftMargin, 50, { width: 180, height: 60 })
		}
	} catch (e) {
		doc.fontSize(24).fillColor("#e74c3c").text("Kompakt Arbeitsschutz", leftMargin, 50)
		doc.fontSize(12).fillColor("#666").text("Berufsbekleidung von Kopf bis Fuß", leftMargin, 80)
		try { console.warn('[PDF] Header image failed:', (e as Error).message) } catch {}
	}

	// Top right company info
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
		? new Date((invoice as any).issueDate).toLocaleDateString("de-DE")
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

	// Invoice meta (RIGHT)
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
		const formattedDueDate = new Date(invoice.dueDate).toLocaleDateString('de-DE')
		doc.text(`Fälligkeitsdatum: ${formattedDueDate}`, invoiceInfoX, metaY)
	}

	currentY += 100

	// Section header
	doc.fontSize(16).fillColor("#000").text("Rechnung", leftMargin + 22, currentY)
	currentY += 25

	doc.y = currentY + 20
	const tableStartY = doc.y

	// Table columns
	const colPositions = {
		pos: leftMargin,
		qty: leftMargin + 30,
		description: leftMargin + 70,
		unit: leftMargin + 280,
		total: leftMargin + 350,
	}

	// Table header
	doc.rect(leftMargin, tableStartY - 5, pageWidth, 20).fillAndStroke("#f0f0f0", "#cccccc")
	doc.fontSize(9).fillColor("#000")
	doc.text("Pos.", colPositions.pos, tableStartY, { width: 25, align: "center" })
	doc.text("Menge", colPositions.qty, tableStartY, { width: 35, align: "center" })
	doc.text("Artikel-Bezeichnung", colPositions.description, tableStartY, { width: 200 })
	doc.text("Einzelpreis", colPositions.unit, tableStartY, { width: 60, align: "right" })
	doc.text("Gesamtpreis", colPositions.total, tableStartY, { width: 70, align: "right" })

	let rowY = tableStartY + 25
	let subtotal = 0
	let position = 1

	invoice.lineItems.forEach((item: any, index: number) => {
		const lineTotal = Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0)
		subtotal += lineTotal

		if (index % 2 === 0) {
			doc.rect(leftMargin, rowY - 3, pageWidth, 18).fillAndStroke("#fafafa", "#fafafa")
		}

		doc.fontSize(9).fillColor("#000")
		doc.text(String(position), colPositions.pos, rowY, { width: 25, align: "center" })
		doc.text(String(item.quantity), colPositions.qty, rowY, { width: 35, align: "center" })
		doc.text(
			item.productName + (item.description ? ` - ${item.description}` : ""),
			colPositions.description,
			rowY,
			{ width: 200 }
		)
		doc.text(formatEUR(Number(item.unitPrice ?? 0)), colPositions.unit, rowY, {
			width: 60,
			align: "right",
		})
		doc.text(formatEUR(lineTotal), colPositions.total, rowY, {
			width: 70,
			align: "right",
		})

		rowY += 18
		position++
	})

	doc.moveTo(leftMargin, rowY + 5).lineTo(leftMargin + pageWidth, rowY + 5).stroke("#cccccc")

	// Totals
	const totalsStartY = rowY + 25
	const totalsX = leftMargin + 280
	const taxRate = invoice.taxRate ?? 19
	const taxAmount = subtotal * (taxRate / 100)
	const total = subtotal + taxAmount

	doc.fontSize(10).fillColor("#000")
	doc.text("Gesamt Netto:", totalsX, totalsStartY)
	doc.text(formatEUR(subtotal), totalsX + 100, totalsStartY, { width: 70, align: "right" })
	doc.text(`Umsatzsteuer (${taxRate}%):`, totalsX, totalsStartY + 15)
	doc.text(formatEUR(taxAmount), totalsX + 100, totalsStartY + 15, { width: 70, align: "right" })
	doc.fontSize(12)
	doc.text("Gesamt Brutto:", totalsX, totalsStartY + 35)
	doc.text(formatEUR(total), totalsX + 100, totalsStartY + 35, { width: 70, align: "right" })

	doc.fontSize(9).fillColor("#666").text("Zahlbar binnen 14 Tagen netto.", leftMargin, totalsStartY + 70)

	const footerY = 750
	doc.moveTo(leftMargin, footerY - 10).lineTo(leftMargin + pageWidth, footerY - 10).stroke("#cccccc")

	doc.fontSize(9).fillColor("#666")
	doc.text(
		"Pro Arbeitsschutz | Dieselstraße 6–8, 63165 Mühlheim am Main | Tel: +4961089944981 | info@pro-arbeitsschutz.com",
		leftMargin,
		footerY
	)
	doc.text("IBAN: DE90 5065 2124 0008 1426 22 | BIC: HELADEF1SLS", leftMargin, footerY + 12)

	const buffer: Buffer = await new Promise((resolve, reject) => {
		doc.on("end", () => resolve(Buffer.concat(streamChunks)))
		doc.on("error", (err: unknown) => {
			const e: any = new Error('PDFKit stream error')
			e.code = 'PDFKIT_STREAM_ERROR'
			e.stage = 'finalize'
			e.cause = err instanceof Error ? err.message : String(err)
			reject(e)
		})
		doc.end()
	})
	return buffer
}

// EMAIL route
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await context.params
		const body = await request.json().catch(() => ({}))
		const { email: requestEmail, subject = "Rechnung", message = "" } = body

		const invoice = await prisma.invoice.findUnique({
			where: { id },
			include: { client: true, lineItems: true },
		})
		if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

		const email = requestEmail || invoice.client?.email
		if (!email) {
			return NextResponse.json(
				{ error: "No email address found for client" },
				{ status: 400 }
			)
		}

		// Generate PDF (surface errors clearly)
		let pdfBuffer: Buffer
		try {
			pdfBuffer = await generateInvoicePDF(invoice)
		} catch (err) {
			const anyErr: any = err
			const msg = err instanceof Error ? err.message : String(err)
			const code = anyErr?.code || 'PDF_GENERATION_ERROR'
			const stage = anyErr?.stage || 'unknown'
			const cause = anyErr?.cause || undefined
			try { console.error('[PDF] generation error:', { code, stage, msg, cause }) } catch {}
			return NextResponse.json({ error: 'PDF generation failed', code, stage, message: msg, cause }, { status: 500 })
		}

		// Configure SMTP from environment (production-safe)
		const SMTP_HOST = process.env.SMTP_HOST || 'mail.privateemail.com'
		const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
		const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465
		const SMTP_USER = process.env.SMTP_USER
		const SMTP_PASS = process.env.SMTP_PASS
		const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || 'info@pro-arbeitsschutz.com'

		if (!SMTP_USER || !SMTP_PASS) {
			return NextResponse.json(
				{ error: 'SMTP credentials missing', details: 'Set SMTP_USER and SMTP_PASS in environment' },
				{ status: 500 }
			)
		}

		const transporter = nodemailer.createTransport({
			host: SMTP_HOST,
			port: SMTP_PORT,
			secure: SMTP_SECURE,
			requireTLS: !SMTP_SECURE,
			auth: { user: SMTP_USER, pass: SMTP_PASS },
			connectionTimeout: 20000,
			greetingTimeout: 20000,
			socketTimeout: 30000,
			logger: process.env.SMTP_DEBUG === 'true',
			debug: process.env.SMTP_DEBUG === 'true',
		})

		// Verify SMTP connection first for clearer errors in production
		try {
			await transporter.verify()
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			return NextResponse.json({ error: 'SMTP verification failed', details: msg, host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE }, { status: 500 })
		}

		const invoiceNumber = invoice.invoiceNumber || invoice.id.slice(-6)
		const emailSubject = subject.includes("Rechnung")
			? subject
			: `Rechnung ${invoiceNumber}`
		const emailMessage =
			message ||
			`Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie die Rechnung ${invoiceNumber}.\n\nMit freundlichen Grüßen\nPro Arbeitsschutz Team`

		const mailOptions = {
			from: SMTP_FROM,
			to: email,
			subject: emailSubject,
			text: emailMessage,
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
		console.error("Email send error:", error instanceof Error ? error.stack || error.message : String(error))
		return NextResponse.json(
			{ error: "Failed to send email", details: (error as Error).message },
			{ status: 500 }
		)
	}
}

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

	const doc = new PDFDocument({ size: "A4", margin: 50 })
	const streamChunks: Buffer[] = []
	doc.on("data", (chunk: any) => streamChunks.push(Buffer.from(chunk)))

	// Page layout
	const pageWidth = doc.page.width - 100
	const leftMargin = 50

	// Header logo or fallback
	try {
		const logoPath = path.join(process.cwd(), "public", "nifar_logo.jpg")
		if (fs.existsSync(logoPath)) {
			doc.image(logoPath, leftMargin, 50, { width: 180, height: 60 })
		}
	} catch {
		doc.fontSize(24).fillColor("#e74c3c").text("Kompakt Arbeitsschutz", leftMargin, 50)
		doc.fontSize(12).fillColor("#666").text("Berufsbekleidung von Kopf bis Fuß", leftMargin, 80)
	}

	// Top right company info
	const companyX = 400
	doc.fontSize(10).fillColor("#000")
	doc.text("Pro Arbeitsschutz", companyX, 50)
	doc.text("Tel: +4961089944981", companyX, 65)
	doc.text("info@pro-arbeitsschutz.com", companyX, 80)

	let currentY = 130
	const invoiceNumber = invoice.invoiceNumber || "N/A"
	const invoiceDate = new Date(invoice.createdAt).toLocaleDateString("de-DE")

	// Title
	doc.fontSize(20).fillColor("#000").text("RECHNUNG", leftMargin, currentY)
	currentY += 40

	// Client info (LEFT)
	if (invoice.client) {
		doc.fontSize(10).fillColor("#000").text("Rechnungsadresse:", leftMargin, currentY)
		doc.fontSize(11).text(invoice.client.name, leftMargin, currentY + 18)

		const clientAddress = invoice.client.address as any
		if (typeof clientAddress === "string") {
			doc.fontSize(10).text(clientAddress, leftMargin, currentY + 32)
		} else if (clientAddress) {
			if (clientAddress.street)
				doc.fontSize(10).text(clientAddress.street, leftMargin, currentY + 32)
			if (clientAddress.zipCode || clientAddress.city) {
				const cityLine = [clientAddress.zipCode, clientAddress.city].filter(Boolean).join(" ")
				doc.text(cityLine, leftMargin, currentY + 46)
			}
		}
	}

	// Invoice meta (RIGHT)
	const invoiceInfoX = 350
	doc.fontSize(10).fillColor("#000")
	doc.text(`Rechnungsnummer: ${invoiceNumber}`, invoiceInfoX, currentY)
	doc.text(`Rechnungsdatum: ${invoiceDate}`, invoiceInfoX, currentY + 18)

	if ((invoice.client as any).clientUniqueNumber) {
		doc.text(`Kundennummer: ${(invoice.client as any).clientUniqueNumber}`, invoiceInfoX, currentY + 32)
		doc.text(`Leistungsdatum: ${invoiceDate}`, invoiceInfoX, currentY + 46)
	} else {
		doc.text(`Leistungsdatum: ${invoiceDate}`, invoiceInfoX, currentY + 32)
	}

	if (invoice.dueDate) {
		const formattedDueDate = new Date(invoice.dueDate).toLocaleDateString("de-DE")
		const dueY = (invoice.client as any).clientUniqueNumber ? currentY + 60 : currentY + 46
		doc.text(`Fälligkeitsdatum: ${formattedDueDate}`, invoiceInfoX, dueY)
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
		doc.text(`€ ${(item.unitPrice ?? 0).toFixed(2)}`, colPositions.unit, rowY, {
			width: 60,
			align: "right",
		})
		doc.text(`€ ${lineTotal.toFixed(2)}`, colPositions.total, rowY, {
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
	doc.text("Zwischensumme:", totalsX, totalsStartY)
	doc.text(`€ ${subtotal.toFixed(2)}`, totalsX + 100, totalsStartY, { width: 70, align: "right" })
	doc.text(`Umsatzsteuer ${taxRate}%:`, totalsX, totalsStartY + 15)
	doc.text(`€ ${taxAmount.toFixed(2)}`, totalsX + 100, totalsStartY + 15, { width: 70, align: "right" })
	doc.fontSize(12)
	doc.text("Gesamtbetrag:", totalsX, totalsStartY + 35)
	doc.text(`€ ${total.toFixed(2)}`, totalsX + 100, totalsStartY + 35, { width: 70, align: "right" })

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
		doc.on("error", reject)
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

		const pdfBuffer = await generateInvoicePDF(invoice)

		const transporter = nodemailer.createTransport({
			host: "mail.privateemail.com",
			port: 587,
			secure: false,
			auth: {
				user: process.env.SMTP_USER || "info@pro-arbeitsschutz.com",
				pass: process.env.SMTP_PASS || "proarbeit2024!",
			},
			tls: { rejectUnauthorized: false },
		})

		const invoiceNumber = invoice.invoiceNumber || invoice.id.slice(-6)
		const emailSubject = subject.includes("Rechnung")
			? subject
			: `Rechnung ${invoiceNumber}`
		const emailMessage =
			message ||
			`Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie die Rechnung ${invoiceNumber}.\n\nMit freundlichen Grüßen\nPro Arbeitsschutz Team`

		const mailOptions = {
			from: process.env.SMTP_USER || "info@pro-arbeitsschutz.com",
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
		console.error("Email send error:", error)
		return NextResponse.json(
			{ error: "Failed to send email", details: (error as Error).message },
			{ status: 500 }
		)
	}
}

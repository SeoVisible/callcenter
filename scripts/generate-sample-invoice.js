const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

function formatCurrencyDE(v) {
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function generate() {
  const outPath = path.join(__dirname, '..', 'tmp', 'sample-invoice.pdf')
  try { fs.mkdirSync(path.dirname(outPath), { recursive: true }) } catch {}

  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  const stream = fs.createWriteStream(outPath)
  doc.pipe(stream)

  // centered logo if exists
  const logoPath = path.join(process.cwd(), 'public', 'nifar_logo.jpg')
  try {
    const pageWidth = doc.page.width
    const imgWidth = 320
    const imgX = Math.max(40, (pageWidth - imgWidth) / 2)
    if (fs.existsSync(logoPath)) doc.image(logoPath, imgX, 36, { width: imgWidth })
  } catch (e) {}

  // Company block
  const companyX = 320
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#c53030').text('Kompakt Arbeitsschutz', companyX, 40)
  doc.font('Helvetica').fontSize(9).fillColor('#374151')
  doc.text('Berufsbekleidung von Kopf bis Fuß', companyX, doc.y + 2)
  doc.text('Kompakt GmbH', companyX, doc.y + 6)
  doc.text('Josef-Schregel-Str. 68, 52349 Düren', companyX)
  doc.text('Tel: +4961089944981', companyX)
  doc.text('info@kompakt-arbeitsschutz.de', companyX)

  // Invoice meta
  const metaX = 320
  const metaY = 120
  doc.rect(metaX - 6, metaY - 6, 220, 64).fillOpacity(0.03).fillAndStroke('#f3f4f6', '#e5e7eb')
  doc.fillOpacity(1)
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text(`Rechnung R1234`, metaX, metaY)
  doc.font('Helvetica').fontSize(9).fillColor('black')
  doc.text(`Rechnungsdatum: ${new Date().toLocaleDateString('de-DE')}`, metaX, doc.y + 4)

  // Bill To
  const billToY = 140
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Rechnung an:', 40, billToY)
  doc.font('Helvetica').fontSize(10).fillColor('black')
  doc.text('Morina-Bau', 40, doc.y + 2)
  doc.text('Muhamet Morina', 40)
  doc.text('Bürgermeister-Hainz-str. 12, 63165 Mühlheim', 40)

  // Table
  const startX = 40
  let yRef = { y: Math.max(doc.y + 12, billToY + 60) }
  const tableWidth = 515
  const colDescriptionWidth = 300
  const colQtyX = startX + colDescriptionWidth + 8
  const colUnitX = colQtyX + 50
  const colTotalX = startX + tableWidth - 60

  doc.fontSize(10).fillColor('white')
  doc.rect(startX - 2, yRef.y - 6, tableWidth, 20).fill('#111827')
  doc.fillColor('white').text('Beschreibung', startX, yRef.y)
  doc.text('Menge', colQtyX, yRef.y)
  doc.text('Einzelpreis', colUnitX, yRef.y, { width: 80, align: 'right' })
  doc.text('Gesamt', colTotalX, yRef.y, { width: 60, align: 'right' })
  yRef.y += 24
  doc.fillColor('black')

  const rows = [
    { desc: 'MOTION TEX LIGHT - Gr.48', qty: 1, unit: 19.99 },
    { desc: 'MOTION TEX LIGHT - Gr.50', qty: 1, unit: 19.99 },
    { desc: 'Versandkostenanteil', qty: 1, unit: 9.95 },
  ]

  let subtotal = 0
  for (const item of rows) {
    const total = item.qty * item.unit
    subtotal += total
    doc.text(item.desc, startX, yRef.y, { width: colDescriptionWidth })
    doc.text(String(item.qty), colQtyX, yRef.y)
    doc.text(formatCurrencyDE(item.unit), colUnitX, yRef.y, { width: 80, align: 'right' })
    doc.text(formatCurrencyDE(total), colTotalX, yRef.y, { width: 60, align: 'right' })
    yRef.y += 20
  }

  const taxRate = 19
  const taxAmount = +(subtotal * (taxRate / 100))
  const total = subtotal + taxAmount

  // Totals block (three-column German style)
  const totalsX = startX + tableWidth - 260
  const colNetX = totalsX
  const colTaxX = totalsX + 90
  const colGrossX = totalsX + 180
  const totalsY = yRef.y + 12

  doc.fontSize(9).fillColor('#374151').text('Gesamt Netto', colNetX, totalsY - 12, { width: 80, align: 'right' })
  doc.text('Umsatzsteuer', colTaxX, totalsY - 12, { width: 80, align: 'right' })
  doc.text('Gesamt Brutto', colGrossX, totalsY - 12, { width: 80, align: 'right' })

  doc.font('Helvetica').fontSize(10).fillColor('black')
  doc.text(`${formatCurrencyDE(subtotal)} €`, colNetX, totalsY, { width: 80, align: 'right' })
  doc.text(`${formatCurrencyDE(taxAmount)} €`, colTaxX, totalsY, { width: 80, align: 'right' })
  doc.font('Helvetica-Bold').text(`${formatCurrencyDE(total)} €`, colGrossX, totalsY, { width: 80, align: 'right' })

  // Footer
  const footerY = 760
  doc.fontSize(9).fillColor('#6b7280').text('Kompakt GmbH · Josef-Schregel-Str. 68 · 52349 Düren', 40, footerY)
  doc.text('Deutsche Bank · IBAN: DE89 3705 0040 0288 9522 00 · BIC: DEUTDEDB395', 40, footerY + 12)

  doc.end()

  await new Promise((res, rej) => stream.on('finish', res).on('error', rej))
  console.log('Sample invoice written to', outPath)
}

generate().catch((e) => { console.error(e); process.exit(1) })

// Backfill script: set InvoiceItem.buyingPrice from Product.buyingPrice
// Usage:
//   node scripts/backfill-invoiceitem-buyingprice.js        # update invoice items where buyingPrice IS NULL
//   node scripts/backfill-invoiceitem-buyingprice.js --force  # also update invoice items where buyingPrice === 0

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const force = process.argv.includes('--force')
  console.log(`Backfill invoiceItem.buyingPrice (force=${force})`)

  const where = force
    ? { OR: [{ buyingPrice: null }, { buyingPrice: 0 }] }
    : { buyingPrice: null }

  const items = await prisma.invoiceItem.findMany({ where, select: { id: true, productId: true } })
  console.log(`Found ${items.length} invoice items needing backfill`)

  const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))]
  if (productIds.length === 0) {
    console.log('No items with an associated product to update; exiting.')
    return
  }

  const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, buyingPrice: true } })
  const buyingById = Object.fromEntries(products.map(p => [p.id, p.buyingPrice]))

  let updated = 0
  for (const it of items) {
    if (!it.productId) continue
    const bp = buyingById[it.productId]
    if (bp === undefined) continue
    await prisma.invoiceItem.update({ where: { id: it.id }, data: { buyingPrice: bp } })
    updated++
    if (updated % 100 === 0) process.stdout.write(`.${updated}`)
  }

  console.log(`\nUpdated ${updated} invoice items.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

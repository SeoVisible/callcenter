require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const id = process.argv[2]
  const price = process.argv[3]
  if (!id) {
    console.error('Usage: node scripts/set-buying-price.js <productId> <price>')
    process.exit(1)
  }
  const bp = price !== undefined ? Number(price) : 0
  const product = await prisma.product.update({ where: { id }, data: { buyingPrice: bp } })
  console.log('Updated product:', JSON.stringify(product, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

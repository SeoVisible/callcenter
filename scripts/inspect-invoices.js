const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.$queryRawUnsafe('SELECT id, status::text as status_text, "createdAt", "updatedAt" FROM "Invoice" ORDER BY "createdAt" DESC LIMIT 10')
  console.log('Invoices (raw):', rows)
  await prisma.$disconnect()
}

main().catch(err => { console.error(err); prisma.$disconnect() })

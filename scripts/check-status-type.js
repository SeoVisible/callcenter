const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'Invoice' AND column_name = 'status'
  `)
  console.log('Invoice.status column info:', rows)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); prisma.$disconnect() })

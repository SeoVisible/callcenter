const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  try {
    const inv = await p.invoice.findMany({ take: 5, orderBy: { createdAt: 'desc' } })
    console.log('invoices:', inv.map(i => ({ id: i.id, status: i.status })))
  } catch (e) {
    console.error('fetch error', e)
    process.exitCode = 1
  } finally {
    await p.$disconnect()
  }
}

main()

const { PrismaClient } = require('@prisma/client')
;(async () => {
  const prisma = new PrismaClient()
  try {
    console.log('Adding sentAt and paidAt columns (direct)...')
    const stmts = [
      'ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "sentAt" timestamp;',
      'ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paidAt" timestamp;'
    ]
    for (const s of stmts) {
      try {
        console.log('Executing:', s)
        await prisma.$executeRawUnsafe(s)
        console.log('OK')
      } catch (e) {
        console.error('Statement failed:', e.message || e)
      }
    }
  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
})()

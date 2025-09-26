const { PrismaClient } = require('@prisma/client')
;(async () => {
  const prisma = new PrismaClient()
  try {
    console.log('Columns (case-insensitive) for table names containing "invoice":')
    const cols = await prisma.$queryRawUnsafe(
      `SELECT table_name, column_name, data_type, udt_name, is_nullable FROM information_schema.columns WHERE lower(table_name) LIKE '%invoice%' ORDER BY table_name, ordinal_position`
    )
    console.log(JSON.stringify(cols, null, 2))

    console.log('\nPostgres enum types that look like InvoiceStatus:')
    const enums = await prisma.$queryRawUnsafe(
      `SELECT t.typname AS enum_name, e.enumlabel AS enum_label FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE lower(t.typname) LIKE '%invoice%' ORDER BY t.typname, e.enumsortorder`
    )
    console.log(JSON.stringify(enums, null, 2))
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
})()

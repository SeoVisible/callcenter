const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Resetting database: deleting data and seeding superadmin + demo product')

  // Delete dependent records first
  await prisma.invoiceItem.deleteMany().catch(() => {})
  await prisma.invoice.deleteMany().catch(() => {})
  await prisma.client.deleteMany().catch(() => {})
  await prisma.product.deleteMany().catch(() => {})
  await prisma.user.deleteMany().catch(() => {})

  // Create superadmin
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@admin.com',
      password: '123',
      role: 'superadmin',
    }
  })

  // Create a demo product owned by admin
  const product = await prisma.product.create({
    data: {
      name: 'Demo Product',
      description: 'Demo product for reset seed',
      price: 10.0,
      buyingPrice: 5.0,
      stock: 100,
      category: 'Default',
      sku: 'DEMO-001',
      createdBy: admin.id,
      isGlobal: true,
    }
  })

  console.log('Reset seed completed:')
  console.log('admin email: admin@admin.com, password: 123')
  console.log('product sku:', product.sku)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

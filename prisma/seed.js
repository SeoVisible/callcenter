const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Running seed...')

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin',
      role: 'superadmin',
    },
  })

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'user@example.com',
      password: 'password',
      role: 'user',
    },
  })

  // sku is not declared unique in the Prisma schema, so use findFirst + create
  let product = await prisma.product.findFirst({ where: { sku: 'PROD-001' } })
  if (!product) {
    product = await prisma.product.create({
      data: {
        name: 'Sample Product',
        description: 'A sample product for testing',
        price: 19.99,
        category: 'Default',
        sku: 'PROD-001',
        createdBy: admin.id,
        isGlobal: true,
      },
    })
  }

  const client = await prisma.client.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      name: 'Example Client',
      email: 'client@example.com',
      phone: '+1-555-0100',
      company: 'Example Co',
      address: { street: '123 Main St', city: 'Metropolis', zip: '12345' },
      notes: 'Seeded client',
      createdBy: user.id,
    },
  })

  // Create an invoice with one line item
  const invoice = await prisma.invoice.create({
    data: {
      clientId: client.id,
      createdBy: user.id,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // +7 days
      taxRate: 0.19,
      notes: 'Seeded invoice',
      status: 'pending',
      lineItems: {
        create: [
          {
            productId: product.id,
            productName: product.name,
            description: product.description,
            quantity: 2,
            unitPrice: product.price,
          },
        ],
      },
    },
  })

  console.log('Seed completed:')
  console.log('admin id:', admin.id)
  console.log('user id:', user.id)
  console.log('product id:', product.id)
  console.log('client id:', client.id)
  console.log('invoice id:', invoice.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

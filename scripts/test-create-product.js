const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // pick an existing user so we don't violate FK constraints
  const user = await prisma.user.findFirst()
  if (!user) {
    console.error('No user found in the database. Create a user first.')
    process.exit(1)
  }

  try {
    const product = await prisma.product.create({
      data: {
        name: `test product ${Date.now()}`,
        description: 'test product for stock field',
        price: 30.0,
        stock: 149,
        category: 'Software',
        sku: `TEST-${Date.now()}`,
        createdBy: user.id,
        isGlobal: true,
      },
    })
    console.log('Created product:', product)
  } catch (err) {
    console.error('Error creating product:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()

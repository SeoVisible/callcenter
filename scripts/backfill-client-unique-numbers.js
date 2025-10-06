const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function backfillClientUniqueNumbers() {
  try {
    console.log('🔄 Starting backfill of client unique numbers...')
    
    // Get all clients that don't have a clientUniqueNumber
    const clientsWithoutNumbers = await prisma.client.findMany({
      where: {
        clientUniqueNumber: null
      },
      orderBy: {
        createdAt: 'asc' // Assign numbers based on creation order
      }
    })
    
    console.log(`📊 Found ${clientsWithoutNumbers.length} clients without unique numbers`)
    
    if (clientsWithoutNumbers.length === 0) {
      console.log('✅ All clients already have unique numbers!')
      return
    }
    
    // Get the highest existing client unique number to continue from there
    const clientWithHighestNumber = await prisma.client.findFirst({
      where: {
        clientUniqueNumber: {
          not: null
        }
      },
      orderBy: {
        clientUniqueNumber: 'desc'
      }
    })
    
    // Determine starting number
    let nextNumber = 101 // Default starting number
    if (clientWithHighestNumber?.clientUniqueNumber) {
      const currentNumber = parseInt(clientWithHighestNumber.clientUniqueNumber.replace('K', ''))
      nextNumber = currentNumber + 1
      console.log(`📈 Starting from K${nextNumber} (continuing after ${clientWithHighestNumber.clientUniqueNumber})`)
    } else {
      console.log(`📈 Starting from K${nextNumber} (first client unique numbers)`)
    }
    
    // Update each client with a unique number
    for (const client of clientsWithoutNumbers) {
      const clientUniqueNumber = `K${nextNumber}`
      
      await prisma.client.update({
        where: { id: client.id },
        data: { clientUniqueNumber }
      })
      
      console.log(`✅ Updated ${client.name} -> ${clientUniqueNumber}`)
      nextNumber++
    }
    
    console.log(`🎉 Successfully backfilled ${clientsWithoutNumbers.length} client unique numbers!`)
    console.log(`📊 Numbers assigned: K101 to K${nextNumber - 1}`)
    
  } catch (error) {
    console.error('❌ Error during backfill:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the backfill
backfillClientUniqueNumbers()
  .then(() => {
    console.log('✨ Backfill completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Backfill failed:', error)
    process.exit(1)
  })
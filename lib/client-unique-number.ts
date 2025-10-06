import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Generate the next client unique number starting from K101
 * Format: K101, K102, K103, etc.
 * @returns Promise<string> - The next client unique number
 */
export async function generateNextClientUniqueNumber(): Promise<string> {
  try {
    // Find the highest existing client unique number
    const lastClient = await prisma.client.findFirst({
      where: {
        clientUniqueNumber: {
          not: null,
          startsWith: 'K'
        }
      },
      orderBy: {
        clientUniqueNumber: 'desc'
      },
      select: {
        clientUniqueNumber: true
      }
    })

    // If no clients exist, start with K101
    if (!lastClient?.clientUniqueNumber) {
      return 'K101'
    }

    // Extract the number part from the last client unique number
    const numberPart = lastClient.clientUniqueNumber.substring(1) // Remove 'K' prefix
    const lastNumber = parseInt(numberPart)
    
    if (isNaN(lastNumber)) {
      // If parsing fails, start from K101
      return 'K101'
    }

    // Generate next number
    const nextNumber = lastNumber + 1
    return `K${nextNumber}`
    
  } catch (error) {
    console.error('Error generating client unique number:', error)
    
    // Fallback: try to count all clients and add to 100
    try {
      const clientCount = await prisma.client.count()
      return `K${101 + clientCount}`
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError)
      return 'K101' // Ultimate fallback
    }
  }
}

/**
 * Check if a client unique number already exists
 * @param clientUniqueNumber - The client unique number to check
 * @returns Promise<boolean> - True if the number exists
 */
export async function isClientUniqueNumberExists(clientUniqueNumber: string): Promise<boolean> {
  try {
    const existingClient = await prisma.client.findUnique({
      where: { clientUniqueNumber }
    })
    return !!existingClient
  } catch (error) {
    console.error('Error checking client unique number existence:', error)
    return false
  }
}

/**
 * Get all client unique numbers for reference
 * @returns Promise<string[]> - Array of all client unique numbers
 */
export async function getAllClientUniqueNumbers(): Promise<string[]> {
  try {
    const clients = await prisma.client.findMany({
      where: {
        clientUniqueNumber: {
          not: null
        }
      },
      select: {
        clientUniqueNumber: true
      },
      orderBy: {
        clientUniqueNumber: 'asc'
      }
    })

    return clients.map(client => client.clientUniqueNumber!).filter(Boolean)
  } catch (error) {
    console.error('Error fetching client unique numbers:', error)
    return []
  }
}
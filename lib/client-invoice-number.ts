import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Generate the next invoice number for a specific client
 * Each client gets their own sequential numbering starting from 001
 * @param clientId - The ID of the client
 * @returns Promise<string> - The next invoice number (e.g., "001", "002", "003")
 */
export async function generateNextInvoiceNumberForClient(clientId: string): Promise<string> {
  try {
    // Find the highest invoice number for this specific client
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        clientId: clientId,
        invoiceNumber: {
          not: null
        }
      },
      orderBy: {
        invoiceNumber: 'desc'
      },
      select: {
        invoiceNumber: true
      }
    })

    // If no invoices exist for this client, start with 001
    if (!lastInvoice?.invoiceNumber) {
      return '001'
    }

    // Parse the last invoice number and increment
    const lastNumber = parseInt(lastInvoice.invoiceNumber)
    if (isNaN(lastNumber)) {
      // If the invoice number is not a valid number, start with 001
      return '001'
    }

    const nextNumber = lastNumber + 1
    return nextNumber.toString().padStart(3, '0')
  } catch (error) {
    console.error('Error generating client-specific invoice number:', error)
    
    // Fallback to 001 if there's any error
    return '001'
  }
}

/**
 * Get all invoice numbers for a specific client
 * @param clientId - The ID of the client
 * @returns Promise<string[]> - Array of invoice numbers for this client
 */
export async function getClientInvoiceNumbers(clientId: string): Promise<string[]> {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        clientId: clientId,
        invoiceNumber: {
          not: null
        }
      },
      orderBy: {
        invoiceNumber: 'asc'
      },
      select: {
        invoiceNumber: true
      }
    })

    return invoices.map(invoice => invoice.invoiceNumber!).filter(Boolean)
  } catch (error) {
    console.error('Error fetching client invoice numbers:', error)
    return []
  }
}

/**
 * Check if an invoice number already exists for a specific client
 * @param clientId - The ID of the client
 * @param invoiceNumber - The invoice number to check
 * @returns Promise<boolean> - True if the number exists for this client
 */
export async function isInvoiceNumberExistsForClient(clientId: string, invoiceNumber: string): Promise<boolean> {
  try {
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        clientId: clientId,
        invoiceNumber: invoiceNumber
      }
    })

    return !!existingInvoice
  } catch (error) {
    console.error('Error checking invoice number existence:', error)
    return false
  }
}
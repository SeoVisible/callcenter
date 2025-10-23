import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function generateNextInvoiceNumber(): Promise<string> {
  try {
    // Find the highest existing invoice number across ALL clients and increment
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
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
    
    if (!lastInvoice?.invoiceNumber) {
      return '001'
    }
    
    const lastNumber = parseInt(lastInvoice.invoiceNumber)
    if (isNaN(lastNumber)) {
      return '001'
    }
    
    const nextNumber = lastNumber + 1
    return nextNumber.toString().padStart(3, '0')
  } catch (error) {
    console.error('Error generating global invoice number:', error)
    
    // Ultimate fallback
    return '001'
  }
}
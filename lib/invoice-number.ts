import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function generateNextInvoiceNumber(): Promise<string> {
  try {
    // Get the next sequence value
    const result = await prisma.$queryRaw<[{ nextval: bigint }]>`
      SELECT nextval('invoice_number_seq') as nextval;
    `
    
    const nextNumber = Number(result[0].nextval)
    return nextNumber.toString().padStart(3, '0')
  } catch (error) {
    console.error('Error generating invoice number:', error)
    
    // Fallback: find the highest existing invoice number and increment
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
    return (lastNumber + 1).toString().padStart(3, '0')
  }
}
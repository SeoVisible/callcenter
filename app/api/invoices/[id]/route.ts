import { NextRequest, NextResponse } from "next/server"
import { PrismaClient, Invoice as PrismaInvoice, InvoiceItem as PrismaInvoiceItem, Client as PrismaClientType } from "@prisma/client"

const prisma = new PrismaClient()

type InvoiceWithRelations = PrismaInvoice & { lineItems: PrismaInvoiceItem[], client?: PrismaClientType | null }

function computeTotals(invoice: InvoiceWithRelations) {
  const lineItemsWithTotal = invoice.lineItems.map((item) => ({
    ...item,
    total: item.unitPrice * item.quantity,
  }))
  const subtotal = lineItemsWithTotal.reduce(
    (sum: number, item) => sum + item.total,
    0
  )
  const taxAmount = subtotal * (Number(invoice.taxRate) / 100)
  const total = subtotal + taxAmount
  return { subtotal, taxAmount, total, lineItemsWithTotal }
}

function addClientFields(invoice: InvoiceWithRelations | (InvoiceWithRelations & { subtotal: number, taxAmount: number, total: number, lineItems: PrismaInvoiceItem[] })) {
  return {
    ...invoice,
    clientName: invoice.client?.name || "",
    clientEmail: invoice.client?.email || "",
    clientCompany: invoice.client?.company || "",
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const data = await request.json()

  // Handle line items update: delete old, create new
  if (data.lineItems) {
    // Remove all old line items
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
  }

  // Update invoice fields (excluding lineItems)
  const updateData: Record<string, unknown> = { ...data }
  delete updateData.lineItems
  if (updateData.dueDate) {
    updateData.dueDate = new Date(updateData.dueDate as string)
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: updateData,
    include: { lineItems: true, client: true },
  })

  // Re-create line items if provided
  let updatedInvoice = invoice
  if (data.lineItems) {
    const lineItems = data.lineItems.map((item: { productId: string, productName: string, description: string, quantity: number, unitPrice: number }) => ({
      productId: item.productId,
      productName: item.productName,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      invoiceId: id,
    }))
    await prisma.invoiceItem.createMany({ data: lineItems })
    // Fetch the invoice again with new line items
    const found = await prisma.invoice.findUnique({
      where: { id },
      include: { lineItems: true, client: true },
    })
    if (found) {
      updatedInvoice = found
    } else {
      return NextResponse.json(
        { error: "Invoice not found after update" },
        { status: 404 }
      )
    }
  }

  const { subtotal, taxAmount, total, lineItemsWithTotal } = computeTotals(
    updatedInvoice
  )
  return NextResponse.json(
    addClientFields({
      ...updatedInvoice,
      subtotal,
      taxAmount,
      total,
      lineItems: lineItemsWithTotal,
    })
  )
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  await prisma.invoice.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

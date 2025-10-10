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
  const taxAmount = subtotal * Number(invoice.taxRate)
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

  // Server-side validation: if lineItems provided, ensure unitPrice >= product.price for each submitted item
  if (data.lineItems) {
  const productIds = Array.from(new Set((data.lineItems as Array<Record<string, unknown>>).map((li) => String((li as Record<string, unknown>).productId)).filter(Boolean).filter((id) => id !== "virtual-shipping"))) as string[];
    if (productIds.length > 0) {
      const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, price: true } });
      const priceById: Record<string, number> = {};
      for (const p of products) priceById[p.id] = Number(p.price ?? 0);

      for (const li of data.lineItems) {
        const minPrice = priceById[String(li.productId)] ?? 0;
        if (Number(li.unitPrice) < minPrice) {
          return NextResponse.json({ error: `Line item for productId ${li.productId} has unitPrice ${li.unitPrice} which is below the product price ${minPrice}` }, { status: 400 });
        }
      }
    }

    // Handle line items update: delete old, create new
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
    // Verify all products exist before creating line items (exclude virtual products)
    const productIds = data.lineItems.map((item: { productId?: string | null }) => item.productId).filter((id: string | null | undefined): id is string => Boolean(id) && id !== "virtual-shipping")
    if (productIds.length > 0) {
      const existingProducts = await prisma.product.findMany({ 
        where: { id: { in: productIds } },
        select: { id: true }
      })
      const existingProductIds = new Set(existingProducts.map(p => p.id))
      
      // Check for missing products
      const missingProductIds = productIds.filter((id: string) => !existingProductIds.has(id))
      if (missingProductIds.length > 0) {
        return NextResponse.json(
          { error: `Products not found: ${missingProductIds.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const lineItems = data.lineItems.map((item: { productId: string | null, productName: string, description: string, quantity: number, unitPrice: number }) => ({
      productId: (item.productId === "virtual-shipping" || !item.productId) ? null : item.productId,
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
  try {
    // Remove dependent invoice items first to satisfy FK constraints
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
    await prisma.invoice.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete invoice' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  const found = await prisma.invoice.findUnique({
    where: { id },
    include: { lineItems: true, client: true },
  })

  if (!found) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  const { subtotal, taxAmount, total, lineItemsWithTotal } = computeTotals(found as InvoiceWithRelations)

  return NextResponse.json(
    addClientFields({
      ...found,
      subtotal,
      taxAmount,
      total,
      lineItems: lineItemsWithTotal,
    })
  )
}

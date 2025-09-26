import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  // Fetch invoice items for this product and include invoice + client
  const items = await prisma.invoiceItem.findMany({
    where: { productId: id },
    include: { invoice: { include: { client: true } } },
  })

  // Fetch product to show its current price and buying price
  const product = await prisma.product.findUnique({ where: { id } })

  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1)

  let totalSold = 0
  let revenueThisYear = 0
  let profitThisYear = 0

  const clientsMap: Record<string, { id: string; name: string; quantity: number; revenue: number; profit: number }> = {}

  for (const it of items) {
    const qty = Number(it.quantity ?? 0)
    // Use current product prices for revenue/profit calculation per user's request.
    // Fallback to invoice item values if product is not found or prices are missing.
    const productPrice = Number(product?.price ?? it.unitPrice ?? 0)
  // `product` may come from an older generated Prisma client type that doesn't
  // include `buyingPrice` yet; cast to a narrow local type to avoid `any`.
  type ProductPartial = { buyingPrice?: number; price?: number }
  const p = product as unknown as ProductPartial
  const productBP = Number(p.buyingPrice ?? it.buyingPrice ?? 0)
    totalSold += qty

    const invoiceDate = it.invoice?.createdAt ? new Date(it.invoice.createdAt) : null
    const revenue = productPrice * qty
    const profit = (productPrice - productBP) * qty
    if (invoiceDate && invoiceDate >= yearStart) {
      revenueThisYear += revenue
      profitThisYear += profit
    }

    const client = it.invoice?.client
    if (client) {
      const key = client.id
      if (!clientsMap[key]) clientsMap[key] = { id: client.id, name: client.name, quantity: 0, revenue: 0, profit: 0 }
      clientsMap[key].quantity += qty
      // For top client aggregates, use product-based revenue/profit as well
      clientsMap[key].revenue += revenue
      clientsMap[key].profit += profit
    }
  }

  const topClients = Object.values(clientsMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5)

  return NextResponse.json({
    totalSold,
    revenueThisYear,
    profitThisYear,
    topClients,
    product: {
      price: Number(product?.price ?? 0),
      buyingPrice: Number(product?.buyingPrice ?? 0),
    },
  })
}

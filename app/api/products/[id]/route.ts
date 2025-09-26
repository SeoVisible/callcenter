import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

type ProductUpdate = {
  name?: string
  description?: string
  price?: number
  buyingPrice?: number
  stock?: number
  category?: string
  sku?: string
  isGlobal?: boolean
}


export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const data = await req.json();
  console.debug('[api] PUT /api/products/:id - raw body', JSON.stringify(data))
  // Only allow safe fields to be updated here. Include `buyingPrice` so updates
  // coming from the product form are persisted to the database.
  const allowed = ["name", "description", "price", "buyingPrice", "stock", "category", "sku", "isGlobal"]
  const updateData: Record<string, unknown> = {}
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      updateData[key] = data[key]
    }
  }
  console.debug('[api] computed updateData before coercion', JSON.stringify(updateData))
  // Coerce numeric fields safely
  if (updateData.price !== undefined) updateData.price = Number(updateData.price) || 0
  if (updateData.buyingPrice !== undefined) updateData.buyingPrice = Number(updateData.buyingPrice) || 0
  if (updateData.stock !== undefined) updateData.stock = Number.isFinite(Number(updateData.stock)) ? Number(updateData.stock) : 0

  console.debug('[api] computed updateData after coercion', JSON.stringify(updateData))

  // Try to update including buyingPrice. If the runtime Prisma client is
  // out-of-date it may throw a ValidationError mentioning an unknown
  // argument (e.g. `buyingPrice`). In that case, retry without the field so
  // the API remains functional until you restart the server after
  // regenerating the Prisma client.
  try {
    type ProductUpdate = {
      name?: string
      description?: string
      price?: number
      buyingPrice?: number
      stock?: number
      category?: string
      sku?: string
      isGlobal?: boolean
    }
    const product = await prisma.product.update({ where: { id }, data: updateData as unknown as ProductUpdate })
  console.debug('[api] prisma update result', JSON.stringify(product))
  return NextResponse.json(product)
  } catch (err: unknown) {
    const e = err as { message?: string }
    const msg = typeof e?.message === 'string' ? e.message : ''
    if (msg.includes('Unknown argument `buyingPrice`') || msg.includes("Unknown argument 'buyingPrice'")) {
      const { buyingPrice, ...safeUpdate } = updateData as Record<string, unknown>
      const product = await prisma.product.update({ where: { id }, data: safeUpdate as unknown as ProductUpdate })
      console.debug('[api] prisma update result (fallback)', JSON.stringify(product))
      // Log what we extracted and also inspect the DB value so we can tell
      // whether the buyingPrice exists in the database.
      console.debug('[api] extracted buyingPrice value (fallback):', buyingPrice, 'type:', typeof buyingPrice)
      try {
        const dbVal = await prisma.$queryRaw`SELECT "buyingPrice" FROM "Product" WHERE id = ${id}`
        console.debug('[api] DB raw select buyingPrice result', JSON.stringify(dbVal))
      } catch (qErr) {
        console.error('[api] DB select for buyingPrice failed', qErr)
      }

      const bp = buyingPrice as number | undefined
      if (bp !== undefined) {
        try {
          // Force-persist the buyingPrice. If the runtime client doesn't
          // support the column, raw SQL will still write to the DB.
          await prisma.$executeRaw`UPDATE "Product" SET "buyingPrice" = ${bp} WHERE id = ${id}`
          const reloaded = await prisma.product.findUnique({ where: { id } })
          console.debug('[api] reloaded product after raw buyingPrice update', JSON.stringify(reloaded))
          return NextResponse.json(reloaded)
        } catch (rawErr) {
          console.error('[api] raw buyingPrice update failed', rawErr)
          return NextResponse.json(product)
        }
      }
      return NextResponse.json(product)
    }
    throw err
  }
}


export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

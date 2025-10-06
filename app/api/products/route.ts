import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key"

interface JwtPayload {
  id?: string
  [key: string]: unknown
}

export async function GET() {
  const products = await prisma.product.findMany()
  return NextResponse.json(products)
}

async function getUserFromRequest(req: Request) {
  const cookie = req.headers.get("cookie") || ""
  const token = cookie.split(";").find((c) => c.trim().startsWith("token="))?.split("=")[1]
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    const userId = typeof payload === 'object' && payload !== null && typeof payload.id === 'string' ? payload.id : undefined
    if (!userId) return null
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return null
  // Omit password safely without creating an unused variable
  const userCopy = { ...user }
  delete (userCopy as Record<string, unknown>)['password']
  return userCopy
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const data = await req.json()
  // Ensure stock is a number and default to 0
  const safeData = {
    ...data,
    stock: Number.isFinite(data?.stock) ? Number(data.stock) : 0,
    // Coerce buyingPrice if present
    ...(data?.buyingPrice !== undefined ? { buyingPrice: Number(data.buyingPrice) || 0 } : {}),
  }
  try {
    const product = await prisma.product.create({ data: safeData })
    return NextResponse.json(product)
  } catch (err: unknown) {
    const e = err as { message?: string }
    const msg = typeof e?.message === 'string' ? e.message : ''
    if (msg.includes('Unknown argument `buyingPrice`') || msg.includes("Unknown argument 'buyingPrice'")) {
      const { buyingPrice, ...safe } = safeData as Record<string, unknown>
      // Build a typed create object for Prisma. Use a narrow cast to the expected data shape.
      const createData = {
        name: String(safe.name ?? ''),
        description: String(safe.description ?? ''),
        price: Number(safe.price ?? 0),
        category: String(safe.category ?? ''),
        sku: String(safe.sku ?? ''),
        stock: Number.isFinite(Number(safe.stock)) ? Number(safe.stock) : 0,
        isGlobal: Boolean(safe.isGlobal ?? false),
      }
      if (buyingPrice !== undefined) {
        const createDataWithBP = { ...createData, buyingPrice: Number(buyingPrice) } as Parameters<typeof prisma.product.create>[0]['data']
        const product = await prisma.product.create({ data: createDataWithBP })
        // If we have buyingPrice, persist it via raw SQL and return the reloaded row
        const bp = buyingPrice as number | undefined
        if (bp !== undefined) {
          try {
            await prisma.$executeRaw`UPDATE "Product" SET "buyingPrice" = ${bp} WHERE id = ${product.id}`
            const reloaded = await prisma.product.findUnique({ where: { id: product.id } })
            return NextResponse.json(reloaded)
          } catch (rawErr) {
            console.error('[api] raw buyingPrice update after create failed', rawErr)
            return NextResponse.json(product)
          }
        }
        return NextResponse.json(product)
      }
      const product = await prisma.product.create({ data: createData as Parameters<typeof prisma.product.create>[0]['data'] })
      // If we have buyingPrice, persist it via raw SQL and return the reloaded row
      const bp = buyingPrice as number | undefined
      if (bp !== undefined) {
        try {
          await prisma.$executeRaw`UPDATE "Product" SET "buyingPrice" = ${bp} WHERE id = ${product.id}`
          const reloaded = await prisma.product.findUnique({ where: { id: product.id } })
          return NextResponse.json(reloaded)
        } catch (rawErr) {
          console.error('[api] raw buyingPrice update after create failed', rawErr)
          return NextResponse.json(product)
        }
      }
      return NextResponse.json(product)
    }
    throw err
  }
}

export async function PUT(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const data = await req.json()
  const { id, ...rest } = data
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Allow update if superadmin or owner
  if (user.role !== "superadmin" && existing.createdBy !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Sanitize stock if present
  const updateData = {
    ...rest,
    ...(rest.stock !== undefined ? { stock: Number.isFinite(rest.stock) ? Number(rest.stock) : 0 } : {}),
    ...(rest.buyingPrice !== undefined ? { buyingPrice: Number(rest.buyingPrice) || 0 } : {}),
  }
  try {
    const product = await prisma.product.update({ where: { id }, data: updateData })
    return NextResponse.json(product)
  } catch (err: unknown) {
    const e = err as { message?: string }
    const msg = typeof e?.message === 'string' ? e.message : ''
    if (msg.includes('Unknown argument `buyingPrice`') || msg.includes("Unknown argument 'buyingPrice'")) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { buyingPrice: _unused, ...safeUpdate } = updateData as Record<string, unknown>
      const product = await prisma.product.update({ where: { id }, data: safeUpdate as unknown as Record<string, unknown> })
      return NextResponse.json(product)
    }
    throw err
  }
}

export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const data = await req.json()
  const { id } = data
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Allow delete if superadmin or owner
  if (user.role !== "superadmin" && existing.createdBy !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.product.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

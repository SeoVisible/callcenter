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
  }
  const product = await prisma.product.create({ data: safeData })
  return NextResponse.json(product)
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
  }
  const product = await prisma.product.update({ where: { id }, data: updateData })
  return NextResponse.json(product)
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

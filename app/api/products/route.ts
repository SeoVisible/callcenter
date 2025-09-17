import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key"

export async function GET() {
  const products = await prisma.product.findMany()
  return NextResponse.json(products)
}

async function getUserFromRequest(req: Request) {
  const cookie = req.headers.get("cookie") || ""
  const token = cookie.split(";").find((c) => c.trim().startsWith("token="))?.split("=")[1]
  if (!token) return null
  try {
    const payload: any = jwt.verify(token, JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!user) return null
    const { password: _unused, ...userSafe } = user
    return userSafe
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

import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key"

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || ""
  const token = cookie.split(";").find((c) => c.trim().startsWith("token="))?.split("=")[1]
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id?: string }
    // Optionally, fetch user from DB for fresh data
    const user = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!user) return NextResponse.json({ user: null }, { status: 200 })
  // Omit password safely by copying and deleting the key
  const userCopy = { ...user }
  delete (userCopy as Record<string, unknown>)['password']
  return NextResponse.json({ user: userCopy })
  } catch {
    return NextResponse.json({ user: null }, { status: 200 })
  }
}

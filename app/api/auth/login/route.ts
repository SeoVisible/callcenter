import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key"

export async function POST(req: Request) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 })
  }
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }
  // Create JWT
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" })
  // Set cookie
  const response = NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role })
  // Set secure attribute in production so browsers accept the cookie over HTTPS (Vercel)
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.headers.set(
    "Set-Cookie",
    `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secureFlag}`
  )
  return response
}

import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  const { email, password } = await req.json()
  console.log('Login attempt:', { email, password })
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 })
  }
  const user = await prisma.user.findUnique({ where: { email } })
  console.log('User from DB:', user)
  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }
  // Do not return password in response
  const { password: _unused, ...userData } = user
  return NextResponse.json(userData)
}

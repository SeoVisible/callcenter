
import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  const users = await prisma.user.findMany()
  // Remove password from response
  const usersSafe = users.map(({ password, ...u }) => u)
  return NextResponse.json(usersSafe)
}

export async function POST(req: Request) {
  const { email, name, role, password: _password } = await req.json()
  if (!email || !name || !role || !_password) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }
  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 })
  }
  const user = await prisma.user.create({
    data: { email, name, role, password: _password },
  })
  // Do not return password in response — omit via copy+delete
  const userCopy = { ...user }
  delete (userCopy as Record<string, unknown>)['password']
  return NextResponse.json(userCopy)
}

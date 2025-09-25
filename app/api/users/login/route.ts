import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: "Invalid or empty JSON body", details: String(err) }, { status: 400 });
  }
  try {
    const { email, password: _password } = body;
    if (!email || !_password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== _password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
  // Do not return password in response — omit via copy+delete
  const userCopy = { ...user }
  delete (userCopy as Record<string, unknown>)['password']
  return NextResponse.json(userCopy)
  } catch (err) {
    return NextResponse.json({ error: "Login failed", details: String(err) }, { status: 500 });
  }
}

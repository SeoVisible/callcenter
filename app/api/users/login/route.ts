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
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    // Do not return password in response
    const { password: _unused, ...userData } = user;
    return NextResponse.json(userData);
  } catch (err) {
    return NextResponse.json({ error: "Login failed", details: String(err) }, { status: 500 });
  }
}

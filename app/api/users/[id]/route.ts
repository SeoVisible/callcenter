import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()


export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const data = await req.json();
  if (!id) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }
  try {
    const user = await prisma.user.update({
      where: { id },
      data,
    });
  // Omit password safely by copying and deleting the key
  const userCopy = { ...user }
  delete (userCopy as Record<string, unknown>)['password']
  return NextResponse.json(userCopy)
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

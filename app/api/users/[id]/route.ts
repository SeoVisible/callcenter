import { NextResponse } from "next/server"
import { PrismaClient, Prisma } from "@prisma/client"

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

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 })
  }

  try {
    const deleted = await prisma.user.delete({ where: { id } })
    const userCopy = { ...deleted }
    delete (userCopy as Record<string, unknown>)['password']
    return NextResponse.json({ success: true, user: userCopy })
  } catch (err) {
    // Handle common Prisma errors with friendly messages
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025 = "An operation failed because it depends on one or more records that were required but not found."
      if (err.code === 'P2025') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      // P2003 = Foreign key constraint failed on the field
      if (err.code === 'P2003') {
        return NextResponse.json({ error: 'User cannot be deleted because related records exist' }, { status: 409 })
      }
    }
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}

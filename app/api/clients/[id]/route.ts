import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const data = await request.json()
  const client = await prisma.client.update({ where: { id }, data })
  return NextResponse.json(client)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  await prisma.client.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

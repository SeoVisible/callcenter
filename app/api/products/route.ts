import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  const products = await prisma.product.findMany()
  return NextResponse.json(products)
}

export async function POST(req: Request) {
  const data = await req.json()
  const product = await prisma.product.create({ data })
  return NextResponse.json(product)
}

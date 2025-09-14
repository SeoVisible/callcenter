import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" }
  })
  return NextResponse.json(clients)
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    // Validate required fields
    const requiredFields = [
      "name",
      "email",
      "phone",
      "company",
      "address",
      "notes",
      "createdBy"
    ]
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Validate address structure
    const addressFields = ["street", "city", "state", "zipCode", "country"]
    for (const field of addressFields) {
      if (!data.address[field]) {
        return NextResponse.json({ error: `Missing address field: ${field}` }, { status: 400 })
      }
    }

    // Map to flat fields if needed (Prisma schema expects address as a JSON or as separate fields)
    // If address is a JSON field, you can store it directly. If not, adjust accordingly.
    // Here, let's assume address is a JSON field in the Prisma model (if not, let me know to adjust)

    const client = await prisma.client.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        address: data.address, // If address is not JSON, split into fields
        notes: data.notes,
        createdBy: data.createdBy,
      }
    })
    return NextResponse.json(client)
  } catch (err: unknown) {
    // Prisma or other error
    const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : undefined;
    return NextResponse.json({ error: message || "Failed to create client" }, { status: 500 })
  }
}

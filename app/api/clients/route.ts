import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { generateNextClientUniqueNumber } from "@/lib/client-unique-number"

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

    // Ensure address object exists; we will normalize missing keys (including
    // `state`) so clients created from the UI (which no longer includes the
    // province input) still succeed.
    if (!data.address || typeof data.address !== 'object') {
      return NextResponse.json({ error: `Missing required field: address` }, { status: 400 })
    }

    // Normalize address and ensure `state` exists (may be empty string)
    const normalizedAddress = {
      street: data.address.street ?? "",
      city: data.address.city ?? "",
      state: data.address.state ?? "",
      zipCode: data.address.zipCode ?? "",
      country: data.address.country ?? "Germany",
    }

    // Map to flat fields if needed (Prisma schema expects address as a JSON or as separate fields)
    // If address is a JSON field, you can store it directly. If not, adjust accordingly.
    // Here, let's assume address is a JSON field in the Prisma model (if not, let me know to adjust)

    // Generate unique client number (K101, K102, etc.)
    const clientUniqueNumber = await generateNextClientUniqueNumber()

    const client = await prisma.client.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        address: normalizedAddress, // store normalized address object
        notes: data.notes,
        createdBy: data.createdBy,
        clientUniqueNumber: clientUniqueNumber,
      }
    })
    return NextResponse.json(client)
  } catch (err: unknown) {
    // Prisma or other error
    const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : undefined;
    return NextResponse.json({ error: message || "Failed to create client" }, { status: 500 })
  }
}

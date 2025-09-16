import { NextResponse } from "next/server"
import { PrismaClient, Invoice as PrismaInvoice, InvoiceItem as PrismaInvoiceItem, Client as PrismaClientType } from "@prisma/client"

const prisma = new PrismaClient()

type InvoiceWithRelations = PrismaInvoice & { lineItems: PrismaInvoiceItem[], client?: PrismaClientType | null, user?: { name?: string, email?: string } | null }

function computeTotals(invoice: InvoiceWithRelations) {
  const lineItemsWithTotal = invoice.lineItems.map((item) => ({
    ...item,
    total: item.unitPrice * item.quantity
  }))
  const subtotal = lineItemsWithTotal.reduce(
    (sum: number, item) => sum + item.total,
    0
  )
  const taxAmount = subtotal * (Number(invoice.taxRate) / 100)
  const total = subtotal + taxAmount
  return { subtotal, taxAmount, total, lineItemsWithTotal }
}

function addClientFields(invoice: InvoiceWithRelations | (InvoiceWithRelations & { subtotal: number, taxAmount: number, total: number, lineItems: PrismaInvoiceItem[] })) {
  return {
    ...invoice,
    clientName: invoice.client?.name || "",
    clientEmail: invoice.client?.email || "",
    clientCompany: invoice.client?.company || "",
  }
}

export async function GET(req: Request) {
  // Parse userId and userRole from query params
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  const userRole = searchParams.get("userRole")

  let where = {}
  if (userRole !== "superadmin" && userId) {
    where = { createdBy: userId }
  }

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { lineItems: true, client: true, user: true }
  })
  // Add computed totals, client fields, and user fields to each invoice
  const withTotals = invoices.map(inv => {
    const { subtotal, taxAmount, total, lineItemsWithTotal } = computeTotals(inv)
    return {
      ...addClientFields({ ...inv, subtotal, taxAmount, total, lineItems: lineItemsWithTotal }),
      userName: inv.user?.name || inv.createdBy,
      userEmail: inv.user?.email || ""
    }
  })
  return NextResponse.json(withTotals)
}

export async function POST(req: Request) {
  let data;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid or empty JSON body" }, { status: 400 });
  }
  try {
    // Validate required fields
    const requiredFields = [
      "clientId",
      "dueDate",
      "lineItems",
      "taxRate",
      "notes",
      "createdBy"
    ];
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Validate lineItems
    if (!Array.isArray(data.lineItems) || data.lineItems.length === 0) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
    }

    // Prepare lineItems for nested create
    const lineItems = data.lineItems.map((item: { productId: string, productName: string, description: string, quantity: number, unitPrice: number }) => ({
      productId: item.productId,
      productName: item.productName,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    // Create invoice with nested lineItems
    const invoice = await prisma.invoice.create({
      data: {
        clientId: data.clientId,
        createdBy: data.createdBy,
        dueDate: new Date(data.dueDate),
        taxRate: data.taxRate,
        notes: data.notes,
        status: "pending",
        lineItems: {
          create: lineItems
        }
      },
      include: { lineItems: true, client: true }
    });
    const { subtotal, taxAmount, total, lineItemsWithTotal } = computeTotals(invoice);
    return NextResponse.json(addClientFields({ ...invoice, subtotal, taxAmount, total, lineItems: lineItemsWithTotal }));
  } catch (err: unknown) {
    const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : undefined;
    return NextResponse.json({ error: message || "Failed to create invoice" }, { status: 500 });
  }
}
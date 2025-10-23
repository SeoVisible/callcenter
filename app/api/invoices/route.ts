/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { PrismaClient, Invoice as PrismaInvoice, InvoiceItem as PrismaInvoiceItem, Client as PrismaClientType } from "@prisma/client"
import { generateNextInvoiceNumber } from "@/lib/invoice-number"

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
  const taxAmount = subtotal * Number(invoice.taxRate)
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
  const statusParam = searchParams.get("status") // can be single value or comma-separated
  const clientIdParam = searchParams.get("clientId")
  const filterUserId = searchParams.get("filterUserId")
  const sortBy = searchParams.get("sortBy") || "createdAt" // createdAt | status
  const sortDir = (searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? "asc" : "desc"

  let where: any = {}
  // If caller is not superadmin, restrict to their invoices
  if (userRole !== "superadmin" && userId) {
    where = { createdBy: userId }
  }
  // If an explicit filterUserId param was provided, use it (overrides caller context if superadmin)
  if (filterUserId) {
    where = { ...where, createdBy: filterUserId }
  }
  // Filter by client if provided
  if (clientIdParam) {
    where = { ...where, clientId: clientIdParam }
  }
  // Filter by status if provided (allow comma-separated list)
  if (statusParam) {
    const statuses = statusParam.split(',').map(s => s.trim()).filter(Boolean)
    if (statuses.length === 1) where = { ...where, status: statuses[0] }
    else if (statuses.length > 1) where = { ...where, status: { in: statuses } }
  }

  // Determine ordering
  const orderBy: any = {}
  if (sortBy === "status") {
    orderBy.status = sortDir as "asc" | "desc"
  } else {
    orderBy.createdAt = sortDir as "asc" | "desc"
  }

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy,
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

    // Server-side validation: ensure unitPrice for each line item is not below the product's listed price
    const productIds = Array.from(new Set(
      (data.lineItems as Array<Record<string, unknown>>).map((li) => String((li as Record<string, unknown>).productId)).filter(Boolean)
    )) as string[];
    if (productIds.length > 0) {
      const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, price: true } });
      const priceById: Record<string, number> = {};
      for (const p of products) {
        priceById[p.id] = Number(p.price ?? 0);
      }

      for (const li of data.lineItems) {
        const minPrice = priceById[String(li.productId)] ?? 0;
        if (Number(li.unitPrice) < minPrice) {
          return NextResponse.json({ error: `Line item for productId ${li.productId} has unitPrice ${li.unitPrice} which is below the product price ${minPrice}` }, { status: 400 });
        }
      }
  }

    // Prepare lineItems for nested create
    type LineItemInput = { productId?: string | null, productName: string, description?: string | null, quantity: number, unitPrice: number }
    const lineItems: LineItemInput[] = (data.lineItems as LineItemInput[]).map((item: LineItemInput) => ({
      productId: item.productId ?? null,
      productName: item.productName,
      description: item.description ?? null,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }));
    // Validate stock availability and create invoice while decrementing stock atomically
    // Fetch current stocks for products involved
  const productIdsInInvoice = Array.from(new Set(lineItems.map((li: LineItemInput) => li.productId).filter(Boolean))) as string[];
  // fetch category so we can treat 'shipping' products as exempt from stock changes
  const products = (await prisma.product.findMany({ where: { id: { in: productIdsInInvoice as string[] } }, select: ({ id: true, stock: true, category: true, buyingPrice: true } as any) })) as unknown as Array<{ id: string; stock?: number | null; category?: string | null; buyingPrice?: number | null }>;
    // Build a map only for non-shipping products that exist in the DB. Shipping products are exempt
    // from stock validation/updates, even if they exist in the catalog.
    const stockById: Record<string, number> = {}
    for (const p of products) {
      const isShipping = ((p.category || "").toLowerCase() === "shipping")
      if (!isShipping) stockById[p.id] = Number(p.stock ?? 0)
    }

    // Check if any real (non-shipping) product line item would result in negative stock.
    // Skip items whose productId is not present in stockById (virtual items or shipping products).
    for (const li of lineItems) {
      // productId may be null for virtual items; skip those
      if (!li.productId) continue
      if (!Object.prototype.hasOwnProperty.call(stockById, li.productId)) {
        // product not found in DB (virtual/shipping/etc.) - skip stock validation
        continue
      }
      const id = li.productId as string
      const available = stockById[id]
      if (li.quantity > available) {
        return NextResponse.json({ error: `Insufficient stock for product ${id}. Available: ${available}, required: ${li.quantity}` }, { status: 400 })
      }
      // decrement local copy for further checks of same product
      stockById[id] = available - li.quantity
    }

    // Run a transaction: create invoice with nested line items and update product stocks
      const txResult = await prisma.$transaction(async (prismaTx) => {
        // For nested create: if product exists in DB, connect by id; otherwise set productId=null
        const productsById = Object.fromEntries(products.map(p => [p.id, p]))
        const createLineItems = lineItems.map((li) => {
          const exists = li.productId && Object.prototype.hasOwnProperty.call(productsById, li.productId)
          if (exists) {
            // connect to existing product
            const prod = productsById[li.productId as string]
            const bp = Number((prod as any)?.buyingPrice ?? 0)
            return {
              product: { connect: { id: li.productId } },
              productName: li.productName,
              description: li.description,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              buyingPrice: bp,
            }
          }
          // virtual item: omit product/productId so the created InvoiceItem will have productId = NULL
          return {
            productName: li.productName,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
          }
        })

        // Generate the next global invoice number (shared across all clients)
        const invoiceNumber = await generateNextInvoiceNumber();
        
        const createdInvoice = await prismaTx.invoice.create({
          data: {
            invoiceNumber: invoiceNumber,
            clientId: data.clientId,
            createdBy: data.createdBy,
            dueDate: new Date(data.dueDate),
            taxRate: data.taxRate,
            notes: data.notes,
            status: "pending",
            lineItems: {
              // cast to any to avoid TS type mismatch when Prisma Client hasn't been regenerated yet
              create: createLineItems as any
            }
          },
          include: { lineItems: true, client: true }
        })

        // Update product stocks for existing products only
        for (const prodId of Object.keys(stockById)) {
          // Cast data to the expected Prisma update input type to avoid build-time
          // errors if the generated client doesn't include the new `stock` field yet.
          const updateData = { stock: stockById[prodId] } as Parameters<typeof prismaTx.product.update>[0]['data']
          await prismaTx.product.update({ where: { id: prodId }, data: updateData })
        }

        return createdInvoice
      })
  const invoice = txResult as any
  // include buyingPrice in lineItems totals and profit
  const lineItemsAugmented = (invoice.lineItems || []).map((item: any) => ({
    ...item,
    total: Number(item.unitPrice) * Number(item.quantity),
    buyingPrice: Number(item.buyingPrice ?? 0),
    profit: (Number(item.unitPrice) - Number(item.buyingPrice ?? 0)) * Number(item.quantity),
  }))
  const subtotal = lineItemsAugmented.reduce((sum: number, it: any) => sum + it.total, 0)
  const taxAmount = subtotal * Number(invoice.taxRate)
  const total = subtotal + taxAmount
  const lineItemsWithTotal = lineItemsAugmented
    return NextResponse.json(addClientFields({ ...invoice, subtotal, taxAmount, total, lineItems: lineItemsWithTotal }));
  } catch (err: unknown) {
    const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : undefined;
    return NextResponse.json({ error: message || "Failed to create invoice" }, { status: 500 });
  }
}
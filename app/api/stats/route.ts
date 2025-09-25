import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  const errors: Array<{ key: string; message: string }> = []
  type ResultShape = {
    users: number | null
    products: number | null
    clients: number | null
    invoices: number | null
    invoicesByStatus: { pending: number | null; maker: number | null; sent: number | null; paid: number | null; not_paid: number | null; completed: number | null }
    productsByScope: { global: number | null; personal: number | null }
    errors: Array<{ key: string; message: string }>
    [key: string]: unknown
  }
  const result: ResultShape = {
    users: null,
    products: null,
    clients: null,
    invoices: null,
    invoicesByStatus: { pending: null, maker: null, sent: null, paid: null, not_paid: null, completed: null },
    productsByScope: { global: null, personal: null },
    errors: [],
  }

  // Quick connectivity check: if DB is unreachable, return mock data so the dashboard can render
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (err: unknown) {
    const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : String(err)
    const mock = {
      users: 0,
      products: 0,
      clients: 0,
      invoices: 0,
      invoicesByStatus: { pending: 0, sent: 0, paid: 0 },
      productsByScope: { global: 0, personal: 0 },
      errors: [{ key: "db", message: `DB unreachable: ${message}` }],
      mock: true,
    }
    return NextResponse.json(mock)
  }

  try {
    result.users = await prisma.user.count()
  } catch (err: unknown) {
    const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : String(err)
    errors.push({ key: "users", message: message ?? "unknown error" })
  }

  try {
    result.products = await prisma.product.count()
  } catch (err: unknown) {
    const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : String(err)
    errors.push({ key: "products", message: message ?? "unknown error" })
  }

  try {
    result.clients = await prisma.client.count()
  } catch (err: unknown) {
    const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : String(err)
    errors.push({ key: "clients", message: message ?? "unknown error" })
  }

  try {
    result.invoices = await prisma.invoice.count()
  } catch (err: unknown) {
    const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : String(err)
    errors.push({ key: "invoices", message: message ?? "unknown error" })
  }

  // invoices by status
  try {
  result.invoicesByStatus.pending = await prisma.invoice.count({ where: { status: "pending" } })
  result.invoicesByStatus.maker = await prisma.invoice.count({ where: { status: "maker" } })
  result.invoicesByStatus.sent = await prisma.invoice.count({ where: { status: "sent" } })
  result.invoicesByStatus.paid = await prisma.invoice.count({ where: { status: "paid" } })
  result.invoicesByStatus.not_paid = await prisma.invoice.count({ where: { status: "not_paid" } })
  result.invoicesByStatus.completed = await prisma.invoice.count({ where: { status: "completed" } })
  } catch (err: unknown) {
    const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : String(err)
    errors.push({ key: "invoicesByStatus", message: message ?? "unknown error" })
  }

  // products by scope
  try {
    result.productsByScope.global = await prisma.product.count({ where: { isGlobal: true } })
    result.productsByScope.personal = await prisma.product.count({ where: { isGlobal: false } })
  } catch (err: unknown) {
    const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : String(err)
    errors.push({ key: "productsByScope", message: message ?? "unknown error" })
  }

  result.errors = errors

  return NextResponse.json(result)
}

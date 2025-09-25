import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: Request) {
  const errors: Array<{ key: string; message: string }> = []

  // Read query params
  const url = new URL(request.url)
  const monthsParam = Number(url.searchParams.get('months') ?? '12')
  const monthsCount = Number.isFinite(monthsParam) && monthsParam > 0 ? Math.min(Math.max(Math.floor(monthsParam), 1), 36) : 12
  const metric = (url.searchParams.get('metric') || 'revenue').toLowerCase()

  // Quick DB connectivity check
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (err: unknown) {
    const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : String(err)
    return NextResponse.json({
      mock: true,
      errors: [{ key: 'db', message: `DB unreachable: ${message}` }],
      monthlyRevenue: [],
      revenueByUser: [],
      topProducts: [],
      topClients: [],
    })
  }

  try {
    // Monthly series for last `months` months — produce a full series so client charts always have data
    // Compute start date (first day of month N-1 months ago)
    const nowDate = new Date()
    const startDateObj = new Date(nowDate.getFullYear(), nowDate.getMonth() - (monthsCount - 1), 1)
    const startDateISO = startDateObj.toISOString()
    let monthly: Array<{ month: string; revenue: string | number }> = []
    if (metric === 'invoices') {
      monthly = await prisma.$queryRaw`
        SELECT to_char(months.month, 'YYYY-MM') AS month,
               COALESCE(COUNT(DISTINCT i.id), 0) AS revenue
        FROM (
          SELECT generate_series(date_trunc('month', ${startDateISO}::timestamptz), date_trunc('month', now()), interval '1 month') AS month
        ) AS months
        LEFT JOIN "Invoice" i ON date_trunc('month', i."createdAt") = months.month
        GROUP BY months.month
        ORDER BY months.month
      `
    } else {
      monthly = await prisma.$queryRaw`
        SELECT to_char(months.month, 'YYYY-MM') AS month,
               COALESCE(SUM(ii."quantity" * ii."unitPrice")::numeric, 0) AS revenue
        FROM (
          SELECT generate_series(date_trunc('month', ${startDateISO}::timestamptz), date_trunc('month', now()), interval '1 month') AS month
        ) AS months
        LEFT JOIN "Invoice" i ON date_trunc('month', i."createdAt") = months.month
        LEFT JOIN "InvoiceItem" ii ON ii."invoiceId" = i.id
        GROUP BY months.month
        ORDER BY months.month
      `
    }

    // Revenue by user (top 10)
    const revenueByUser: Array<{ id: string | null; name: string | null; invoiceCount: string | number; revenue: string | number }> = await prisma.$queryRaw`
      SELECT u.id, u.name, COUNT(DISTINCT i.id) AS "invoiceCount", COALESCE(SUM(ii."quantity" * ii."unitPrice"), 0) AS revenue
      FROM "Invoice" i
      JOIN "InvoiceItem" ii ON ii."invoiceId" = i.id
      LEFT JOIN "User" u ON u.id = i."createdBy"
      GROUP BY u.id, u.name
      ORDER BY revenue DESC
      LIMIT 10
    `

    // Top products by revenue/quantity
    const topProducts: Array<{ id: string; name: string; quantity: string | number; revenue: string | number }> = await prisma.$queryRaw`
      SELECT p.id, p.name, SUM(ii."quantity") AS quantity, COALESCE(SUM(ii."quantity" * ii."unitPrice"), 0) AS revenue
      FROM "InvoiceItem" ii
      JOIN "Product" p ON p.id = ii."productId"
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT 10
    `

    // Top clients by revenue/invoiceCount
    const topClients: Array<{ id: string; name: string; invoiceCount: string | number; revenue: string | number }> = await prisma.$queryRaw`
      SELECT c.id, c.name, COUNT(DISTINCT i.id) AS "invoiceCount", COALESCE(SUM(ii."quantity" * ii."unitPrice"), 0) AS revenue
      FROM "Invoice" i
      JOIN "InvoiceItem" ii ON ii."invoiceId" = i.id
      JOIN "Client" c ON c.id = i."clientId"
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
      LIMIT 10
    `

    // Normalize numeric-like values (BigInt, numeric strings) to JSON-friendly numbers/strings
    const normalize = (rows: any[]) =>
      rows.map((r) => {
        const out: any = { ...r }
        Object.keys(out).forEach((k) => {
          const v = out[k]
          if (typeof v === 'bigint') {
            // BigInt cannot be serialized to JSON directly. Convert to number when safe, otherwise string.
            const maxSafe = BigInt(Number.MAX_SAFE_INTEGER)
            out[k] = v <= maxSafe && v >= -maxSafe ? Number(v) : v.toString()
            return
          }
          if (typeof v === 'string') {
            // Numeric strings produced by some DB drivers (e.g., numeric/decimal types)
            if (!isNaN(Number(v))) {
              out[k] = Number(v)
              return
            }
          }
          // If the DB returned a Decimal-like object with toNumber()
          if (v && typeof v === 'object' && typeof (v as any).toNumber === 'function') {
            try {
              out[k] = (v as any).toNumber()
            } catch {
              out[k] = String(v)
            }
            return
          }
        })
        return out
      })

    // Build guaranteed 12-month series (YYYY-MM) starting 11 months ago through current month
    const months: string[] = []
    const now = new Date()
    const base = new Date(now.getFullYear(), now.getMonth(), 1)
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
      const ym = `${d.getFullYear().toString().padStart(4, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
      months.push(ym)
    }

    // Map SQL monthly rows to an object for quick lookup
    const monthlyMap: Record<string, number> = {}
    monthly.forEach((r: any) => {
      const key = r.month
      let val: number = 0
      if (typeof r.revenue === 'bigint') {
        const maxSafe = BigInt(Number.MAX_SAFE_INTEGER)
        val = r.revenue <= maxSafe && r.revenue >= -maxSafe ? Number(r.revenue) : Number(String(r.revenue))
      } else if (typeof r.revenue === 'string') {
        val = Number(r.revenue) || 0
      } else if (typeof r.revenue === 'number') {
        val = r.revenue
      } else if (r.revenue && typeof r.revenue === 'object' && typeof r.revenue.toNumber === 'function') {
        try { val = r.revenue.toNumber() } catch { val = Number(String(r.revenue)) || 0 }
      }
      monthlyMap[key] = val
    })

    const monthlyFinal = months.map((m) => ({ month: m, revenue: monthlyMap[m] ?? 0 }))

    return NextResponse.json({
      monthlyRevenue: normalize(monthlyFinal),
      revenueByUser: normalize(revenueByUser),
      topProducts: normalize(topProducts),
      topClients: normalize(topClients),
      errors,
    })
  } catch (err: unknown) {
    const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : String(err)
    errors.push({ key: 'aggregate', message: message ?? 'unknown error' })
    return NextResponse.json({ monthlyRevenue: [], revenueByUser: [], topProducts: [], topClients: [], errors })
  }
}

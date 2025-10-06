"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency'
import { useRouter } from "next/navigation"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"

interface MonthlyRow {
  month: string
  revenue: number
}

interface Summary {
  monthlyRevenue: MonthlyRow[]
  revenueByUser: Array<{ id: string | null; name: string | null; invoiceCount: number; revenue: number }>
  topProducts: Array<{ id: string; name: string; quantity: number; revenue: number }>
  topClients: Array<{ id: string; name: string; invoiceCount: number; revenue: number }>
}

export function StatsSummary() {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; label: string; value: number }>({
    visible: false,
    x: 0,
    y: 0,
    label: "",
    value: 0,
  })

  // Controls
  const [monthsSelection, setMonthsSelection] = useState<number>(12)
  const [metricSelection, setMetricSelection] = useState<'revenue' | 'invoices'>('revenue')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/stats/summary?months=${monthsSelection}&metric=${metricSelection}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        if (cancelled) return
        setData({
          // Accept several possible column names returned by the server depending on metric:
          // - revenue (SUM)
          // - count / invoiceCount (COUNT)
          monthlyRevenue: (json.monthlyRevenue || []).map((r: Record<string, unknown>) => ({
            month: String(r.month),
            revenue: Number((r.revenue ?? r.count ?? r.invoiceCount ?? r.value ?? 0) as unknown) || 0,
          })),
          revenueByUser: (json.revenueByUser || []).map((r: Record<string, unknown>) => ({ id: String(r.id ?? ''), name: r.name as string | null, invoiceCount: Number(r.invoiceCount ?? 0), revenue: Number(r.revenue ?? 0) })),
          topProducts: (json.topProducts || []).map((r: Record<string, unknown>) => ({ id: String(r.id ?? ''), name: String(r.name ?? ''), quantity: Number(r.quantity ?? 0), revenue: Number(r.revenue ?? 0) })),
          topClients: (json.topClients || []).map((r: Record<string, unknown>) => ({ id: String(r.id ?? ''), name: String(r.name ?? ''), invoiceCount: Number(r.invoiceCount ?? 0), revenue: Number(r.revenue ?? 0) })),
        })
      } catch {
        // ignore — leave data null
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [monthsSelection, metricSelection])

  if (loading) return <div className="text-sm text-muted-foreground">Lade Zusammenfassung...</div>
  if (!data) return <div className="text-sm text-muted-foreground">Keine Zusammenfassung verfügbar</div>

  // Build `monthsSelection` months series (fill with zeros if API returned fewer)
  const buildMonths = (count: number) => {
    const now = new Date()
    const base = new Date(now.getFullYear(), now.getMonth(), 1)
    const months: string[] = []
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
      const ym = `${d.getFullYear().toString().padStart(4, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
      months.push(ym)
    }
    return months
  }

  const months = buildMonths(monthsSelection)
  const normalizeMonthKey = (s: string) => {
    if (!s) return s
    // already YYYY-MM
    if (/^\d{4}-\d{2}$/.test(s)) return s
    // try parsing a full ISO date like 2025-09-01
    try {
      const d = new Date(s)
      if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    } catch {}
    // fallback to first 7 chars (YYYY-MM)
    return s.slice(0, 7)
  }

  const monthlyMap = new Map(
    data.monthlyRevenue.map((r) => [normalizeMonthKey(String(r.month)), r.revenue])
  )

  const monthlyRevenueFixed = months.map((m) => ({ month: m, revenue: Number(monthlyMap.get(m) ?? 0) }))

  const maxRevenue = Math.max(...monthlyRevenueFixed.map((r) => r.revenue), 1)
  const hasAnyRevenue = monthlyRevenueFixed.some((r) => r.revenue > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full max-w-md">
          <Select onValueChange={(v: string) => setMonthsSelection(Number(v))}>
            <SelectTrigger size="sm">
              <SelectValue placeholder={`${monthsSelection} Monate`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Letzte 3 Monate</SelectItem>
              <SelectItem value="6">Letzte 6 Monate</SelectItem>
              <SelectItem value="12">Letzte 12 Monate</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={(v: string) => setMetricSelection(v === 'invoices' ? 'invoices' : 'revenue')}>
            <SelectTrigger size="sm">
              <SelectValue placeholder={metricSelection === 'revenue' ? 'Umsatz' : 'Rechnungen'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Umsatz</SelectItem>
              <SelectItem value="invoices">Anzahl Rechnungen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div />

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
              <CardTitle>
              {metricSelection === 'revenue' ? `Gesamtumsatz (${DEFAULT_CURRENCY})` : 'Gesamtanzahl Rechnungen'} (letzte {monthsSelection}m)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const total = monthlyRevenueFixed.reduce((s, r) => s + r.revenue, 0)
                return metricSelection === 'revenue' ? formatCurrency(total, DEFAULT_CURRENCY) : String(Math.round(total))
              })()}
            </div>
            <div className="text-sm text-muted-foreground">Summe der Rechnungspositionen</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top-Produkt</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts[0] ? (
              <>
                <div className="text-lg font-medium">{data.topProducts[0].name}</div>
                <div className="text-sm text-muted-foreground">Umsatz: {formatCurrency(data.topProducts[0].revenue, DEFAULT_CURRENCY)}</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Noch keine Produkte</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bester Kunde</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topClients[0] ? (
              <>
                <div className="text-lg font-medium">{data.topClients[0].name}</div>
                <div className="text-sm text-muted-foreground">Umsatz: {formatCurrency(data.topClients[0].revenue, DEFAULT_CURRENCY)}</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Noch keine Kunden</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top-Verkaufender Benutzer</CardTitle>
          </CardHeader>
            <CardContent>
              {data.revenueByUser[0] ? (
                <UserLink userId={data.revenueByUser[0].id} name={data.revenueByUser[0].name} count={data.revenueByUser[0].invoiceCount} revenue={data.revenueByUser[0].revenue} />
              ) : (
                <div className="text-sm text-muted-foreground">Noch keine Benutzer</div>
              )}
            </CardContent>
        </Card>
      </div>

      <Card>
          <CardHeader>
          <CardTitle>
            {metricSelection === 'revenue'
              ? `Monatlicher Umsatz (${DEFAULT_CURRENCY}) (letzte ${monthsSelection} Monate)`
              : `Monatliche Rechnungen (letzte ${monthsSelection} Monate)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="mt-2 flex items-end gap-2 h-36">
              {monthlyRevenueFixed.map((m) => {
                const height = Math.round((m.revenue / maxRevenue) * 100)
                const label = m.month
              const display = (() => {
                try {
                  const parts = label.split('-')
                  if (parts.length >= 2) {
                    const y = Number(parts[0])
                    const m = Number(parts[1]) - 1
                    const d = new Date(y, m, 1)
                    return d.toLocaleString(undefined, { month: 'short', year: '2-digit' })
                  }
                  return label
                } catch { return label }
              })()
                const barHeight = hasAnyRevenue ? `${height}%` : '6px'
                const barColor = m.revenue > 0 ? 'bg-sky-600' : 'bg-slate-300'
                return (
                <div
                  key={m.month}
                  className="flex flex-col items-center flex-1 min-w-[22px] h-full"
                  onMouseMove={(e) => {
                      // Use viewport coordinates so tooltip follows the cursor reliably
                      setTooltip({ visible: true, x: e.clientX, y: e.clientY, label: display, value: m.revenue })
                    }}
                  onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
                >
                  <div className="w-full bg-slate-100 rounded-b-md flex flex-col justify-end h-full" style={{ height: '100%' }}>
                    <div className={`${barColor} w-full rounded-t-md`} style={{ height: barHeight, minHeight: hasAnyRevenue ? undefined : 6 }} />
                  </div>
                  <div className="text-xs mt-2">{display}</div>
                </div>
              )
            })}
          </div>
            {!hasAnyRevenue && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {metricSelection === 'revenue'
                    ? `In den letzten ${monthsSelection} Monaten wurden keine Umsätze erfasst.`
                    : `In den letzten ${monthsSelection} Monaten wurden keine Rechnungen erfasst.`}
                </div>
            )}

            {tooltip.visible && (
              <div
                className="pointer-events-none z-50 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow"
                style={{ position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 40 }}
              >
                <div className="font-medium">{tooltip.label}</div>
                <div>{metricSelection === 'revenue' ? formatCurrency(tooltip.value, DEFAULT_CURRENCY) : String(Math.round(tooltip.value))}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function UserLink({ userId, name, count, revenue }: { userId: string | null, name: string | null, count: number, revenue: number }) {
  const router = useRouter()
  if (!userId) return <div className="text-sm text-muted-foreground">Unbekannter Benutzer</div>
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        // Navigate to the dashboard invoices view and preselect this user via query param
        router.push(`/dashboard?filterUserId=${encodeURIComponent(userId)}`)
      }}
      className="text-left no-underline hover:underline w-full"
    >
      <div className="text-lg font-medium">{name || 'Unknown'}</div>
  <div className="text-sm text-muted-foreground">Rechnungen: {count} — Umsatz: {formatCurrency(revenue, DEFAULT_CURRENCY)}</div>
    </button>
  )
}

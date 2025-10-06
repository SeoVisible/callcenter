"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatsSummary } from "@/components/stats-summary"
import { formatStatusLabel } from '@/lib/status'

interface Stats {
  users: number
  products: number
  clients: number
  invoices: number
  invoicesByStatus: { pending: number; sent: number; paid: number }
  productsByScope: { global: number; personal: number }
}

export function DashboardHome({ showStats = true, onNavigate }: { showStats?: boolean; onNavigate?: (section: string) => void }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [statusTooltip, setStatusTooltip] = useState<{ visible: boolean; x: number; y: number; label: string; value: number }>({
    visible: false,
    x: 0,
    y: 0,
    label: '',
    value: 0,
  })
  // statusRef was unused; removed to satisfy lint

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch("/api/stats")
        if (!res.ok) throw new Error("Failed to fetch stats")
        const data = await res.json()

        // Map nullable results to zero when null
        const newStats: Stats = {
          users: data.users ?? 0,
          products: data.products ?? 0,
          clients: data.clients ?? 0,
          invoices: data.invoices ?? 0,
          invoicesByStatus: {
            pending: data.invoicesByStatus?.pending ?? 0,
            sent: data.invoicesByStatus?.sent ?? 0,
            paid: data.invoicesByStatus?.paid ?? 0,
          },
          productsByScope: {
            global: data.productsByScope?.global ?? 0,
            personal: data.productsByScope?.personal ?? 0,
          },
        }

        // Debug: surface raw and normalized stats in console for troubleshooting
        console.debug("DashboardHome: raw stats response:", data)
        console.debug("DashboardHome: normalized stats:", newStats)

        if (!cancelled) setStats(newStats)

        if (data.mock) {
          // Non-fatal informational message when using mock data
          const msgs = data.errors && Array.isArray(data.errors) ? data.errors.map((e: { key: string; message: string }) => `${e.key}: ${e.message}`) : []
          if (!cancelled) setInfo(`Using mock data: ${msgs.join("; ")}`)
        } else if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          const msgs = data.errors.map((e: { key: string; message: string }) => `${e.key}: ${e.message}`)
          if (!cancelled) setInfo(`Partial errors: ${msgs.join("; ")}`)
        } else {
          if (!cancelled) setInfo(null)
        }
      } catch {
        if (!cancelled) {
          // Use a safe fallback so graphs render even if the API fails
          setInfo("Failed to load stats from API — showing fallback values")
          setStats({
            users: 0,
            products: 0,
            clients: 0,
            invoices: 0,
            invoicesByStatus: { pending: 0, sent: 0, paid: 0 },
            productsByScope: { global: 0, personal: 0 },
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Lade Übersicht...</div>
      </div>
    )
  }

  if (!stats) {
    // Fatal: no stats at all (e.g., network failure). Show error and retry.
    return (
      <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded">
          <div className="flex items-start justify-between">
            <div className="text-sm text-red-700">
          <strong>Konnte Statistiken nicht laden.</strong>
            <div className="text-xs text-red-600 mt-1">{error || 'Fehler beim Laden der Statistiken'}</div>
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50 border"
                onClick={async () => {
                  setError(null)
                  setLoading(true)
                  try {
                    const res = await fetch("/api/stats")
                    if (!res.ok) throw new Error("Failed to fetch stats")
                    const data = await res.json()
                    const newStats: Stats = {
                      users: data.users ?? 0,
                      products: data.products ?? 0,
                      clients: data.clients ?? 0,
                      invoices: data.invoices ?? 0,
                      invoicesByStatus: {
                        pending: data.invoicesByStatus?.pending ?? 0,
                        sent: data.invoicesByStatus?.sent ?? 0,
                        paid: data.invoicesByStatus?.paid ?? 0,
                      },
                      productsByScope: {
                        global: data.productsByScope?.global ?? 0,
                        personal: data.productsByScope?.personal ?? 0,
                      },
                    }
                    setStats(newStats)
                    if (data.mock) {
                      const msgs = data.errors && Array.isArray(data.errors) ? data.errors.map((e: { key: string; message: string }) => `${e.key}: ${e.message}`) : []
                      setInfo(`Verwende Mock-Daten: ${msgs.join("; ")}`)
                    } else if (data.errors && data.errors.length) {
                      const msgs = data.errors.map((e: { key: string; message: string }) => `${e.key}: ${e.message}`)
                      setInfo(`Teilweise Fehler: ${msgs.join("; ")}`)
                    } else {
                      setInfo(null)
                    }
                  } catch {
                      // On retry failure, show fallback stats so graphs still display
                      setInfo("Wiederholung fehlgeschlagen — Platzhalterwerte werden angezeigt")
                      setStats({
                        users: 0,
                        products: 0,
                        clients: 0,
                        invoices: 0,
                        invoicesByStatus: { pending: 0, sent: 0, paid: 0 },
                        productsByScope: { global: 0, personal: 0 },
                      })
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                Erneut versuchen
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-[300px] flex items-center justify-center">
          <div className="text-sm text-muted-foreground">{error || 'Fehler beim Laden der Statistiken'}</div>
        </div>
      </div>
    )
  }

  const { users, products, clients, invoices, invoicesByStatus, productsByScope } = stats

  // Debug: computed chart values
  console.debug("DashboardHome: invoicesByStatus:", invoicesByStatus)

  // Simple bar chart for invoices — expand to all statuses
  const statusKeys = ['pending','maker','sent','paid','not_paid','completed'] as const
  const invoiceStatusValues = statusKeys.map((k) => ((invoicesByStatus as Record<string, number | undefined>)[k] ?? 0))
  const invoiceMax = Math.max(...invoiceStatusValues, 1)
  const hasAnyInvoice = invoiceStatusValues.some((v) => v > 0)

  console.debug("DashboardHome: invoiceStatusValues", invoiceStatusValues, "invoiceMax", invoiceMax)

  // Simple pie data for product scope
  const totalScope = productsByScope.global + productsByScope.personal || 1
  const globalAngle = (productsByScope.global / totalScope) * 360

  // If showStats is false (normal users), render a compact quick-links dashboard
  if (!showStats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Kunden</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{clients}</div>
              <div className="text-sm text-muted-foreground">Gesamt Kunden</div>
              <div className="mt-4">
                <Button onClick={() => onNavigate && onNavigate('clients')}>Kunden anzeigen</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rechnungen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{invoices}</div>
              <div className="text-sm text-muted-foreground">Gesamt Rechnungen</div>
              <div className="mt-4">
                <Button onClick={() => onNavigate && onNavigate('invoices')}>Rechnungen anzeigen</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Produkte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{products}</div>
              <div className="text-sm text-muted-foreground">Gesamt Produkte</div>
              <div className="mt-4">
                <Button onClick={() => onNavigate && onNavigate('products')}>Produkte anzeigen</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Benutzer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{users}</div>
              <div className="text-sm text-muted-foreground">Gesamt Benutzerkonten</div>
              <div className="mt-4">
                <Button onClick={() => onNavigate && onNavigate('users')}>Benutzer anzeigen</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {info && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-sm text-yellow-800">{info}</div>
        </div>
      )}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Benutzer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{users}</div>
            <div className="text-sm text-muted-foreground">Gesamt Benutzerkonten</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produkte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{products}</div>
            <div className="text-sm text-muted-foreground">Gesamt Produkte</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kunden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{clients}</div>
            <div className="text-sm text-muted-foreground">Gesamt Kunden</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rechnungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{invoices}</div>
            <div className="text-sm text-muted-foreground">Gesamt Rechnungen</div>
          </CardContent>
        </Card>
      </div>

  {/* New summary widget */}
  <StatsSummary />

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Rechnungen nach Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2 space-y-4">
              <div className="flex items-end gap-4 h-36">
                {statusKeys.map((k, i) => {
                  const value = invoiceStatusValues[i]
                  const height = Math.round((value / invoiceMax) * 100)
                  // map status to color
                  const colorClass = {
                    pending: 'bg-gray-400',
                    maker: 'bg-amber-400',
                    sent: 'bg-sky-500',
                    paid: 'bg-emerald-500',
                    not_paid: 'bg-red-500',
                    completed: 'bg-teal-500',
                  }[k as string]
                      const barHeight = hasAnyInvoice ? `${height}%` : '6px'
                      const barColor = value > 0 ? colorClass : 'bg-slate-300'
                          return (
                            <div key={k} className="flex flex-col items-center w-1/6 h-full"
                                      onMouseMove={(e) => {
                                        setStatusTooltip({ visible: true, x: e.clientX, y: e.clientY, label: formatStatusLabel(k), value })
                                      }}
                              onMouseLeave={() => setStatusTooltip((t) => ({ ...t, visible: false }))}
                            >
                              <div className="w-full bg-slate-100 rounded-b-md flex flex-col justify-end h-full" style={{ height: '100%' }}>
                                <div className={`${barColor} w-full rounded-t-md`} style={{ height: barHeight, minHeight: hasAnyInvoice ? undefined : 6 }} />
                              </div>
                              <div className="text-sm mt-2 capitalize">{formatStatusLabel(k)} ({value})</div>
                            </div>
                          )
                })}
                        {statusTooltip.visible && (
                          <div className="z-50" style={{ position: 'fixed', left: statusTooltip.x + 12, top: statusTooltip.y - 40 }}>
                            <div className="bg-slate-800 text-white text-sm px-2 py-1 rounded shadow">
                              <div className="font-medium">{statusTooltip.label}</div>
                              <div>{statusTooltip.value}</div>
                            </div>
                          </div>
                        )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produktumfang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <svg width="120" height="120" viewBox="0 0 32 32" className="flex-shrink-0">
                <circle r="16" cx="16" cy="16" fill="#e6e7eb" />
                <path
                  d={`M16 16 L16 0 A16 16 0 ${globalAngle > 180 ? 1 : 0} 1 ${16 + 16 * Math.sin((globalAngle * Math.PI) / 180)} ${16 - 16 * Math.cos((globalAngle * Math.PI) / 180)} Z`}
                  fill="#0369a1"
                />
                <circle r="10" cx="16" cy="16" fill="#ffffff" />
              </svg>

              <div>
                <div className="text-lg font-medium">Global: {productsByScope.global}</div>
                <div className="text-sm text-muted-foreground mb-2">Persönlich: {productsByScope.personal}</div>
                <div className="text-xs text-muted-foreground">Gesamt Produkte: {products}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

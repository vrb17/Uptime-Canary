import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SparklineChart } from "@/components/sparkline-chart"
import { timeAgo } from "@/lib/utils"
import { MonitorStatus, IncidentStatus } from "@prisma/client"

type CheckRow = {
  id: string
  name: string
  url: string
  lastStatus: MonitorStatus
  lastCheckedAt: Date | null
}

type ResultRow = {
  checkId: string
  status: MonitorStatus
  responseTimeMs: number | null
  checkedAt: Date
}

type IncidentRow = {
  checkId: string
  summary: string | null
  startedAt: Date
  resolvedAt: Date | null
  status: IncidentStatus
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  })
  if (!user) redirect("/login")

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // 1) Checks for this user
  const checks: CheckRow[] = await prisma.check.findMany({
    where: { userId: user.id },
    select: { 
      id: true, 
      name: true, 
      url: true, 
      lastStatus: true, 
      lastCheckedAt: true 
    },
    orderBy: { createdAt: "desc" }
  })

  const checkIds = checks.map(c => c.id)
  if (checkIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live status and last 24h performance</p>
        </div>
        <Card className="p-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You have no checks yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 2) Recent results over last 24h for all checks
  const results: ResultRow[] = await prisma.checkResult.findMany({
    where: {
      checkId: { in: checkIds },
      checkedAt: { gte: since }
    },
    select: { 
      checkId: true, 
      status: true, 
      responseTimeMs: true, 
      checkedAt: true 
    },
    orderBy: { checkedAt: "asc" }
  })

  // 3) Incidents (open + recent)
  const incidents: IncidentRow[] = await prisma.incident.findMany({
    where: { 
      checkId: { in: checkIds },
      OR: [
        { status: IncidentStatus.OPEN },
        { startedAt: { gte: since } }
      ]
    },
    select: { 
      checkId: true, 
      summary: true, 
      startedAt: true, 
      resolvedAt: true,
      status: true
    },
    orderBy: { startedAt: "desc" },
    take: 20
  })

  // Group results by checkId and compute uptime %
  const byCheck = groupBy(results, r => r.checkId)
  const rows = checks.map(c => {
    const rs = byCheck.get(c.id) ?? []
    const total = rs.length
    const oks = rs.filter(r => r.status === MonitorStatus.UP).length
    const uptimePct = total === 0 ? 0 : Math.round((oks / total) * 1000) / 10 // 1 decimal
    const spark = rs.map(r => ({ 
      t: r.checkedAt, 
      ms: r.responseTimeMs ?? 0 
    }))
    return { ...c, uptimePct, spark }
  })

  // Prepare incidents list (show last N + any open)
  const openOrRecent = incidents.slice(0, 20)

  // Calculate summary stats
  const totalChecks = checks.length
  const upChecks = checks.filter(c => c.lastStatus === MonitorStatus.UP).length
  const downChecks = checks.filter(c => c.lastStatus === MonitorStatus.DOWN).length
  const avgResponseTime = results.length > 0 
    ? Math.round(results.reduce((sum, r) => sum + (r.responseTimeMs ?? 0), 0) / results.length)
    : 0

  return (
    <div className="space-y-8" id="main">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live status and last 24h performance</p>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/checks" className="text-muted-foreground hover:text-foreground">
            Checks
          </Link>
          <Link href="/settings/notifications" className="text-muted-foreground hover:text-foreground">
            Settings
          </Link>
        </nav>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChecks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <div className="h-3 w-3 rounded-full bg-primary"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{upChecks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <div className="h-3 w-3 rounded-full bg-destructive"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{downChecks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime}ms</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checks List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Checks</CardTitle>
                  <CardDescription>Monitor your websites and APIs</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rows.map((check) => (
                  <div
                    key={check.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          check.lastStatus === MonitorStatus.UP 
                            ? "bg-primary" 
                            : check.lastStatus === MonitorStatus.DOWN 
                            ? "bg-destructive" 
                            : "bg-muted"
                        }`}
                      ></div>
                      <div>
                        <h3 className="font-medium">{check.name}</h3>
                        <p className="text-sm text-muted-foreground">{check.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium">{check.uptimePct.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">uptime (24h)</p>
                      </div>
                      <div className="w-16">
                        <SparklineChart data={check.spark} />
                      </div>
                      <Badge 
                        variant={
                          check.lastStatus === MonitorStatus.UP 
                            ? "default" 
                            : check.lastStatus === MonitorStatus.DOWN 
                            ? "destructive" 
                            : "secondary"
                        }
                      >
                        {check.lastStatus ?? "UNKNOWN"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Incidents */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Incidents</CardTitle>
              <CardDescription>Latest notifications and incidents</CardDescription>
            </CardHeader>
            <CardContent>
              {openOrRecent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No incidents in the last 24 hours.</p>
              ) : (
                <div className="space-y-4">
                  {openOrRecent.map((incident, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div
                        className={`h-2 w-2 rounded-full mt-2 ${
                          incident.status === IncidentStatus.OPEN 
                            ? "bg-destructive" 
                            : "bg-primary"
                        }`}
                      ></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {checks.find(c => c.id === incident.checkId)?.name ?? incident.checkId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {incident.summary ?? "No summary"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Started: {timeAgo(incident.startedAt)}
                          {incident.resolvedAt && ` • Resolved: ${timeAgo(incident.resolvedAt)}`}
                          {incident.status === IncidentStatus.OPEN && " • Ongoing"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Utility: groupBy for server side usage
function groupBy<T, K>(arr: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>()
  for (const item of arr) {
    const k = key(item)
    const list = m.get(k)
    if (list) list.push(item)
    else m.set(k, [item])
  }
  return m
}

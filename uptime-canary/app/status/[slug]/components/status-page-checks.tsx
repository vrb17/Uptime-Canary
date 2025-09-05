import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SparklineChart } from "@/components/sparkline-chart"
import { MonitorStatus } from "@prisma/client"
import { formatDistanceToNow } from "date-fns"

interface CheckResult {
  id: string
  status: MonitorStatus
  statusCode: number | null
  responseTimeMs: number | null
  checkedAt: Date
  errorMessage: string | null
}

interface Check {
  id: string
  name: string
  url: string
  lastStatus: MonitorStatus
  lastCheckedAt: Date | null
  results: CheckResult[]
}

interface StatusPageItem {
  id: string
  check: Check
}

interface StatusPageChecksProps {
  checks: StatusPageItem[]
}

function getStatusColor(status: MonitorStatus) {
  switch (status) {
    case "UP":
      return "bg-green-500"
    case "DOWN":
      return "bg-red-500"
    default:
      return "bg-gray-500"
  }
}

function getStatusText(status: MonitorStatus) {
  switch (status) {
    case "UP":
      return "Operational"
    case "DOWN":
      return "Outage"
    default:
      return "Unknown"
  }
}

function calculateUptime(results: CheckResult[]): number {
  if (results.length === 0) return 0
  
  const upCount = results.filter(result => result.status === "UP").length
  return Math.round((upCount / results.length) * 100)
}

function transformResultsForSparkline(results: CheckResult[]) {
  return results
    .slice(0, 24) // Last 24 data points
    .reverse() // Oldest first for chart
    .map(result => ({
      t: result.checkedAt,
      ms: result.responseTimeMs || 0
    }))
}

export function StatusPageChecks({ checks }: StatusPageChecksProps) {
  if (checks.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">System Status</h2>
        <p className="text-muted-foreground">No checks configured for this status page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">System Status</h2>
      <div className="space-y-4">
        {checks.map((item) => {
          const { check } = item
          const uptime = calculateUptime(check.results)
          const sparklineData = transformResultsForSparkline(check.results)
          
          return (
            <Card key={check.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-medium">{check.name}</h3>
                    <p className="text-sm text-muted-foreground">{check.url}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium">{uptime}% uptime</div>
                      <div className="text-xs text-muted-foreground">
                        {check.lastCheckedAt 
                          ? `Last checked ${formatDistanceToNow(check.lastCheckedAt, { addSuffix: true })}`
                          : "Never checked"
                        }
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`${getStatusColor(check.lastStatus)} text-white`}
                    >
                      {getStatusText(check.lastStatus)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <SparklineChart data={sparklineData} />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

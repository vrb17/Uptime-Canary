import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IncidentStatus } from "@prisma/client"
import { formatDistanceToNow, format } from "date-fns"

interface Check {
  name: string
}

interface Incident {
  id: string
  status: IncidentStatus
  startedAt: Date
  resolvedAt: Date | null
  summary: string | null
  check: Check
}

interface StatusPageIncidentsProps {
  incidents: Incident[]
}

function getIncidentStatusColor(status: IncidentStatus) {
  switch (status) {
    case "OPEN":
      return "bg-red-500"
    case "RESOLVED":
      return "bg-green-500"
    default:
      return "bg-gray-500"
  }
}

function getIncidentStatusText(status: IncidentStatus) {
  switch (status) {
    case "OPEN":
      return "Ongoing"
    case "RESOLVED":
      return "Resolved"
    default:
      return "Unknown"
  }
}

function formatIncidentDuration(startedAt: Date, resolvedAt: Date | null): string {
  if (!resolvedAt) {
    return `Started ${formatDistanceToNow(startedAt, { addSuffix: true })}`
  }
  
  const duration = resolvedAt.getTime() - startedAt.getTime()
  const minutes = Math.floor(duration / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else {
    return `${minutes}m`
  }
}

export function StatusPageIncidents({ incidents }: StatusPageIncidentsProps) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Recent Incidents</h2>
        <p className="text-muted-foreground">No incidents reported in the last 30 days.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Recent Incidents</h2>
      <div className="space-y-4">
        {incidents.map((incident) => (
          <Card key={incident.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{incident.check.name}</h3>
                    <Badge 
                      variant="secondary" 
                      className={`${getIncidentStatusColor(incident.status)} text-white`}
                    >
                      {getIncidentStatusText(incident.status)}
                    </Badge>
                  </div>
                  {incident.summary && (
                    <p className="text-sm text-muted-foreground">{incident.summary}</p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    <div>
                      Started: {format(incident.startedAt, "MMM d, yyyy 'at' h:mm a")}
                    </div>
                    {incident.resolvedAt && (
                      <div>
                        Resolved: {format(incident.resolvedAt, "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    )}
                    <div>
                      Duration: {formatIncidentDuration(incident.startedAt, incident.resolvedAt)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

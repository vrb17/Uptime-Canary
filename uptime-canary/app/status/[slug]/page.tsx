import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { StatusPageHeader } from "./components/status-page-header"
import { StatusPageChecks } from "./components/status-page-checks"
import { StatusPageIncidents } from "./components/status-page-incidents"

interface StatusPageProps {
  params: {
    slug: string
  }
}

export default async function StatusPage({ params }: StatusPageProps) {
  const { slug } = params

  // Fetch status page with related data
  const statusPage = await prisma.statusPage.findUnique({
    where: { 
      slug,
      enabled: true 
    },
    include: {
      items: {
        include: {
          check: {
            include: {
              results: {
                where: {
                  checkedAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                  }
                },
                orderBy: {
                  checkedAt: "desc"
                }
              }
            }
          }
        },
        orderBy: {
          order: "asc"
        }
      }
    }
  })

  if (!statusPage) {
    notFound()
  }

  // Fetch recent incidents for all checks on this status page
  const checkIds = statusPage.items.map(item => item.checkId)
  const incidents = await prisma.incident.findMany({
    where: {
      checkId: {
        in: checkIds
      }
    },
    include: {
      check: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      startedAt: "desc"
    },
    take: 20
  })

  return (
    <div className="min-h-screen bg-background" id="main">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <StatusPageHeader 
          title={statusPage.title}
          description={statusPage.description}
        />
        
        <div className="space-y-8 mt-8">
          <StatusPageChecks checks={statusPage.items} />
          <StatusPageIncidents incidents={incidents} />
        </div>
      </div>
    </div>
  )
}

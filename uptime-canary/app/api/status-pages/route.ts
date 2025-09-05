import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/checks-api"
import { logger } from "@/lib/logger"
import { jsonError } from "@/lib/http"

// Zod schemas for validation
const createStatusPageSchema = z.object({
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  checkIds: z.array(z.string()).optional(),
})

const updateStatusPageSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  checkIds: z.array(z.string()).optional(),
})

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      logger.warn("Unauthorized access attempt to GET /api/status-pages")
      return jsonError("Unauthorized", 401)
    }

    const statusPages = await prisma.statusPage.findMany({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            check: {
              select: {
                id: true,
                name: true,
                url: true,
                lastStatus: true,
                lastCheckedAt: true,
              }
            }
          },
          orderBy: {
            order: "asc"
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    logger.info("Retrieved status pages", { userId: user.id, count: statusPages.length })
    return NextResponse.json(statusPages)
  } catch (error) {
    logger.error("GET /api/status-pages error", { error: String(error) })
    return jsonError("Internal server error")
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      logger.warn("Unauthorized access attempt to POST /api/status-pages")
      return jsonError("Unauthorized", 401)
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = createStatusPageSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn("Validation failed for status page creation", { 
        userId: user.id, 
        errors: validationResult.error.errors 
      })
      return jsonError("Validation failed", 400)
    }

    const { slug, title, description, enabled, checkIds } = validationResult.data

    // Check if slug already exists
    const existingStatusPage = await prisma.statusPage.findUnique({
      where: { slug }
    })

    if (existingStatusPage) {
      logger.warn("Status page slug already exists", { slug, userId: user.id })
      return jsonError("Status page with this slug already exists", 409)
    }

    // Create status page
    const statusPage = await prisma.statusPage.create({
      data: {
        userId: user.id,
        slug,
        title,
        description,
        enabled: enabled ?? true,
      },
      include: {
        items: {
          include: {
            check: {
              select: {
                id: true,
                name: true,
                url: true,
                lastStatus: true,
                lastCheckedAt: true,
              }
            }
          }
        }
      }
    })

    // Add checks if provided
    if (checkIds && checkIds.length > 0) {
      // Verify all checks belong to the user
      const userChecks = await prisma.check.findMany({
        where: {
          id: { in: checkIds },
          userId: user.id
        },
        select: { id: true }
      })

      if (userChecks.length !== checkIds.length) {
        logger.warn("Invalid check IDs provided for status page", { 
          userId: user.id, 
          provided: checkIds, 
          found: userChecks.map(c => c.id) 
        })
        return jsonError("Some checks not found or don't belong to you", 400)
      }

      // Add checks to status page
      await prisma.statusPageItem.createMany({
        data: checkIds.map((checkId, index) => ({
          statusPageId: statusPage.id,
          checkId,
          order: index
        }))
      })
    }

    logger.info("Created status page", { 
      userId: user.id, 
      statusPageId: statusPage.id, 
      slug: statusPage.slug, 
      title: statusPage.title,
      checkCount: checkIds?.length || 0
    })
    return NextResponse.json(statusPage, { status: 201 })
  } catch (error) {
    logger.error("POST /api/status-pages error", { error: String(error) })
    return jsonError("Internal server error")
  }
}

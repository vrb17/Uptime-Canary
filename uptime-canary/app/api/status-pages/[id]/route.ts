import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/checks-api"

const updateStatusPageSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  checkIds: z.array(z.string()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const statusPage = await prisma.statusPage.findFirst({
      where: {
        id: params.id,
        userId: user.id
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
          },
          orderBy: {
            order: "asc"
          }
        }
      }
    })

    if (!statusPage) {
      return NextResponse.json(
        { error: "Status page not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(statusPage)
  } catch (error) {
    console.error("GET /api/status-pages/[id] error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = updateStatusPageSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { title, description, enabled, checkIds } = validationResult.data

    // Check if status page exists and belongs to user
    const existingStatusPage = await prisma.statusPage.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!existingStatusPage) {
      return NextResponse.json(
        { error: "Status page not found" },
        { status: 404 }
      )
    }

    // Update status page
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (enabled !== undefined) updateData.enabled = enabled

    const statusPage = await prisma.statusPage.update({
      where: { id: params.id },
      data: updateData,
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

    // Update checks if provided
    if (checkIds !== undefined) {
      // Remove existing items
      await prisma.statusPageItem.deleteMany({
        where: { statusPageId: params.id }
      })

      // Add new items if checkIds is not empty
      if (checkIds.length > 0) {
        // Verify all checks belong to the user
        const userChecks = await prisma.check.findMany({
          where: {
            id: { in: checkIds },
            userId: user.id
          },
          select: { id: true }
        })

        if (userChecks.length !== checkIds.length) {
          return NextResponse.json(
            { error: "Some checks not found or don't belong to you" },
            { status: 400 }
          )
        }

        // Add checks to status page
        await prisma.statusPageItem.createMany({
          data: checkIds.map((checkId, index) => ({
            statusPageId: params.id,
            checkId,
            order: index
          }))
        })
      }
    }

    return NextResponse.json(statusPage)
  } catch (error) {
    console.error("PUT /api/status-pages/[id] error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if status page exists and belongs to user
    const existingStatusPage = await prisma.statusPage.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!existingStatusPage) {
      return NextResponse.json(
        { error: "Status page not found" },
        { status: 404 }
      )
    }

    // Delete status page (cascade will handle items)
    await prisma.statusPage.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/status-pages/[id] error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

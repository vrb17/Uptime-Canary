import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/checks-api"
import { createNotificationPreferenceSchema } from "@/lib/notification-schemas"
import { logger } from "@/lib/logger"
import { jsonError } from "@/lib/http"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      logger.warn("Unauthorized access attempt to GET /api/notifications")
      return jsonError("Unauthorized", 401)
    }

    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        channel: true,
        address: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    logger.info("Retrieved notification preferences", { userId: user.id, count: preferences.length })
    return NextResponse.json(preferences)
  } catch (error) {
    logger.error("GET /api/notifications error", { error: String(error) })
    return jsonError("Internal server error")
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      logger.warn("Unauthorized access attempt to POST /api/notifications")
      return jsonError("Unauthorized", 401)
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = createNotificationPreferenceSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn("Validation failed for notification preference creation", { 
        userId: user.id, 
        errors: validationResult.error.errors 
      })
      return jsonError("Validation failed", 400)
    }

    const { channel, address } = validationResult.data

    // Check if preference already exists
    const existingPreference = await prisma.notificationPreference.findFirst({
      where: {
        userId: user.id,
        channel,
        address,
      }
    })

    if (existingPreference) {
      logger.warn("Notification preference already exists", { 
        userId: user.id, 
        channel, 
        address 
      })
      return jsonError("Notification preference already exists", 409)
    }

    const preference = await prisma.notificationPreference.create({
      data: {
        userId: user.id,
        channel,
        address,
        enabled: true,
      },
      select: {
        id: true,
        channel: true,
        address: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    logger.info("Created notification preference", { 
      userId: user.id, 
      preferenceId: preference.id, 
      channel: preference.channel, 
      address: preference.address 
    })
    return NextResponse.json(preference, { status: 201 })
  } catch (error) {
    logger.error("POST /api/notifications error", { error: String(error) })
    return jsonError("Internal server error")
  }
}

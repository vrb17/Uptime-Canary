import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/checks-api"
import { updateNotificationPreferenceSchema } from "@/lib/notification-schemas"

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
    const validationResult = updateNotificationPreferenceSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    // Check if preference exists and belongs to user
    const existingPreference = await prisma.notificationPreference.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      }
    })

    if (!existingPreference) {
      return NextResponse.json(
        { error: "Notification preference not found" },
        { status: 404 }
      )
    }

    const updateData = validationResult.data

    // If updating channel or address, check for duplicates
    if ((updateData.channel && updateData.channel !== existingPreference.channel) ||
        (updateData.address && updateData.address !== existingPreference.address)) {
      const duplicatePreference = await prisma.notificationPreference.findFirst({
        where: {
          userId: user.id,
          channel: updateData.channel || existingPreference.channel,
          address: updateData.address || existingPreference.address,
          id: { not: params.id },
        }
      })

      if (duplicatePreference) {
        return NextResponse.json(
          { error: "Notification preference already exists" },
          { status: 409 }
        )
      }
    }

    const preference = await prisma.notificationPreference.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        channel: true,
        address: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(preference)
  } catch (error) {
    console.error("PUT /api/notifications/[id] error:", error)
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

    // Check if preference exists and belongs to user
    const existingPreference = await prisma.notificationPreference.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      }
    })

    if (!existingPreference) {
      return NextResponse.json(
        { error: "Notification preference not found" },
        { status: 404 }
      )
    }

    await prisma.notificationPreference.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/notifications/[id] error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

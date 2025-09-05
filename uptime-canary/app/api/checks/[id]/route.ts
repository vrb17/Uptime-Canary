import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, getCheckById, checkSelectFields } from "@/lib/checks-api"
import { logger } from "@/lib/logger"
import { jsonError } from "@/lib/http"

// Zod schemas for validation
const updateCheckSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  url: z.string().url("Invalid URL format").optional(),
  method: z.enum(["GET", "HEAD", "POST"]).optional(),
  intervalSec: z.number().int().min(30).max(3600).optional(),
  timeoutMs: z.number().int().min(1000).max(30000).optional(),
  expectedCode: z.number().int().optional(),
  enabled: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      logger.warn("Unauthorized access attempt to GET /api/checks/[id]", { checkId: params.id })
      return jsonError("Unauthorized", 401)
    }

    const check = await getCheckById(params.id, user.id)
    if (!check) {
      logger.warn("Check not found", { checkId: params.id, userId: user.id })
      return jsonError("Check not found", 404)
    }

    logger.info("Retrieved check", { checkId: params.id, userId: user.id })
    return NextResponse.json(check)
  } catch (error) {
    logger.error("GET /api/checks/[id] error", { checkId: params.id, error: String(error) })
    return jsonError("Internal server error")
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      logger.warn("Unauthorized access attempt to PATCH /api/checks/[id]", { checkId: params.id })
      return jsonError("Unauthorized", 401)
    }

    // Verify check exists and belongs to user
    const existingCheck = await getCheckById(params.id, user.id)
    if (!existingCheck) {
      logger.warn("Check not found for update", { checkId: params.id, userId: user.id })
      return jsonError("Check not found", 404)
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = updateCheckSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn("Validation failed for check update", { 
        checkId: params.id, 
        userId: user.id, 
        errors: validationResult.error.errors 
      })
      return jsonError("Validation failed", 400)
    }

    const updateData = validationResult.data
    const prismaUpdateData: {
      name?: string
      url?: string
      method?: "GET" | "HEAD" | "POST"
      intervalSeconds?: number
      timeoutMs?: number
      expectedStatus?: number
      enabled?: boolean
    } = {}

    // Map the validated fields to Prisma schema fields
    if (updateData.name !== undefined) prismaUpdateData.name = updateData.name
    if (updateData.url !== undefined) prismaUpdateData.url = updateData.url
    if (updateData.method !== undefined) prismaUpdateData.method = updateData.method
    if (updateData.intervalSec !== undefined) prismaUpdateData.intervalSeconds = updateData.intervalSec
    if (updateData.timeoutMs !== undefined) prismaUpdateData.timeoutMs = updateData.timeoutMs
    if (updateData.expectedCode !== undefined) prismaUpdateData.expectedStatus = updateData.expectedCode
    if (updateData.enabled !== undefined) prismaUpdateData.enabled = updateData.enabled

    const updatedCheck = await prisma.check.update({
      where: { id: params.id },
      data: prismaUpdateData,
      select: checkSelectFields
    })

    logger.info("Updated check", { 
      checkId: params.id, 
      userId: user.id, 
      updatedFields: Object.keys(prismaUpdateData) 
    })
    return NextResponse.json(updatedCheck)
  } catch (error) {
    logger.error("PATCH /api/checks/[id] error", { checkId: params.id, error: String(error) })
    return jsonError("Internal server error")
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      logger.warn("Unauthorized access attempt to DELETE /api/checks/[id]", { checkId: params.id })
      return jsonError("Unauthorized", 401)
    }

    // Verify check exists and belongs to user
    const existingCheck = await getCheckById(params.id, user.id)
    if (!existingCheck) {
      logger.warn("Check not found for deletion", { checkId: params.id, userId: user.id })
      return jsonError("Check not found", 404)
    }

    await prisma.check.delete({
      where: { id: params.id }
    })

    logger.info("Deleted check", { checkId: params.id, userId: user.id })
    return NextResponse.json(
      { message: "Check deleted successfully" },
      { status: 200 }
    )
  } catch (error) {
    logger.error("DELETE /api/checks/[id] error", { checkId: params.id, error: String(error) })
    return jsonError("Internal server error")
  }
}

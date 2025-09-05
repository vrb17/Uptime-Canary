import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, checkSelectFields } from "@/lib/checks-api"
import { logger } from "@/lib/logger"
import { jsonError } from "@/lib/http"

// Zod schemas for validation
const createCheckSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Invalid URL format"),
  method: z.enum(["GET", "HEAD", "POST"]),
  intervalSec: z.number().int().min(30).max(3600),
  timeoutMs: z.number().int().min(1000).max(30000),
  expectedCode: z.number().int().optional(),
  enabled: z.boolean().optional(),
})

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      logger.warn("Unauthorized access attempt to GET /api/checks")
      return jsonError("Unauthorized", 401)
    }

    const checks = await prisma.check.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: checkSelectFields
    })

    logger.info("Retrieved checks", { userId: user.id, count: checks.length })
    return NextResponse.json(checks)
  } catch (error) {
    logger.error("GET /api/checks error", { error: String(error) })
    return jsonError("Internal server error")
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      logger.warn("Unauthorized access attempt to POST /api/checks")
      return jsonError("Unauthorized", 401)
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = createCheckSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn("Validation failed for check creation", { 
        userId: user.id, 
        errors: validationResult.error.errors 
      })
      return jsonError("Validation failed", 400)
    }

    const { name, url, method, intervalSec, timeoutMs, expectedCode, enabled } = validationResult.data

    const check = await prisma.check.create({
      data: {
        userId: user.id,
        name,
        url,
        method,
        expectedStatus: expectedCode ?? 200,
        intervalSeconds: intervalSec,
        timeoutMs,
        enabled: enabled ?? true,
      },
      select: checkSelectFields
    })

    logger.info("Created check", { 
      userId: user.id, 
      checkId: check.id, 
      name: check.name, 
      url: check.url 
    })
    return NextResponse.json(check, { status: 201 })
  } catch (error) {
    logger.error("POST /api/checks error", { error: String(error) })
    return jsonError("Internal server error")
  }
}

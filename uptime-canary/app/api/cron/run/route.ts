import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { MonitorStatus, IncidentStatus } from "@prisma/client"
import { sendAlertToUser } from "@/lib/email"
import { logger } from "@/lib/logger"

const CONSEC_FAILS_TO_OPEN = 3
const CONSEC_SUCCESSES_TO_CLOSE = 2

export async function GET(req: Request) {
  const provided = req.headers.get("x-cron-secret")
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  logger.info("Cron job started")
  
  const now = new Date()
  const checks = await prisma.check.findMany({ where: { enabled: true } })
  const due = checks.filter(c =>
    !c.lastCheckedAt || c.lastCheckedAt.getTime() + c.intervalSeconds * 1000 <= now.getTime()
  )

  logger.info("Checks to run", { total: checks.length, due: due.length })

  const results = await Promise.allSettled(due.map(runOne))

  const summary = results.reduce(
    (acc, r) => {
      acc.ran++
      if (r.status === "fulfilled") {
        if (r.value.ok) acc.successes++
        else acc.failures++
      } else {
        acc.errors++
      }
      return acc
    },
    { ran: 0, successes: 0, failures: 0, errors: 0 }
  )

  logger.info("Cron job completed", summary)
  return NextResponse.json(summary)
}

async function runOne(check: any) {
  logger.info("Running check", { checkId: check.id, name: check.name, url: check.url })
  
  const started = Date.now()
  const controller = new AbortController()
  const timeoutMs = check.timeoutMs ?? 10000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let ok = false, statusCode: number | null = null, error: string | null = null

  try {
    const res = await fetch(check.url, { method: check.method, signal: controller.signal })
    statusCode = res.status
    ok = check.expectedStatus ? res.status === check.expectedStatus : res.ok
  } catch (e: any) {
    error = e?.name === "AbortError" ? "timeout" : String(e?.message ?? e)
  } finally {
    clearTimeout(timer)
  }

  const latencyMs = Date.now() - started

  await prisma.$transaction(async tx => {
    await tx.checkResult.create({
      data: { 
        checkId: check.id, 
        checkedAt: new Date(), 
        status: ok ? MonitorStatus.UP : MonitorStatus.DOWN, 
        statusCode: statusCode ?? undefined, 
        responseTimeMs: latencyMs, 
        errorMessage: error ?? undefined 
      }
    })
    
    await tx.check.update({ 
      where: { id: check.id }, 
      data: { 
        lastStatus: ok ? MonitorStatus.UP : MonitorStatus.DOWN, 
        lastCheckedAt: new Date() 
      } 
    })

    const recent = await tx.checkResult.findMany({
      where: { checkId: check.id },
      orderBy: { checkedAt: "desc" },
      take: 5,
      select: { status: true }
    })

    const leadingFails = countLeading(recent.map(r => r.status), MonitorStatus.DOWN)
    const leadingSuccesses = countLeading(recent.map(r => r.status), MonitorStatus.UP)

    const openIncident = await tx.incident.findFirst({ 
      where: { checkId: check.id, status: IncidentStatus.OPEN } 
    })
    
    if (!ok && leadingFails >= CONSEC_FAILS_TO_OPEN && !openIncident) {
      logger.warn("Opening incident", { 
        checkId: check.id, 
        checkName: check.name, 
        consecutiveFailures: leadingFails 
      })
      
      await tx.incident.create({ 
        data: { 
          checkId: check.id, 
          startedAt: new Date(), 
          status: IncidentStatus.OPEN,
          summary: "Consecutive failures detected" 
        } 
      })
      
      // Send DOWN alert email
      await sendAlertToUser({
        userId: check.userId,
        kind: "DOWN",
        check: { name: check.name, url: check.url },
        at: new Date(),
        statusCode,
        errorMessage: error
      })
    }
    
    if (ok && leadingSuccesses >= CONSEC_SUCCESSES_TO_CLOSE && openIncident) {
      logger.info("Closing incident", { 
        checkId: check.id, 
        checkName: check.name, 
        consecutiveSuccesses: leadingSuccesses 
      })
      
      await tx.incident.update({ 
        where: { id: openIncident.id }, 
        data: { 
          status: IncidentStatus.RESOLVED,
          resolvedAt: new Date() 
        } 
      })
      
      // Send RECOVERED alert email
      await sendAlertToUser({
        userId: check.userId,
        kind: "RECOVERED",
        check: { name: check.name, url: check.url },
        at: new Date(),
        statusCode,
        errorMessage: null
      })
    }
  })

  return { checkId: check.id, ok, statusCode, latencyMs, error }
}

function countLeading(statuses: MonitorStatus[], target: MonitorStatus) {
  let count = 0
  for (const status of statuses) {
    if (status === target) count++
    else break
  }
  return count
}

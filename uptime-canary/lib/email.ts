import { Resend } from "resend"
import { prisma } from "@/lib/prisma"

type AlertKind = "DOWN" | "RECOVERED"

export async function sendAlertEmail(params: {
  to: string
  kind: AlertKind
  check: { name: string; url: string }
  at: Date
  statusCode?: number | null
  errorMessage?: string | null
}) {
  const { to, kind, check, at, statusCode, errorMessage } = params
  const from = process.env.EMAIL_FROM
  const key = process.env.RESEND_API_KEY

  const subject =
    kind === "DOWN"
      ? `[Uptime Canary] ❌ ${check.name} is DOWN`
      : `[Uptime Canary] ✅ ${check.name} recovered`

  const text = [
    `Check: ${check.name}`,
    `URL: ${check.url}`,
    `When: ${at.toISOString()}`,
    statusCode != null ? `Status: ${statusCode}` : null,
    errorMessage ? `Error: ${errorMessage}` : null,
    "",
    "— Uptime Canary"
  ].filter(Boolean).join("\n")

  if (!key || !from) {
    console.log("[Email Fallback]", { to, subject, text })
    return { ok: true, fallback: true }
  }

  const resend = new Resend(key)
  await resend.emails.send({ from, to, subject, text })
  return { ok: true }
}

export async function sendAlertToUser(params: {
  userId: string
  kind: AlertKind
  check: { name: string; url: string }
  at: Date
  statusCode?: number | null
  errorMessage?: string | null
}) {
  const { userId, kind, check, at, statusCode, errorMessage } = params

  // Get user's notification preferences
  const preferences = await prisma.notificationPreference.findMany({
    where: {
      userId,
      enabled: true,
      channel: "email"
    }
  })

  // If no preferences exist, fall back to user's email
  if (preferences.length === 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    })
    
    if (user?.email) {
      return await sendAlertEmail({
        to: user.email,
        kind,
        check,
        at,
        statusCode,
        errorMessage
      })
    }
    return { ok: false, error: "No notification preferences found" }
  }

  // Send to all enabled email preferences
  const results = await Promise.allSettled(
    preferences.map(preference =>
      sendAlertEmail({
        to: preference.address,
        kind,
        check,
        at,
        statusCode,
        errorMessage
      })
    )
  )

  const successful = results.filter(r => r.status === "fulfilled" && r.value.ok).length
  const failed = results.length - successful

  return {
    ok: successful > 0,
    sent: successful,
    failed,
    total: results.length
  }
}

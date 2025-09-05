import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

// Helper function to get current user by session
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return null
  }
  
  return await prisma.user.findUnique({
    where: { email: session.user.email }
  })
}

// Helper function to get check by ID and verify ownership
export async function getCheckById(checkId: string, userId: string) {
  return await prisma.check.findFirst({
    where: {
      id: checkId,
      userId: userId
    },
    select: {
      id: true,
      name: true,
      url: true,
      method: true,
      expectedStatus: true,
      intervalSeconds: true,
      timeoutMs: true,
      enabled: true,
      lastStatus: true,
      lastCheckedAt: true,
      createdAt: true,
      updatedAt: true,
    }
  })
}

// Standard check selection fields
export const checkSelectFields = {
  id: true,
  name: true,
  url: true,
  method: true,
  expectedStatus: true,
  intervalSeconds: true,
  timeoutMs: true,
  enabled: true,
  lastStatus: true,
  lastCheckedAt: true,
  createdAt: true,
  updatedAt: true,
} as const

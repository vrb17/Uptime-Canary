import { z } from "zod"

export const notificationPreferenceSchema = z.object({
  channel: z.enum(["email"]), // For now, only email is supported
  address: z.string().min(1, "Address is required"),
})

export const createNotificationPreferenceSchema = notificationPreferenceSchema

export const updateNotificationPreferenceSchema = z.object({
  channel: z.enum(["email"]).optional(),
  address: z.string().min(1, "Address is required").optional(),
  enabled: z.boolean().optional(),
})

export type CreateNotificationPreference = z.infer<typeof createNotificationPreferenceSchema>
export type UpdateNotificationPreference = z.infer<typeof updateNotificationPreferenceSchema>

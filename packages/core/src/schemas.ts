import { z } from "zod"

export const vercelLogSchema = z.object({
  message: z.string(),
  proxy: z.object({
    path: z.string(),
    method: z.string(),
    userAgent: z.array(z.string()),
    clientIp: z.string(),
  }),
})

export const httpMethods = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "CONNECT",
  "OPTIONS",
  "TRACE",
  "PATCH",
] as const

export const requestType = z.enum(["request", "action"])

export const baseLogSchema = z
  .object({
    method: z.enum(httpMethods),
    type: requestType,
    path: z.string(),
    req: z.any(),
    req_headers: z.any(),
    res: z.any(),
    res_headers: z.any(),
    http_status: z.number(),
    duration: z.number(),

    error: z.any().optional(),
    user_id: z.string().optional(),
    user_email: z.string().optional(),
  })
  .passthrough()

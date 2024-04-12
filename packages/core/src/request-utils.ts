import { serializeError } from "serialize-error"
import { baseLogSchema } from "./schemas"
import { z } from "zod"
import { headersToRecord, parseJsonOrPassthrough } from "./utils"
import { AddContextFn, FlushFn } from "./types"

export function response(
  body: BodyInit,
  opts: ResponseInit = {},
  addContext: AddContextFn<z.infer<typeof baseLogSchema>>
) {
  addContext({
    res: parseJsonOrPassthrough(body),
    http_status: opts?.status ?? 200,
  })

  return new Response(body, opts)
}

export function json(
  data: any,
  opts: ResponseInit = {},
  addContext: AddContextFn<z.infer<typeof baseLogSchema>>
) {
  addContext({
    res: data,
    http_status: opts.status ?? 200,
  })
  return Response.json(data, opts)
}

export function redirect(
  url: string | URL,
  status: number = 302,
  addContext: AddContextFn<z.infer<typeof baseLogSchema>>
) {
  addContext({
    http_status: status,
  })
  return Response.redirect(url, status)
}

export function catchUncaughtRoute<
  T extends { params: Record<string, unknown> },
>(
  fn: (request: Request, context: T) => Promise<Response> | Response,
  addContext: AddContextFn<z.infer<typeof baseLogSchema>>,
  flush: FlushFn,
  options?: Partial<z.infer<typeof baseLogSchema>>
): (request: Request, context: T) => Promise<Response> {
  return async (request: Request, context: T) => {
    const t0 = Date.now()
    if (options) addContext(options)
    try {
      addContext({
        req_headers: headersToRecord(request.headers),
      })
      const res = await fn(request, context)
      addContext({
        res_headers: headersToRecord(res.headers),
      })
      addContext({
        duration: Date.now() - t0,
      })
      flush("log")
      return res
    } catch (error) {
      addContext({ error: serializeError(error) })
      const res = response(
        JSON.stringify({
          message: `Internal Server Error. Please try again later.`,
        }),
        {
          status: 500,
          headers: new Headers({ "Content-Type": "application/json" }),
        },
        addContext
      )
      addContext({
        duration: Date.now() - t0,
      })
      addContext({
        res_headers: headersToRecord(res.headers),
      })

      flush("error")
      return res
    }
  }
}

export function catchUncaughtAction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  addContext: AddContextFn<z.infer<typeof baseLogSchema>>,
  flush: FlushFn,
  options?: Partial<z.infer<typeof baseLogSchema>>
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>) => {
    const t0 = Date.now()
    if (options) addContext(options)
    try {
      addContext({
        req: args,
      })
      addContext({
        type: "action",
      })
      const res = await fn(...args)
      addContext({ res })
      addContext({ http_status: 200 })
      addContext({
        duration: Date.now() - t0,
      })
      flush("log")
      return res as ReturnType<T>
    } catch (error) {
      addContext({ error: serializeError(error) })
      addContext({ http_status: 500 })
      const res = {
        success: false,
        message: `Internal Server Error. Please try again later.`,
      }
      addContext({ res })
      addContext({
        duration: Date.now() - t0,
      })
      flush("error")
      return res as ReturnType<T>
    }
  }
}

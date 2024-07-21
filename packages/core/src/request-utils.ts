import { serializeError } from "serialize-error"
import { baseLogSchema } from "./schemas"
import { z } from "zod"
import { headersToRecord, parseJsonOrPassthrough } from "./utils"
import { AddContextFn, FlushFn } from "./types"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

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

export function nextResponse(
  body: BodyInit,
  opts: ResponseInit = {},
  addContext: AddContextFn<z.infer<typeof baseLogSchema>>
) {
  addContext({
    res: parseJsonOrPassthrough(body),
    http_status: opts?.status ?? 200,
  })

  return new NextResponse(body, opts)
}

export function json(
  data: unknown,
  opts: ResponseInit = {},
  addContext: AddContextFn<z.infer<typeof baseLogSchema>>
) {
  addContext({
    res: data,
    http_status: opts.status ?? 200,
  })
  return Response.json(data, opts)
}

export function nextJson(
  data: unknown,
  opts: ResponseInit = {},
  addContext: AddContextFn<z.infer<typeof baseLogSchema>>
) {
  addContext({
    res: data,
    http_status: opts.status ?? 200,
  })
  return NextResponse.json(data, opts)
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

export function nextRedirect(
  url: string | URL,
  status: number = 302,
  addContext: AddContextFn<z.infer<typeof baseLogSchema>>
) {
  addContext({
    http_status: status,
  })
  return NextResponse.redirect(url, status)
}

export async function parseJson(
  request: Request,
  addContext: AddContextFn<z.infer<typeof baseLogSchema>>
) {
  if (!(request instanceof Request)) {
    // @ts-expect-error: this is here in cases where the transform transforms `.json` calls which aren't actually
    // called on a `Request` class instance.
    return request.json()
  }
  try {
    const requestBody = await request.json()
    addContext({
      req: requestBody,
    })
    return requestBody
  } catch (error) {
    addContext({
      error: serializeError(error),
    })
    throw error
  }
}

export async function parseText(
  request: Request,
  addContext: AddContextFn<z.infer<typeof baseLogSchema>>
) {
  if (!(request instanceof Request)) {
    // @ts-expect-error: this is here in cases where the transform transforms `.text` calls which aren't actually
    // called on a `Request` class instance.
    return request.text()
  }
  try {
    const requestBody = await request.text()
    addContext({
      req: requestBody,
    })
    return requestBody
  } catch (error) {
    addContext({
      error: serializeError(error),
    })
    throw error
  }
}

export function catchUncaughtRoute<
  RequestType extends Request,
  T extends { params: Record<string, unknown> },
>(
  fn: (request: RequestType, context: T) => Promise<Response> | Response,
  addContext: AddContextFn<z.infer<typeof baseLogSchema>>,
  flush: FlushFn,
  options?: Partial<z.infer<typeof baseLogSchema>>
): (request: RequestType, context: T) => Promise<Response> {
  return async (request: RequestType, context: T) => {
    const t0 = Date.now()
    if (options) addContext(options)
    try {
      addContext({
        req_headers: headersToRecord(request.headers),
      })
      const res = await fn(request, context)
      addContext({
        res_headers: headersToRecord(res.headers),
        http_status: res.status,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        req_headers: headersToRecord(headers()),
      })
      addContext({
        req: args,
      })
      addContext({
        type: "action",
      })
      const res = await fn(...args)
      addContext({ res })
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

export function catchUncaughtPage(
  fn: (params?: Record<string, string | string[]>) => Promise<object> | object,
  addContext: AddContextFn<z.infer<typeof baseLogSchema>>,
  flush: FlushFn,
  options?: Partial<z.infer<typeof baseLogSchema>>
): (params?: Record<string, string | string[]>) => Promise<object> {
  return async (params?: Record<string, string | string[]>) => {
    const t0 = Date.now()
    if (options) addContext(options)
    try {
      addContext({
        req_headers: headersToRecord(headers()),
      })
      const res = await fn(params)
      addContext({
        http_status: 200,
      })
      addContext({
        duration: Date.now() - t0,
      })
      flush("log")
      return res
    } catch (error) {
      addContext({ error: serializeError(error) })
      addContext({
        duration: Date.now() - t0,
        http_status: 500,
      })
      flush("error")
      throw error
    }
  }
}

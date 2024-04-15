import { z } from "zod"
import { baseLogSchema } from "./schemas"
import {
  catchUncaughtAction,
  catchUncaughtRoute,
  json,
  parseJson,
  parseText,
  redirect,
  response,
} from "./request-utils"
import { buildJsonLog, buildTextLog, sendLogToApi } from "./utils"
import { AddContextFn } from "./types"

export type FlytrapLogsOptions = {
  /**
   * The format in which to log out the canonical log line.
   *
   * @default 'json'
   *
   * The JSON format is as follows:
   * @example
   * ```json
   * {
   *   "http_status": 200,
   *   "user_id": "abcd"
   * }
   * ```
   *
   * The `text` format looks like this:
   * @example
   * ```
   * http_status=200 user_id=abcd
   * ```
   */
  format?: "json" | "text"

  /**
   * Whether to simply flush the logs to stdout / stderr, or to send them to an API.
   *
   * If `flushMethod` is `'api'`, the log format will default to `'json'`.
   *
   * If you're using our Logs Vercel Integration, this should be `'stdout'`
   */
  flushMethod?: "stdout" | "api"

  /**
   * If the `flushMethod` is `'api'`, the logs will be sent to this endpoint with a POST request with a JSON payload.
   * The schema for the request can be found @TODO
   */
  logsEndpoint?: string

  /**
   * The Flytrap public key used to authenticate your requests.
   */
  flytrapPublicKey?: string

  /**
   * Options regarding the [Vercel Integration](https://github.com) @TODO
   */
  vercel?: {
    enabled?: boolean
    /**
     * @default true
     */
    sendLargeLogsToApi?: boolean
  }
}

export type FlushLevel = "error" | "warn" | "log"

export function createFlytrapLogger<T>({
  format = "json",
  flushMethod = "api",
  logsEndpoint = "https://flytrap-production.up.railway.app/api/v1/logs/raw",
  flytrapPublicKey,
  vercel,
}: FlytrapLogsOptions = {}) {
  const logFormat: FlytrapLogsOptions["format"] =
    flushMethod === "api" ? "json" : format

  type Log = z.infer<typeof baseLogSchema> & T
  const defaultLog = {
    type: "request",
    path: "PATH_UNDEFINED",
    req: null,
    req_headers: {},
    res: null,
    res_headers: {},
    http_status: 200,
    duration: 0,
    method: "GET",
  } satisfies z.infer<typeof baseLogSchema>

  const logs: Array<Partial<Log>> = [defaultLog as Log]

  // Function defintions
  function getContext() {
    return logs
  }

  function addContext(context: Partial<Log>) {
    logs.push(context)
  }

  function flush(level: FlushLevel = "log") {
    try {
      if (vercel?.enabled) {
        const logValue = buildJsonLog(logs)

        if (JSON.stringify(logValue).length > 4_000) {
          // Send large captures to API
          sendLogToApi(logValue, logsEndpoint, flytrapPublicKey)
        } else {
          // Smaller captures printed to `stdout` are forwarded via the Vercel
          // integration to our server.
          console[level](
            typeof logValue === "string" ? logValue : JSON.stringify(logValue)
          )
        }
        return
      }

      const logValue =
        logFormat === "text" ? buildTextLog(logs) : buildJsonLog(logs)

      if (flushMethod === "stdout") {
        console[level](
          typeof logValue === "string" ? logValue : JSON.stringify(logValue)
        )
      }
      if (flushMethod === "api") {
        // Send large captures to API
        sendLogToApi(logValue, logsEndpoint, flytrapPublicKey)
      }
    } catch (error) {
      console.error("Flytrap Logs SDK: Error when flushing logs. Error:")
      console.error(error)
    }
  }

  return {
    getContext,
    addContext,
    flush,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catchUncaughtAction<T extends (...args: any[]) => Promise<any>>(
      fn: T,
      options?: Partial<z.infer<typeof baseLogSchema>>
    ) {
      return catchUncaughtAction(
        fn,
        addContext as AddContextFn<z.infer<typeof baseLogSchema>>,
        flush,
        options
      )
    },
    // Request utils
    catchUncaughtRoute<
      RequestType extends Request,
      T extends { params: Record<string, unknown> },
    >(
      fn: (request: RequestType, context: T) => Promise<Response> | Response,
      options?: Partial<z.infer<typeof baseLogSchema>>
    ) {
      return catchUncaughtRoute(
        fn,
        addContext as AddContextFn<z.infer<typeof baseLogSchema>>,
        flush,
        options
      )
    },
    parseJson(request: Request) {
      return parseJson(
        request,
        addContext as AddContextFn<z.infer<typeof baseLogSchema>>
      )
    },
    parseText(request: Request) {
      return parseText(
        request,
        addContext as AddContextFn<z.infer<typeof baseLogSchema>>
      )
    },
    // Response utils
    response(body: BodyInit, opts: ResponseInit = {}) {
      return response(
        body,
        opts,
        addContext as AddContextFn<z.infer<typeof baseLogSchema>>
      )
    },
    json(data: unknown, opts: ResponseInit = {}) {
      return json(
        data,
        opts,
        addContext as AddContextFn<z.infer<typeof baseLogSchema>>
      )
    },
    redirect(url: string | URL, status?: number) {
      return redirect(
        url,
        status,
        addContext as AddContextFn<z.infer<typeof baseLogSchema>>
      )
    },
  }
}

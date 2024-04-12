import { z } from "zod"
import { baseLogSchema } from "./schemas"

function buildJson<T extends {}>(logs: Array<Partial<T>>) {
  const logsObj: Record<string, unknown> = {}
  for (let i = 0; i < logs.length; i++) {
    Object.entries(logs[i]).forEach(([key, value]) => {
      logsObj[key] = value
    })
  }
  return logsObj as T
}

function buildText<T>(logs: Array<Partial<T>>) {
  const jsonLine = buildJson(logs)
  return Object.entries(jsonLine)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(" ")
}

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
}

export type FlushLevel = "error" | "warn" | "log"

export function createFlytrapLogger<T>({
  format = "json",
  flushMethod = "api",
  logsEndpoint = "https://flytrap-production.up.railway.app/api/v1/logs/raw",
  flytrapPublicKey,
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

  let logs: Array<Partial<Log>> = [defaultLog as Log]

  return {
    getContext() {
      return logs
    },
    addContext(context: Partial<Log>) {
      logs.push(context)
    },
    flush(level: FlushLevel = "log") {
      try {
        const logValue =
          logFormat === "text" ? buildText(logs) : buildJson(logs)

        if (flushMethod === "stdout") {
          console[level](
            typeof logValue === "string" ? logValue : JSON.stringify(logValue)
          )
        }
        if (flushMethod === "api") {
          fetch(logsEndpoint, {
            method: "POST",
            body: JSON.stringify(logValue),
            headers: new Headers({
              "Content-Type": "application/json",
              ...(flytrapPublicKey && {
                Authorization: `Bearer ${flytrapPublicKey}`,
              }),
            }),
          }).then(async (res) => {
            if (res.ok === false) {
              console.error(
                "Flytrap Logs SDK: Failed to save logs to API. Error:"
              )
              console.error(await res.text())
            }
          })
        }
      } catch (error) {
        console.error("Flytrap Logs SDK: Error when flushing logs. Error:")
        console.error(error)
      }
    },
  }
}

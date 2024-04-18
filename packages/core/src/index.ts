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
import { AddContextFn, FlushLevel, Log } from "./types"
import { encryptLogObject } from "./encryption"
import { createError } from "@useflytrap/logs-shared"
import { invariant } from "./tiny-invariant"

export type FlytrapLogsOptions<T extends object> = {
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
   * This is the public key sent with `fetch` log ingestion requests as the `Authorization: Bearer <publicKey>` header.
   *
   * The public key should be a base64 encoded public key with the prefix `pk_`.
   * Refer to [encryption.ts](./encryption.ts) for implementation details.
   *
   * For [Flytrap Logs](https://www.useflytrap.com) users, this is the public key that gets created for you when you make your project.
   */
  publicKey?: string

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

  encryption?: {
    /**
     * Enable encryption for your log data. By default, only keys @TODO are encrypted. You can define which keys get encrypted
     * by using the `encryptKeys` option.
     */
    enabled?: boolean
    /**
     * Define which keys of the log object should be encrypted with the public key.
     */
    encryptKeys?: (keyof Log<T>)[]
  }
}

export const defaultEncryptedKeys = [
  "req",
  "req_headers",
  "res",
  "res_headers",
  "error",
] satisfies (keyof Log<object>)[]
export const requiredKeys = [
  "method",
  "type",
  "path",
  "http_status",
  "duration",
] as const

export function validateConfig<T extends object>({
  encryption,
  publicKey,
}: FlytrapLogsOptions<T>) {
  if (encryption?.enabled && encryption.encryptKeys !== undefined) {
    type RequiredKey = (typeof requiredKeys)[number]
    const matchingRequiredKeys = encryption.encryptKeys.filter(
      (keyToEncrypt): keyToEncrypt is RequiredKey =>
        requiredKeys.includes(keyToEncrypt as RequiredKey)
    )

    if (matchingRequiredKeys.length > 0) {
      throw createError({
        events: ["config_invalid"],
        explanations: ["encrypting_required_keys"],
        params: {
          keys: matchingRequiredKeys
            .map((key) => `\`${String(key)}\``)
            .join(", "),
        },
      }).toString()
    }
  }

  if (encryption?.enabled === true && publicKey === undefined) {
    throw createError({
      events: ["config_invalid"],
      explanations: ["encryption_enabled_without_pubkey"],
      solutions: ["add_pubkey", "read_config_docs"],
    }).toString()
  }
}

export function createFlytrapLogger<T extends object>({
  format = "json",
  flushMethod = "api",
  logsEndpoint = "https://flytrap-production.up.railway.app/api/v1/logs/raw",
  publicKey,
  vercel,
  encryption,
}: FlytrapLogsOptions<T> = {}) {
  const logFormat: FlytrapLogsOptions<T>["format"] =
    flushMethod === "api" ? "json" : format

  // Config validation
  validateConfig({
    format,
    flushMethod,
    logsEndpoint,
    publicKey,
    vercel,
    encryption,
  })
  // @todo: more validation that the config is correct,
  // eg. with format etc
  // if vercel?.enabled -> need also publicKey

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

  const logs: Array<Partial<Log<T>>> = [defaultLog as Log<T>]

  // Function defintions
  function getContext() {
    return logs
  }

  function addContext(context: Partial<Log<T>>) {
    logs.push(context)
  }

  async function flushAsync(level: FlushLevel = "log") {
    try {
      if (encryption?.enabled) {
        invariant(
          publicKey,
          createError({
            events: ["config_invalid"],
            explanations: ["encryption_enabled_without_pubkey"],
            solutions: ["add_pubkey", "read_config_docs"],
          }).toString()
        )
      }

      const combinedLogObject = buildJsonLog(logs)
      let logValue = combinedLogObject

      // Encryption
      if (encryption?.enabled === true) {
        const encryptionResult = await encryptLogObject(
          combinedLogObject,
          encryption.encryptKeys ?? defaultEncryptedKeys,
          publicKey!
        )
        if (encryptionResult.err === true) {
          throw encryptionResult.val.toString()
        }

        logValue = encryptionResult.val
      }

      if (vercel?.enabled) {
        if (
          JSON.stringify(logValue).length > 4_000 &&
          vercel.sendLargeLogsToApi !== false
        ) {
          // Send large captures to API
          await sendLogToApi(logValue, logsEndpoint, publicKey)
        } else {
          // Smaller captures printed to `stdout` are forwarded via the Vercel
          // integration to our server.
          console[level](
            typeof logValue === "string" ? logValue : JSON.stringify(logValue)
          )
        }
        return
      }

      if (flushMethod === "stdout") {
        console[level](
          logFormat === "text"
            ? buildTextLog(logValue)
            : JSON.stringify(logValue)
        )
      }
      if (flushMethod === "api") {
        // Send large captures to API
        await sendLogToApi(logValue, logsEndpoint, publicKey)
      }
    } catch (error) {
      console.error("Flytrap Logs SDK: Error when flushing logs. Error:")
      console.error(error)
    }
  }

  function flush(level: FlushLevel = "log") {
    flushAsync(level)
  }

  return {
    getContext,
    addContext,
    flushAsync,
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

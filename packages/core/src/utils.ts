import { EncryptedLogKeyValue } from "./types"

export function parseJsonOrPassthrough<T>(input: T) {
  try {
    return JSON.parse(String(input))
  } catch {
    return input
  }
}

export function headersToRecord(headers: Headers) {
  const headersRecord: Record<string, string> = {}
  headers.forEach((value, key) => {
    headersRecord[key] = value
  })

  return headersRecord
}

export function buildJsonLog<T extends object>(logs: Array<Partial<T>>) {
  const logsObj: Record<string, unknown> = {}
  for (let i = 0; i < logs.length; i++) {
    Object.entries(logs[i]).forEach(([key, value]) => {
      logsObj[key] = value
    })
  }
  return logsObj as T
}

export function buildTextLog(logObject: object) {
  return Object.entries(logObject)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(" ")
}

export function sendLogToApi<T>(
  log: T,
  logsEndpoint: string,
  flytrapPublicKey?: string
) {
  return fetch(logsEndpoint, {
    method: "POST",
    body: JSON.stringify(log),
    headers: new Headers({
      "Content-Type": "application/json",
      ...(flytrapPublicKey && {
        Authorization: `Bearer ${flytrapPublicKey}`,
      }),
    }),
    keepalive: true,
  }).then(async (res) => {
    if (res.ok === false) {
      console.error("Flytrap Logs SDK: Failed to save logs to API. Error:")
      console.error(await res.text())
    }
  })
}

export function isEncryptedLogKeyValue(
  input: unknown
): input is EncryptedLogKeyValue {
  return (
    typeof input === "object" &&
    (input as EncryptedLogKeyValue).type === "encrypted" &&
    typeof (input as EncryptedLogKeyValue).data === "string"
  )
}

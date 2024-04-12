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

export function buildTextLog<T>(logs: Array<Partial<T>>) {
  const jsonLine = buildJsonLog(logs)
  return Object.entries(jsonLine)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(" ")
}

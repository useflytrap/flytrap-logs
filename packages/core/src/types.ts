import type { input } from "zod"
import { baseLogSchema } from "./schemas"

export type AddContextFn<Log> = (context: Partial<Log>) => void
export type FlushFn = (level: FlushLevel) => void
export type Log<T> = (input<typeof baseLogSchema>) & T

export type FlushLevel = "error" | "warn" | "log"

export type EncryptedLogKeyValue = {
  type: "encrypted";
  data: string;
}

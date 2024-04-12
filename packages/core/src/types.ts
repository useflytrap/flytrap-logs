import { FlushLevel } from "./index"

export type AddContextFn<Log> = (context: Partial<Log>) => void
export type FlushFn = (level: FlushLevel) => void

import { createFlytrapLogger } from "@useflytrap/logs"

export const {
  getContext,
  addContext,
  flushAsync,
  flush,
  catchUncaughtAction,
  catchUncaughtRoute,
  parseJson,
  parseText,
  response,
  nextResponse,
  json,
  nextJson,
  redirect,
  nextRedirect,
} = createFlytrapLogger({
  flushMethod: "stdout",
})

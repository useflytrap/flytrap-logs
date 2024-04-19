export type LogsPluginOptions = {
  response?: {
    json?: boolean
    redirect?: boolean
  }
  request?: {
    json?: boolean
    text?: boolean
  }
  next?: {
    serverActions?: boolean
    serverActionsPaths?: string[]
    routeHandlers?: boolean
  }
}

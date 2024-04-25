export type LogsPluginOptions = {
  request?: {
    json?: boolean
    text?: boolean
    formData?: boolean
  }
  response?: {
    json?: false | string
    redirect?: false | string
    classInstance?: false | string
    classInstanceName?: string
    ensureGlobalResponse?: boolean
  }
  next?: {
    serverActions?: boolean
    serverActionsPaths?: string[]
    routeHandlers?: boolean
    routeHandlerPaths?: string[]
    nextRequest?: {
      json?: boolean
      text?: boolean
      formData?: boolean
    }
    nextResponse?: {
      json?: false | string
      redirect?: false | string
      classInstance?: false | string
      classInstanceName?: string
    }
  }
}

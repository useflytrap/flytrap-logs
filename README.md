<a href="https://useflytrap.com">
  <img src="https://raw.githubusercontent.com/useflytrap/flytrap-logs/main/.github/assets/cover.png" alt="Flytrap cover" />
</a>

<div align="center">
  <table>
    <tbody>
      <tr>
        <td>
          <a href="https://discord.gg/tQaADUfdeP">💬 Join our Discord</a>
        </td>
        <td>
          <a href="https://x.com/useflytrap">𝕏 Follow us</a>
        </td>
      </tr>
    </tbody>
  </table>
</div>


# Flytrap Logs

[![npm version][npm-version-src]][npm-href]
[![npm downloads][npm-downloads-src]][npm-href]
[![Github Actions][github-actions-src]][github-actions-href]

> Instant Stripe-level observability for your Next.js project.

Flytrap Logs is a collection of packages to add [Stripe-inspired canonical logging](https://stripe.com/blog/canonical-log-lines) to your Next.js project. Works both manually and automatically through our plugin.

- `@useflytrap/logs`: Used for constructing the Stripe-inspired canonical log lines.
- `@useflytrap/logs-transform` A code-transform for automatically instrumenting your Next.js [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) and [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

With Flytrap Logs, each request / Server Action will be accompanied with a log that will be structured and something like this:

```json
{
  "method": "POST",
  "type": "request",
  "path": "/api/v1/captures",
  "req": "{ 'hello': 'world' }",
  "req_headers": {
    "accept": "*/*",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "sv-SE,sv;q=0.9",
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
    "x-forwarded-host": "www.useflytrap.com",
    "x-forwarded-port": "443",
    "x-forwarded-proto": "https",
    "x-matched-path": "/api/v1/captures",
  },
  "res": {
    "message": "Invalid public API key."
  },
  "res_headers": {
    "content-type": "application/json"
  },
  "http_status": 401,
  "duration": 80,
  "auth_type": "api_key",
  "project_id": "proj_01hsw5hj47fwst6xs4axx78x8h",
  "key_id": "pk_MIIBIjANGpt",
  "permissions_used": [
    "capture"
  ]
}
```

## Features

- Stripe-inspired observability for your Next.js project
- Easily add context to your canonical log lines
- Saves requests, responses, headers
- Optional encryption for log fields
- Fully type-safe logging
- Identify users, API keys etc in your logs easily

## 💻 Quickstart

1. Install the Flytrap Logs SDK

```pnpm
$ npm install @useflytrap/logs
```

2. Create a logging file (`logging.ts`)

```typescript
import { PermissionedApiKey } from "@/types"
import { createFlytrapLogger } from "@useflytrap/logs"

export type AdditionalLogContext = {
  team_id: string
  project_id: string
  auth_type: "api_key" | "dashboard"
  permissions_used: PermissionedApiKey["permissions"]
  build_id: string
  key_id: string
}

export const {
  addContext,
  flushAsync,
  flush,
  catchUncaughtAction,
  catchUncaughtRoute,
  response,
  nextResponse,
  json,
  nextJson,
  redirect,
  nextRedirect,
  parseJson,
  parseText,
} = createFlytrapLogger<AdditionalLogContext>({
  publicKey:
    "pk_MIIBI...",
  encryption: {
    enabled: true,
  },
})
```

This is our example logging definition for [our production site](https://www.useflytrap.com). Let's unpack what's going on here.

- We're defining our `AdditionalLogContext` type. This will give us auto-complete throughout our code-base when using `addContext` to add context to our canonical log lines.
- We're enabling encryption, and providing a public key to encrypt the values with. By default, sensitive values such as request payloads, headers, response payloads and errors (containing stacktraces) are encrypted when encryption is enabled.
- We're exporting the functions that will be needed throughout our codebase (eg. `addContext`, `response`, `json`). These will be used throughout our code-base to add context to our canonical log.

For instance, instead of `return Response.json({ success: true })`, we would have `return json({ success: true })`.

We recommend to use our code-transform `@useflytrap/logs-transform`, which will automatically do everything for you.

3. (Optional) Setup Flytrap Logs code transform

If you have a large code-base already, you probably don't want to change it just for our tool. Because of this, we have created a Flytrap Logs plugin, which automatically changes the code at runtime, so you don't have to do anything.

- Simply install the `@useflytrap/logs-transform` package

```bash
$ npm install @useflytrap/logs-transform
```

- Add the plugin to your Next.js config

```typescript
// next.config.mjs
import { webpack } from "@useflytrap/logs-transform"

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
		config.plugins = config.plugins ?? []
		config.infrastructureLogging = { level: 'error' }
    config.plugins.push(webpack({
      // here goes the plugin options
    }))
		return config
	},
}

export default nextConfig
```

4. (Optional) Manually use core SDK functions

If you don't want to use the code-transform, you can manually use the core SDK functions. Here are the changes you should make:

- Server Actions using the `catchUncaughtAction` wrapper

```typescript
"use server"

export async function foo() {
  // ... your code here ...
}

// becomes:
export const foo = catchUncaughtAction(() => {
  // ... your code here ...
}, {
  path: "@/actions/foo" // 👈 whichever path to distinguish this action from others
}
```

- Route Handlers using the `catchUncaughtRoute` wrapper

```typescript
export async function POST() {
  // ... your code here ...
}

// becomes:
export const POST = catchUncaughtRoute(() => {}, {
  path: "/api/v1/user",
  method: "POST",
})
```

#### Response utils

- `Response.json()` -> `json()`
- `Response.redirect()` -> `redirect()`
- `new Response()` -> `response()`
- `NextResponse.json()` -> `nextJson()`
- `NextResponse.redirect()` -> `nextRedirect()`
- `new NextResponse()` -> `nextResponse()`

#### Request utils
- `req.json()` -> `parseJson(req)`
- `req.text()` -> `parseText(req)`

5. Et voila! Enjoy your canonical logging setup

Try making a request, and you should see requests & server actions get logged in the console. If you want to send them to an API, you can change the `flushMethod` to `'api'` in your `logging.ts`, and define `logsEndpoint` with your API endpoint.

## 💻 Setting up Flytrap Logs Dashboard

If you want automatically set-up dashboards for your Route Handlers, Server Actions that look like this 👇, you can integrate our Logs SDK with the Flytrap Logs Dashboard.

| | | |
|:-------------------------:|:-------------------------:|:-------------------------:|
|<img width="1604" alt="Flytrap Logs Dashboard" src="./docs/overview-narrow.png"> |  <img width="1604" alt="Flytrap Logs Search" src="./docs/logs-search.png">|<img width="1604" alt="Route Handler Request" src="./docs/route-handler.png">|
|<img width="1604" alt="Request with an error" src="./docs/server-action-error.png">  |  <img width="1604" alt="Server Action request" src="./docs/server-action.png">||
||||

1. Sign up on [Flytrap](https://www.useflytrap.com/register)
2. Create a project, select the "Logs" product during the onboarding
3. Create your `logging.ts` file, and add the `publicKey` from your onboarding there.
4. Set the `flushMethod` in your `logging.ts` file to `'api'`

## 💻 Development

- Clone this repository
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable` (use `npm i -g corepack` for Node.js < 16.10)
- Install dependencies using `pnpm install`
- Run the tests using `pnpm dev`

## License

Made with ❤️ in Helsinki

Published under [MIT License](./LICENSE).

<!-- Links -->

[npm-href]: https://www.npmjs.com/package/@useflytrap/logs
[github-actions-href]: https://github.com/useflytrap/flytrap-logs/actions/workflows/ci.yml

<!-- Badges -->

[npm-version-src]: https://badgen.net/npm/v/@useflytrap/logs?color=black
[npm-downloads-src]: https://badgen.net/npm/dw/@useflytrap/logs?color=black
[prettier-src]: https://badgen.net/badge/style/prettier/black?icon=github
[github-actions-src]: https://github.com/useflytrap/flytrap-logs/actions/workflows/ci.yml/badge.svg

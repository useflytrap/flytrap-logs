import { expect, it, test, vi } from "vitest";
import { Log } from "../src/types";
import { decryptLogObject, encryptLogObject, generateKeyPair } from "../src/encryption";
import { createFlytrapLogger, defaultEncryptedKeys } from "../src";

const mockLogObject = {
  method: 'GET',
  type: "request",
  path: '/api/v1/user',
  req: {
    hello: 'world',
  },
  req_headers: {},
  res: {},
  res_headers: {},
  http_status: 200,
  duration: 13,
  user_id: 'gavin.belson@hooli.com',
  user_email: 'gavin.belson@hooli.com'
} satisfies Log<{}>;

it("errors when trying to encrypt needed values", async () => {
  expect(() => {
    createFlytrapLogger({
      encryption: {
        enabled: true,
        encryptKeys: ["http_status"]
      }
    })
  }).toThrowError()
})

test("encryptLogObject", async () => {
  const keyPair = (await generateKeyPair()).unwrap();
  const encryptedLogObjectResult = await encryptLogObject(mockLogObject, ["req"], keyPair.publicKey);
  if (encryptedLogObjectResult.err === true) {
    throw 'encrypting failed';
  }

  expect(encryptedLogObjectResult.err).toBe(false)
  expect(encryptedLogObjectResult.val).toBeTypeOf("object")
  expect(encryptedLogObjectResult.val.req).keys(["type", "data"])
  expect(encryptedLogObjectResult.val.req.type).toBe("encrypted")
})

test("decryptLogObject", async () => {
  const keyPair = (await generateKeyPair()).unwrap();
  const encryptedLogObjectResult = await encryptLogObject(mockLogObject, ["req"], keyPair.publicKey);
  if (encryptedLogObjectResult.err === true) {
    throw 'encrypting failed'
  }
  
  const decryptedLogObject = await decryptLogObject(encryptedLogObjectResult.val, keyPair.privateKey);
  expect(decryptedLogObject.err).toBe(false)
  expect(decryptedLogObject.val).toStrictEqual(mockLogObject)
})


test("encryption integration", async () => {
  const logSpy = vi.spyOn(console, 'log');
  const keyPair = (await generateKeyPair()).unwrap();

  const logger = createFlytrapLogger<{ customField: string }>({
    flushMethod: "stdout",
    publicKey: keyPair.publicKey,
    encryption: {
      enabled: true,
      encryptKeys: [...defaultEncryptedKeys, "customField"]
    }
  })

  const mockLogContext: Parameters<typeof logger.addContext>[0] = {
    ...mockLogObject,
    req: { hello: 'world' },
    res: { foo: 'bar' },
    customField: 'custom value',
  }

  logger.addContext(mockLogContext)

  await logger.flushAsync()

  expect(logSpy).toHaveBeenCalledOnce()

  const loggedLogObject = JSON.parse(logSpy.mock.calls[0][0] as string) as Log<{ customField: string }>

  expect(loggedLogObject.req).toBeTypeOf("object")
  expect(loggedLogObject.req).keys(["type", "data"])

  expect(loggedLogObject.req_headers).toBeTypeOf("object")
  expect(loggedLogObject.req_headers).keys(["type", "data"])

  expect(loggedLogObject.res).toBeTypeOf("object")
  expect(loggedLogObject.res).keys(["type", "data"])

  expect(loggedLogObject.res_headers).toBeTypeOf("object")
  expect(loggedLogObject.res_headers).keys(["type", "data"])

  // Let's decrypt it 
  const decryptResult = await decryptLogObject(loggedLogObject, keyPair.privateKey);
  if (decryptResult.err === true) {
    throw decryptResult.val.toString()
  }

  expect(decryptResult.val).toStrictEqual(mockLogContext)
  logSpy.mockRestore()
})

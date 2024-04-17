// @todo: type tests

import { describe, test } from "vitest";
import { createFlytrapLogger } from "../src";

describe("`encryption` type tests", () => {
  test("encryptKeys", () => {
    createFlytrapLogger<{ hello: 'world' }>({
      encryption: {
        encryptKeys: ["hello", "req", "req_headers"]
      }
    });
    createFlytrapLogger<{ hello: 'world' }>({
      encryption: {
        // @ts-expect-error: should be valid key
        encryptKeys: [""]
      }
    });
    createFlytrapLogger<{ hello: 'world' }>({
      encryption: {
        // @ts-expect-error: all keys should be valid
        encryptKeys: ["abc", "hello", "req", "req_headers"]
      }
    });
  })
})

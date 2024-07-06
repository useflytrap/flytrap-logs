import { describe } from "vitest"
import { createDescribe } from "./test-utils"

const requestJsonCases = [
  [
    "transforms only .json calls which have no arguments",
    `x.json(1)`,
    `x.json(1)`,
  ],
  ["transforms .json", "x.json()", "parseJson(x)"],
]

const requestTextCases = [
  [
    "transforms only .text calls which have no arguments",
    `x.text(1)`,
    `x.text(1)`,
  ],
  ["transforms .text", "x.text()", "parseText(x)"],
]

/* const requestFormDataCases = [
  [
    "transforms only .formData calls which have no arguments",
    `x.formData(1)`,
    `x.formData(1)`,
  ],
  ["transforms .formData", "x.formData()", "parseFormData(x)"],
] */

describe("Request transforms", () => {
  createDescribe("Request.json", requestJsonCases)
  createDescribe("Request.text", requestTextCases)
  // createDescribe("Request.formData", requestFormDataCases)
})

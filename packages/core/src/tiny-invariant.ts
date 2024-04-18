/*

MIT License

Copyright (c) 2019 Alexander Reardon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

// @note: we're needed to inline this dependency, because `tiny-invariant` uses
// `process`, which isn't available in all runtimes.

const prefix: string = "Invariant failed"

/**
 * `invariant` is used to [assert](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions) that the `condition` is [truthy](https://github.com/getify/You-Dont-Know-JS/blob/bdbe570600d4e1107d0b131787903ca1c9ec8140/up%20%26%20going/ch2.md#truthy--falsy).
 *
 * 💥 `invariant` will `throw` an `Error` if the `condition` is [falsey](https://github.com/getify/You-Dont-Know-JS/blob/bdbe570600d4e1107d0b131787903ca1c9ec8140/up%20%26%20going/ch2.md#truthy--falsy)
 *
 * 🤏 `message`s are not displayed in production environments to help keep bundles small
 *
 * @example
 *
 * ```ts
 * const value: Person | null = { name: 'Alex' };
 * invariant(value, 'Expected value to be a person');
 * // type of `value`` has been narrowed to `Person`
 * ```
 */
export function invariant(
  condition: unknown,
  // Not providing an inline default argument for message as the result is smaller
  /**
   * Can provide a string, or a function that returns a string for cases where
   * the message takes a fair amount of effort to compute
   */
  message?: string | (() => string)
): asserts condition {
  if (condition) {
    return
  }
  // Condition not passed

  // When not in production we allow the message to pass through
  // *This block will be removed in production builds*

  const provided: string | undefined =
    typeof message === "function" ? message() : message

  // Options:
  // 1. message provided: `${prefix}: ${provided}`
  // 2. message not provided: prefix
  const value: string = provided ? `${prefix}: ${provided}` : prefix
  throw new Error(value)
}

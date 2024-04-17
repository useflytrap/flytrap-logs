import { Err, Ok, Result } from "ts-results"
import { createError } from "@useflytrap/logs-shared"
import { EncryptedLogKeyValue, Log } from "./types"
import { isEncryptedLogKeyValue } from "./utils"

const MAX_CHUNK_SIZE = 190 // 2048 bits RSA-OAEP key size, minus padding (256 bits)
const CHUNK_SEPARATOR = "|"

export interface KeyPair {
  publicKey: string
  privateKey: string
}

export function encodeBase64(publicKey: ArrayBuffer) {
  let binaryString = ""
  try {
    const bytes = new Uint8Array(publicKey)

    bytes.forEach((byte) => {
      binaryString += String.fromCharCode(byte)
    })

    return Ok(btoa(binaryString))
  } catch (e) {
    return Err(
      createError({
        explanations: ["encode_base64_failed"],
        params: {
          inputValue: binaryString,
          encodeError: String(e),
        },
      })
    )
  }
}

export function decodeBase64(base64: string) {
  try {
    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)

    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return Ok(bytes.buffer)
  } catch (e) {
    return Err(
      createError({
        explanations: ["decode_base64_failed"],
        params: {
          inputValue: base64,
          decodeError: String(e),
        },
      })
    )
  }
}

export async function getCrypto() {
  // For Web Workers where 'self' is defined
  if (typeof self !== "undefined" && "crypto" in self) {
    return Ok(self.crypto as Crypto)
  }
  // For Web Workers and Browsers
  if (typeof window !== "undefined" && window.crypto) {
    return Ok(window.crypto)
  }
  // For Node.js
  if (typeof globalThis !== "undefined" && typeof process !== "undefined") {
    try {
      // Dynamically import the 'crypto' module available in Node.js
      return Ok(await import("crypto"))
    } catch (e) {
      return Err(
        createError({
          explanations: ["crypto_instance_not_found"],
          solutions: ["join_discord", "open_issue"],
          params: {
            env: `window=${typeof window !== "undefined"} process=${
              typeof process !== "undefined"
            }`,
            error: `Error: ${String(e)}`,
          },
        })
      )
    }
  }

  return Err(
    createError({
      explanations: ["crypto_instance_not_found"],
      solutions: ["join_discord", "open_issue"],
      params: {
        env: `window=${typeof window !== "undefined"} process=${
          typeof process !== "undefined"
        }`,
        error: `No globalThis, not process, nor window.`,
      },
    })
  )
}

export async function generateKeyPair() {
  const cryptoResult = await getCrypto()
  if (cryptoResult.err) {
    cryptoResult.val.addEvents(["crypto_generate_key_failed"])
    return cryptoResult
  }

  const crypto = cryptoResult.val
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  )

  const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey)
  const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)

  const encodedPublicPrivateKeyResult = Result.all(
    encodeBase64(publicKey),
    encodeBase64(privateKey)
  )

  if (encodedPublicPrivateKeyResult.err) {
    encodedPublicPrivateKeyResult.val.addEvents(["crypto_generate_key_failed"])
    return encodedPublicPrivateKeyResult
  }

  const [publicKeyBase64, privateKeyBase64] = encodedPublicPrivateKeyResult.val

  return Ok({
    publicKey: "pk_" + publicKeyBase64,
    privateKey: "sk_" + privateKeyBase64,
  } satisfies KeyPair)
}

async function encryptChunk(publicKey: CryptoKey, chunk: Uint8Array) {
  const cryptoResult = await getCrypto()
  if (cryptoResult.err === true) {
    return cryptoResult
  }
  return Ok(
    await cryptoResult.val.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      publicKey,
      chunk
    )
  )
}

async function decryptChunk(privateKey: CryptoKey, chunk: ArrayBuffer) {
  const cryptoResult = await getCrypto()
  if (cryptoResult.err === true) {
    return cryptoResult
  }
  return Ok(
    await cryptoResult.val.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      chunk
    )
  )
}

export async function encrypt(publicKeyString: string, plaintext: string) {
  if (typeof plaintext !== "string") {
    return Err(
      createError({
        explanations: ["encrypt_failed_invalid_plaintext_type"],
        params: {
          plaintext,
        },
      })
    )
  }

  if (typeof publicKeyString !== "string") {
    return Err(
      createError({
        explanations: ["encrypt_failed_invalid_key_type"],
        params: {
          publicKey: publicKeyString,
        },
      })
    )
  }

  const [, publicKeyBase64] = publicKeyString.split("pk_")
  const publicKeyBufferResult = decodeBase64(publicKeyBase64)
  if (publicKeyBufferResult.err) {
    return publicKeyBufferResult
  }

  const cryptoResult = await getCrypto()
  if (cryptoResult.err) {
    return cryptoResult
  }
  const crypto = cryptoResult.val
  const publicKey = await crypto.subtle.importKey(
    "spki",
    publicKeyBufferResult.val,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  )

  const data = new TextEncoder().encode(plaintext)
  const chunks = []

  for (let i = 0; i < data.length; i += MAX_CHUNK_SIZE) {
    const chunk = data.subarray(i, i + MAX_CHUNK_SIZE)
    const encryptedChunkResult = await encryptChunk(publicKey, chunk)
    if (encryptedChunkResult.err === true) {
      return encryptedChunkResult
    }

    const base64ChunkResult = encodeBase64(encryptedChunkResult.val)
    if (base64ChunkResult.err) {
      return base64ChunkResult
    }
    chunks.push(base64ChunkResult.val)
  }

  return Ok(chunks.join(CHUNK_SEPARATOR))
}

export async function decrypt(privateKeyString: string, ciphertext: string) {
  if (typeof ciphertext !== "string") {
    return Err(
      createError({
        explanations: ["decrypt_failed_invalid_ciphertext_type"],
        params: {
          ciphertext,
        },
      })
    )
  }

  if (typeof privateKeyString !== "string") {
    return Err(
      createError({
        explanations: ["decrypt_failed_invalid_key_type"],
        params: {
          privateKey: privateKeyString,
        },
      })
    )
  }

  const [, privateKeyBase64] = privateKeyString.split("sk_")

  const privateKeyBufferResult = decodeBase64(privateKeyBase64)
  if (privateKeyBufferResult.err) {
    return privateKeyBufferResult
  }

  const cryptoResult = await getCrypto()
  if (cryptoResult.err) {
    return cryptoResult
  }

  const crypto = cryptoResult.val
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBufferResult.val,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  )

  const base64Chunks = ciphertext.split(CHUNK_SEPARATOR)
  const decryptedChunks = []

  for (const base64Chunk of base64Chunks) {
    const chunkBufferResult = decodeBase64(base64Chunk)
    if (chunkBufferResult.err) {
      return chunkBufferResult
    }
    const decryptedChunkResult = await decryptChunk(
      privateKey,
      chunkBufferResult.val
    )
    if (decryptedChunkResult.err === true) {
      return decryptedChunkResult
    }
    decryptedChunks.push(new Uint8Array(decryptedChunkResult.val))
  }

  const decrypted = new Uint8Array(
    decryptedChunks.reduce((acc, curr) => acc + curr.length, 0)
  )
  let offset = 0

  for (const chunk of decryptedChunks) {
    decrypted.set(chunk, offset)
    offset += chunk.length
  }

  return Ok(new TextDecoder().decode(decrypted))
}

export async function encryptLogObject<T>(
  log: Log<T>,
  encryptKeys: (keyof Log<T>)[],
  publicKey: string
) {
  const logShallowClone = { ...log }
  for (let i = 0; i < encryptKeys.length; i++) {
    const keyToEncrypt = encryptKeys[i]
    const valueToEncrypt = logShallowClone[keyToEncrypt]

    if (valueToEncrypt === undefined) continue

    const encryptResult = await encrypt(
      publicKey,
      JSON.stringify(valueToEncrypt)
    )
    if (encryptResult.err === true) {
      encryptResult.val.addEvents(["encrypting_log_failed"])
      return encryptResult
    }

    // @ts-expect-error
    logShallowClone[keyToEncrypt] = {
      type: "encrypted",
      data: encryptResult.val,
    } satisfies EncryptedLogKeyValue
  }
  return Ok(logShallowClone)
}

// @note: when we're decrypting, we don't always know the `encryptKeys` values, so we just need to
// try every key value and see if they're the encrypted type
export async function decryptLogObject<T>(log: Log<T>, privateKey: string) {
  const logShallowClone = { ...log }

  for (const [key, value] of Object.entries(logShallowClone)) {
    if (isEncryptedLogKeyValue(value)) {
      const decryptResult = await decrypt(privateKey, value.data)
      if (decryptResult.err === true) {
        return decryptResult
      }
      // @ts-expect-error
      logShallowClone[key] = JSON.parse(decryptResult.val)
    }
  }

  return Ok(logShallowClone)
}

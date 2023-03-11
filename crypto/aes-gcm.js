/**
 * AES-GCM is a symmetric key for encryption
 */

import * as encoding from '../encoding.js'
import * as decoding from '../decoding.js'
import * as webcrypto from 'lib0/webcrypto'
import * as string from '../string.js'

/**
 * @typedef {Array<'encrypt'|'decrypt'>} Usages
 */

/**
 * @type {Usages}
 */
const defaultUsages = ['encrypt', 'decrypt']

/**
 * @param {CryptoKey} key
 * @param {Uint8Array} data
 */
export const encrypt = (key, data) => {
  const iv = webcrypto.getRandomValues(new Uint8Array(16)) // 92bit is enough. 128bit is recommended if space is not an issue.
  return webcrypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    data
  ).then(cipher => {
    const encryptedDataEncoder = encoding.createEncoder()
    // iv may be sent in the clear to the other peers
    encoding.writeUint8Array(encryptedDataEncoder, iv)
    encoding.writeVarUint8Array(encryptedDataEncoder, new Uint8Array(cipher))
    return encoding.toUint8Array(encryptedDataEncoder)
  })
}

/**
 * @experimental The API is not final!
 *
 * Decrypt some data using AES-GCM method.
 *
 * @param {CryptoKey} key
 * @param {Uint8Array} data
 * @return {PromiseLike<Uint8Array>} decrypted buffer
 */
export const decrypt = (key, data) => {
  const dataDecoder = decoding.createDecoder(data)
  const iv = decoding.readUint8Array(dataDecoder, 16)
  const cipher = decoding.readVarUint8Array(dataDecoder)
  return webcrypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    cipher
  ).then(data => new Uint8Array(data))
}

/**
 * @param {CryptoKey} key
 */
export const exportKey = key =>
  webcrypto.subtle.exportKey('jwk', key)

/**
 * @param {any} jwk
 * @param {Usages} [usages]
 * @param {boolean} [extractable]
 */
export const importKey = (jwk, usages, extractable = false) => {
  if (usages == null) {
    /* c8 ignore next */
    usages = jwk.key_ops || defaultUsages
  }
  return webcrypto.subtle.importKey('jwk', jwk, 'AES-GCM', extractable, /** @type {Usages} */ (usages))
}

/**
 * @param {Uint8Array | string} data
 */
/* c8 ignore next */
const toBinary = data => typeof data === 'string' ? string.encodeUtf8(data) : data

/**
 * @experimental The API is not final!
 *
 * Derive an symmetric key using the Password-Based-Key-Derivation-Function-2.
 *
 * @param {Uint8Array|string} secret
 * @param {Uint8Array|string} salt
 * @param {Object} opts
 * @param {boolean} [opts.extractable]
 * @param {Usages} [opts.usages]
 */
export const deriveKey = (secret, salt, { extractable = false, usages = defaultUsages } = {}) => {
  return webcrypto.subtle.importKey(
    'raw',
    toBinary(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  ).then(keyMaterial =>
    webcrypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: toBinary(salt), // NIST recommends at least 64 bits
        iterations: 600000, // OWASP recommends 600k iterations
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256
      },
      extractable,
      usages
    )
  )
}
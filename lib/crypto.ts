const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTE_LENGTH = 16;
const IV_BYTE_LENGTH = 12;
const KEY_BIT_LENGTH = 256;

function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error("WebCrypto API is not available in this environment.");
}

export function generateSalt(): Uint8Array {
  const salt = new Uint8Array(SALT_BYTE_LENGTH);
  globalThis.crypto.getRandomValues(salt);
  return salt;
}

export function generateIv(): Uint8Array {
  const iv = new Uint8Array(IV_BYTE_LENGTH);
  globalThis.crypto.getRandomValues(iv);
  return iv;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  return globalThis.btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const cleaned = base64.trim();
  const binary = globalThis.atob(cleaned);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  if (!passphrase || passphrase.length === 0) {
    throw new Error("Vault passphrase must not be empty.");
  }
  if (salt.byteLength !== SALT_BYTE_LENGTH) {
    throw new Error(`Salt must be exactly ${SALT_BYTE_LENGTH} bytes.`);
  }

  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);

  const baseKey = await subtle.importKey(
    "raw",
    passphraseBytes as unknown as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: KEY_BIT_LENGTH,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface EncryptedPayload {
  ciphertext: string;
  salt: string;
  iv: string;
}

export async function encryptText(
  plaintext: string,
  passphrase: string
): Promise<EncryptedPayload> {
  const subtle = getSubtleCrypto();
  const salt = generateSalt();
  const iv = generateIv();
  const key = await deriveKey(passphrase, salt);

  const encoder = new TextEncoder();
  const encodedPlaintext = encoder.encode(plaintext);

  const encryptedBuffer = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as unknown as BufferSource,
    },
    key,
    encodedPlaintext as unknown as BufferSource
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
  };
}

export async function decryptText(
  payload: EncryptedPayload,
  passphrase: string
): Promise<string> {
  const subtle = getSubtleCrypto();
  const ciphertextBytes = base64ToBytes(payload.ciphertext);
  const saltBytes = base64ToBytes(payload.salt);
  const ivBytes = base64ToBytes(payload.iv);

  if (ivBytes.byteLength !== IV_BYTE_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_BYTE_LENGTH} bytes.`);
  }

  const key = await deriveKey(passphrase, saltBytes);

  try {
    const decryptedBuffer = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBytes as unknown as BufferSource,
      },
      key,
      ciphertextBytes as unknown as BufferSource
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch {
    throw new Error(
      "Decryption failed. Incorrect vault passphrase or corrupted ciphertext."
    );
  }
}

export async function encryptBytes(
  data: Uint8Array,
  passphrase: string
): Promise<Uint8Array> {
  const subtle = getSubtleCrypto();
  const salt = generateSalt();
  const iv = generateIv();
  const key = await deriveKey(passphrase, salt);

  const encryptedBuffer = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as unknown as BufferSource,
    },
    key,
    data as unknown as BufferSource
  );

  const ciphertextBytes = new Uint8Array(encryptedBuffer);
  const packed = new Uint8Array(
    SALT_BYTE_LENGTH + IV_BYTE_LENGTH + ciphertextBytes.byteLength
  );
  packed.set(salt, 0);
  packed.set(iv, SALT_BYTE_LENGTH);
  packed.set(ciphertextBytes, SALT_BYTE_LENGTH + IV_BYTE_LENGTH);

  return packed;
}

export async function decryptBytes(
  packedData: Uint8Array,
  passphrase: string
): Promise<Uint8Array> {
  if (packedData.byteLength <= SALT_BYTE_LENGTH + IV_BYTE_LENGTH) {
    throw new Error("Encrypted binary payload is too short to be valid.");
  }

  const subtle = getSubtleCrypto();
  const salt = packedData.slice(0, SALT_BYTE_LENGTH);
  const iv = packedData.slice(
    SALT_BYTE_LENGTH,
    SALT_BYTE_LENGTH + IV_BYTE_LENGTH
  );
  const ciphertext = packedData.slice(SALT_BYTE_LENGTH + IV_BYTE_LENGTH);

  const key = await deriveKey(passphrase, salt);

  try {
    const decryptedBuffer = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as unknown as BufferSource,
      },
      key,
      ciphertext as unknown as BufferSource
    );

    return new Uint8Array(decryptedBuffer);
  } catch {
    throw new Error(
      "Binary decryption failed. Incorrect passphrase or corrupted file."
    );
  }
}

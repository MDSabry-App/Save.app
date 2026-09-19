/**
 * Client-Side End-to-End Encryption (E2EE) using Web Crypto API
 * Data is encrypted BEFORE leaving the browser and decrypted ONLY after receiving.
 * The server NEVER sees plaintext keys or credentials.
 */

// Derive a 256-bit AES key from password + salt using PBKDF2
export async function deriveKey(password: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt data string -> returns { iv, data }
export async function encryptData(plainText: string, key: CryptoKey): Promise<{ iv: string; data: string }> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );

  const ivBase64 = btoa(String.fromCharCode(...iv));
  const dataBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));

  return { iv: ivBase64, data: dataBase64 };
}

// Decrypt data -> returns plaintext string
export async function decryptData(encryptedData: string, ivBase64: string, key: CryptoKey): Promise<string> {
  const dec = new TextDecoder();
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return dec.decode(decrypted);
}

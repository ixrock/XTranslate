// Encode string-text to sha-256

export async function sha256Hex(str: string): Promise<string> {
  const data = new TextEncoder().encode(str); // String to Uint8Array (UTF-8)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data); // ⬅️ Promise<ArrayBuffer>
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // ArrayBuffer → hex-строку
  
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hex;
}

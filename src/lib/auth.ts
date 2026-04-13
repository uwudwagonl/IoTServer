export const ADMIN_USER = "uwudwagonl";
export const ADMIN_PASS_SHA256 =
  "4a80b624f77f57c8396646e7175821f42939ecca57ffcd7ce92f412b7ccb7e73";

export const AUTH_STORAGE_KEY = "iot-admin-auth";

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyCredentials(
  user: string,
  pass: string
): Promise<boolean> {
  if (user !== ADMIN_USER) return false;
  const hash = await sha256Hex(pass);
  return timingSafeEqual(hash, ADMIN_PASS_SHA256);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const required = (name: string) => { const value = process.env[name]; if (!value) throw new Error(`Missing ${name}`); return value; };
export const db = () => createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
export const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
export const random = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");

// Ciphertext format: version.iv.authTag.ciphertext. The key is only a server environment variable.
export function seal(plain: string) {
  const key = Buffer.from(required("TOKEN_ENCRYPTION_KEY"), "base64"); if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv("aes-256-gcm", key, iv); const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}
export function unseal(value: string) {
  const [version, ivText, tagText, encryptedText] = value.split("."); if (version !== "v1" || !ivText || !tagText || !encryptedText) throw new Error("Invalid encrypted token");
  const key = Buffer.from(required("TOKEN_ENCRYPTION_KEY"), "base64"); const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url")); return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
}
export const hmac = (value: string) => crypto.createHmac("sha256", required("SESSION_SIGNING_KEY")).update(value).digest("base64url");
export function signed(value: object) { const body = Buffer.from(JSON.stringify(value)).toString("base64url"); return `${body}.${hmac(body)}`; }
export function verify<T>(value?: string): T | null { if (!value) return null; const [body, signature] = value.split("."); const expected = body ? hmac(body) : ""; if (!body || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null; try { return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T; } catch { return null; } }

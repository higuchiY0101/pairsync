import { cookies } from "next/headers";
import { db, hash, random } from "./server";

export type Member = { id: string; pair_id: string; refresh_token_ciphertext: string | null; calendar_connected_at: string | null };
const COOKIE = "pairsync_member";
export async function currentMember(): Promise<Member | null> {
  const token = (await cookies()).get(COOKIE)?.value; if (!token) return null;
  const { data } = await db().from("members").select("id,pair_id,refresh_token_ciphertext,calendar_connected_at").eq("session_hash", hash(token)).maybeSingle();
  return data as Member | null;
}
export async function setMemberCookie(memberId: string) {
  const token = random(); await db().from("members").update({ session_hash: hash(token) }).eq("id", memberId);
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { currentMember } from "../../../../lib/member";
import { random, signed } from "../../../../lib/server";

export async function GET() {
  const member = await currentMember(); if (!member) return NextResponse.redirect(new URL("/?error=session", process.env.APP_URL));
  const nonce = random(); const state = signed({ memberId: member.id, nonce, exp: Date.now() + 10 * 60_000 });
  (await cookies()).set("pairsync_oauth", signed({ state, nonce, exp: Date.now() + 10 * 60_000 }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/google", maxAge: 600 });
  const client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
  return NextResponse.redirect(client.generateAuthUrl({ access_type: "offline", prompt: "consent", include_granted_scopes: true, scope: ["https://www.googleapis.com/auth/calendar.freebusy"], state }));
}

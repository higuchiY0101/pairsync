import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { seal, verify, db } from "../../../../lib/server";

type OAuthCookie = { state: string; nonce: string; exp: number };
type State = { memberId: string; nonce: string; exp: number };
export async function GET(request: NextRequest) {
  const url = new URL(request.url); const code = url.searchParams.get("code"); const state = url.searchParams.get("state");
  const cookie = verify<OAuthCookie>((await cookies()).get("pairsync_oauth")?.value); const stateData = verify<State>(state ?? undefined);
  (await cookies()).delete("pairsync_oauth");
  if (!code || !cookie || !stateData || cookie.state !== state || cookie.nonce !== stateData.nonce || stateData.exp < Date.now()) return NextResponse.redirect(new URL("/?error=oauth", process.env.APP_URL));
  const client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
  try {
    const { tokens } = await client.getToken(code); if (!tokens.refresh_token) throw new Error("No refresh token returned");
    await db().from("members").update({ refresh_token_ciphertext: seal(tokens.refresh_token), calendar_connected_at: new Date().toISOString() }).eq("id", stateData.memberId);
    return NextResponse.redirect(new URL("/?connected=1", process.env.APP_URL));
  } catch { return NextResponse.redirect(new URL("/?error=calendar", process.env.APP_URL)); }
}

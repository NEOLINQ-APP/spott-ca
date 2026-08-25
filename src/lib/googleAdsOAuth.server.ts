// Google Ads OAuth2 for a claimed Spott.ca business owner connecting their
// own Google Ads account. Deliberately its own client (GOOGLE_ADS_CLIENT_ID
// /SECRET), separate from the unrelated Google OAuth client used for
// Supabase Auth sign-in on this same site.
//
// The callback is a plain browser redirect from Google -- it carries no
// custom headers, so requireSupabaseAuth's Bearer-token middleware can't
// run there. Instead, the *start* step (which does run behind real auth,
// via a createServerFn) signs the caller's business_id into `state` with
// an HMAC; the callback verifies that signature instead of re-deriving
// "who's logged in" from a session it structurally can't see.
import { createHmac, timingSafeEqual } from "node:crypto";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ADWORDS_SCOPE = "https://www.googleapis.com/auth/adwords";

function getCredentials() {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET is not set");
  }
  return { clientId, clientSecret };
}

function getStateSecret() {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET is not set (reused here as the state-signing key)");
  return secret;
}

export function signBusinessState(businessId: string): string {
  const nonce = Date.now().toString(36);
  const payload = `${businessId}.${nonce}`;
  const sig = createHmac("sha256", getStateSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyBusinessState(state: string): string | null {
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [businessId, nonce, sig] = parts;
  const expected = createHmac("sha256", getStateSecret()).update(`${businessId}.${nonce}`).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return businessId;
}

export function getAdsRedirectUri(origin: string) {
  return `${origin}/api/public/google-ads/oauth/callback`;
}

export function buildGoogleAdsAuthUrl(origin: string, businessId: string) {
  const { clientId } = getCredentials();
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getAdsRedirectUri(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", ADWORDS_SCOPE);
  url.searchParams.set("state", signBusinessState(businessId));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

export async function exchangeAdsCodeForTokens(code: string, origin: string) {
  const { clientId, clientSecret } = getCredentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getAdsRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Ads token exchange failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>;
}

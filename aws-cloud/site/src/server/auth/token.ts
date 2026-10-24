// The signed session token ({ sub, sid, exp }), kept apart from the database so the Routing
// Middleware can check it without bundling the Postgres driver.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "cl_session";
export const SESSION_DAYS = 30;

export interface SessionClaims {
  sub: string;
  sid: string;
}

function key(secret: string | undefined): Uint8Array {
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(secret);
}

export async function signToken(secret: string | undefined, payload: Record<string, unknown>, subject: string, expiresIn: string): Promise<string> {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setSubject(subject).setIssuedAt().setExpirationTime(expiresIn).sign(key(secret));
}

/** The payload of a valid, unexpired token, or null. */
export async function verifyToken(secret: string | undefined, token: string | undefined): Promise<Record<string, unknown> | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function verifySessionToken(secret: string | undefined, token: string | undefined): Promise<SessionClaims | null> {
  const p = await verifyToken(secret, token);
  return p && typeof p.sub === "string" && typeof p.sid === "string" ? { sub: p.sub, sid: p.sid } : null;
}

/** Reads one cookie from a Cookie header without decoding the others. */
export function readCookie(header: string | null, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const at = part.indexOf("=");
    if (at > 0 && part.slice(0, at).trim() === name) {
      try {
        return decodeURIComponent(part.slice(at + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

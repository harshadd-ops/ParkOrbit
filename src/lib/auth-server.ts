import { NextRequest } from "next/server";
import { getUserById, readDb } from "./db";
import { User } from "./types";

export const AUTH_COOKIE_NAME = "parkorbit_user_id";

export function resolveRequestUser(req: NextRequest): User | null {
  const headerUserId = req.headers.get("x-parkorbit-user-id");
  const cookieUserId = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const rawId = headerUserId || cookieUserId;

  if (rawId === "guest") {
    return null;
  }

  if (rawId) {
    const found = getUserById(rawId);
    if (found) return found;
  }

  // Default to the primary demo user (Aarav Mehta) for zero-friction first-run exploration
  const db = readDb();
  return db.users[0] || null;
}

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateUser,
  getUserById,
  readDb,
  registerUser,
  updateUserProfile,
} from "@/lib/db";
import { AUTH_COOKIE_NAME, resolveRequestUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const db = readDb();
  const currentUser = resolveRequestUser(req);

  return NextResponse.json({
    currentUser,
    demoUsers: db.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
      isDemo: u.isDemo,
    })),
    config: db.config,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "logout") {
      const res = NextResponse.json({ currentUser: null });
      res.cookies.set(AUTH_COOKIE_NAME, "guest", {
        path: "/",
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    if (action === "switch") {
      const user = getUserById(body.userId);
      if (!user) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      const res = NextResponse.json({ currentUser: user });
      res.cookies.set(AUTH_COOKIE_NAME, user.id, {
        path: "/",
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    if (action === "login") {
      const user = authenticateUser(body.email, body.password);
      const res = NextResponse.json({ currentUser: user });
      res.cookies.set(AUTH_COOKIE_NAME, user.id, {
        path: "/",
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    if (action === "register") {
      const user = registerUser({
        name: body.name,
        email: body.email,
        phone: body.phone,
        password: body.password,
        upiId: body.upiId,
        bio: body.bio,
      });
      const res = NextResponse.json({ currentUser: user }, { status: 201 });
      res.cookies.set(AUTH_COOKIE_NAME, user.id, {
        path: "/",
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    if (action === "update_profile") {
      const actor = resolveRequestUser(req);
      if (!actor) {
        return NextResponse.json(
          { error: "Authentication required." },
          { status: 401 }
        );
      }
      const targetId = body.userId || actor.id;
      const updated = updateUserProfile(actor.id, targetId, {
        name: body.name,
        phone: body.phone,
        bio: body.bio,
        upiId: body.upiId,
        defaultVehicleType: body.defaultVehicleType,
        defaultVehiclePlate: body.defaultVehiclePlate,
      });
      return NextResponse.json({ currentUser: updated });
    }

    return NextResponse.json({ error: "Unsupported auth action." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication error.";
    const status = message.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { getAuthorizationUrl } from "@/lib/quickbooks";

// Starts the QuickBooks OAuth2 authorization-code flow. Admin-only, kicked
// off from a button on /admin/reconcile. The state value round-trips through
// Intuit and back to /api/quickbooks/callback as a CSRF check.
export async function GET() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(getAuthorizationUrl(state));
  response.cookies.set("qbo_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}

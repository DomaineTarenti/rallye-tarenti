import { NextRequest, NextResponse } from "next/server";

// POST /api/admin/auth — connexion admin (définit le cookie)
export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 503 });
  }

  if (!password || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin-auth", password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 jours
    path: "/",
  });
  return res;
}

// DELETE /api/admin/auth — déconnexion (efface le cookie)
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin-auth", "", { maxAge: 0, path: "/" });
  return res;
}

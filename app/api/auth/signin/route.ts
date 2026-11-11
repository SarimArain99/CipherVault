import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

interface SigninRequestBody {
  email?: unknown;
  password?: unknown;
}

interface UserAuthRow {
  id: string;
  email: string;
  password_hash: string;
}

export async function POST(request: Request) {
  try {
    let body: SigninRequestBody;
    try {
      body = (await request.json()) as SigninRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Both email and login password are required." },
        { status: 400 }
      );
    }

    const result = await query<UserAuthRow>(
      "SELECT id, email, password_hash FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or login password." },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or login password." },
        { status: 401 }
      );
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Signin error:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred while signing in." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";

interface SignupRequestBody {
  email?: unknown;
  password?: unknown;
}

interface UserRow {
  id: string;
  email: string;
  created_at: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    let body: SignupRequestBody;
    try {
      body = (await request.json()) as SignupRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Login password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: "Login password must not exceed 128 characters." },
        { status: 400 }
      );
    }

    const existingUser = await query<{ id: string }>(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [rawEmail]
    );

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const insertResult = await query<UserRow>(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [rawEmail, passwordHash]
    );

    const newUser = insertResult.rows[0];
    if (!newUser) {
      return NextResponse.json(
        { error: "Could not create user account. Please try again." },
        { status: 500 }
      );
    }

    await setSessionCookie({
      userId: newUser.id,
      email: newUser.email,
    });

    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          email: newUser.email,
          createdAt: newUser.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred while creating your account." },
      { status: 500 }
    );
  }
}

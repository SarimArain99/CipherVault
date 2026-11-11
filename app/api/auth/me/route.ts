import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

interface UserProfileRow {
  id: string;
  email: string;
  created_at: string;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const result = await query<UserProfileRow>(
      "SELECT id, email, created_at FROM users WHERE id = $1 LIMIT 1",
      [session.userId]
    );

    const user = result.rows[0];
    if (!user) {
      return NextResponse.json(
        { error: "Account no longer exists." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json(
      { error: "Unable to verify session status." },
      { status: 500 }
    );
  }
}

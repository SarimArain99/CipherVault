import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

interface CreateShareRequestBody {
  title?: unknown;
  ciphertext?: unknown;
  salt?: unknown;
  iv?: unknown;
  expiresInHours?: unknown;
  maxViews?: unknown;
}

interface ShareInsertRow {
  id: string;
}

const ALLOWED_EXPIRY_HOURS = new Set([1, 24, 168]);
const ALLOWED_MAX_VIEWS = new Set([1, 5, 10]);

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required to create a share link." },
        { status: 401 }
      );
    }

    let body: CreateShareRequestBody;
    try {
      body = (await request.json()) as CreateShareRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const ciphertext =
      typeof body.ciphertext === "string" ? body.ciphertext.trim() : "";
    const salt = typeof body.salt === "string" ? body.salt.trim() : "";
    const iv = typeof body.iv === "string" ? body.iv.trim() : "";
    const expiresInHours = Number(body.expiresInHours);
    const maxViews = Number(body.maxViews);

    if (!title || !ciphertext || !salt || !iv) {
      return NextResponse.json(
        {
          error:
            "Title, ciphertext, salt, and initialization vector (iv) are required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(expiresInHours) ||
      !ALLOWED_EXPIRY_HOURS.has(expiresInHours)
    ) {
      return NextResponse.json(
        {
          error:
            "Expiration window must be 1 hour, 24 hours, or 168 hours (7 days).",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(maxViews) || !ALLOWED_MAX_VIEWS.has(maxViews)) {
      return NextResponse.json(
        { error: "Maximum views must be 1, 5, or 10." },
        { status: 400 }
      );
    }

    const expiresAt = new Date(
      Date.now() + expiresInHours * 60 * 60 * 1000
    ).toISOString();

    const insertResult = await query<ShareInsertRow>(
      `INSERT INTO share_links (user_id, title, ciphertext, salt, iv, expires_at, max_views, views)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
       RETURNING id`,
      [session.userId, title, ciphertext, salt, iv, expiresAt, maxViews]
    );

    const created = insertResult.rows[0];
    if (!created) {
      return NextResponse.json(
        { error: "Could not create encrypted share link." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: created.id,
        url: `/share/${created.id}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create share link:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the share link." },
      { status: 500 }
    );
  }
}

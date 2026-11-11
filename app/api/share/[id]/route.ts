import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface ShareLinkRow {
  id: string;
  title: string;
  ciphertext: string;
  salt: string;
  iv: string;
  expires_at: string;
  views: number;
  max_views: number;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "This link has expired or been used up." },
        { status: 410 }
      );
    }

    // Atomic check-and-increment so concurrent requests cannot exceed max_views
    const updateResult = await query<ShareLinkRow>(
      `UPDATE share_links
       SET views = views + 1
       WHERE id = $1
         AND expires_at > NOW()
         AND views < max_views
       RETURNING id, title, ciphertext, salt, iv, expires_at, views, max_views`,
      [id]
    );

    const link = updateResult.rows[0];
    if (!link) {
      return NextResponse.json(
        { error: "This link has expired or been used up." },
        { status: 410 }
      );
    }

    return NextResponse.json(
      {
        title: link.title,
        ciphertext: link.ciphertext,
        salt: link.salt,
        iv: link.iv,
        expires_at: link.expires_at,
        views: link.views,
        max_views: link.max_views,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to retrieve share link:", error);
    return NextResponse.json(
      { error: "Unable to load shared secret from server." },
      { status: 500 }
    );
  }
}

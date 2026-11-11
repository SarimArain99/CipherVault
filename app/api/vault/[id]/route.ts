import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

interface VaultItemRow {
  id: string;
  title: string;
  ciphertext: string;
  salt: string;
  iv: string;
  created_at: string;
  updated_at: string;
}

interface UpdateVaultItemBody {
  title?: unknown;
  ciphertext?: unknown;
  salt?: unknown;
  iv?: unknown;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid vault item identifier." },
        { status: 400 }
      );
    }

    let body: UpdateVaultItemBody;
    try {
      body = (await request.json()) as UpdateVaultItemBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const existingResult = await query<VaultItemRow>(
      `SELECT id, title, ciphertext, salt, iv, created_at, updated_at
       FROM vault_items
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [id, session.userId]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      return NextResponse.json(
        { error: "Vault item not found or access denied." },
        { status: 404 }
      );
    }

    const nextTitle =
      typeof body.title === "string" && body.title.trim().length > 0
        ? body.title.trim()
        : existing.title;
    const nextCiphertext =
      typeof body.ciphertext === "string" && body.ciphertext.trim().length > 0
        ? body.ciphertext.trim()
        : existing.ciphertext;
    const nextSalt =
      typeof body.salt === "string" && body.salt.trim().length > 0
        ? body.salt.trim()
        : existing.salt;
    const nextIv =
      typeof body.iv === "string" && body.iv.trim().length > 0
        ? body.iv.trim()
        : existing.iv;

    if (nextTitle.length > 200) {
      return NextResponse.json(
        { error: "Item title cannot exceed 200 characters." },
        { status: 400 }
      );
    }

    const updateResult = await query<VaultItemRow>(
      `UPDATE vault_items
       SET title = $1,
           ciphertext = $2,
           salt = $3,
           iv = $4,
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING id, title, ciphertext, salt, iv, created_at, updated_at`,
      [nextTitle, nextCiphertext, nextSalt, nextIv, id, session.userId]
    );

    const updated = updateResult.rows[0];
    if (!updated) {
      return NextResponse.json(
        { error: "Could not update vault item." },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: updated }, { status: 200 });
  } catch (error) {
    console.error("Failed to update vault item:", error);
    return NextResponse.json(
      { error: "An error occurred while updating the vault item." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid vault item identifier." },
        { status: 400 }
      );
    }

    const deleteResult = await query<{ id: string }>(
      `DELETE FROM vault_items
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, session.userId]
    );

    if (!deleteResult.rowCount || deleteResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Vault item not found or already deleted." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { deletedId: id, message: "Vault item permanently deleted." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete vault item:", error);
    return NextResponse.json(
      { error: "An error occurred while deleting the vault item." },
      { status: 500 }
    );
  }
}

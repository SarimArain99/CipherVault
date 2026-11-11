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

interface CreateVaultItemBody {
  title?: unknown;
  ciphertext?: unknown;
  salt?: unknown;
  iv?: unknown;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    const result = await query<VaultItemRow>(
      `SELECT id, title, ciphertext, salt, iv, created_at, updated_at
       FROM vault_items
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [session.userId]
    );

    return NextResponse.json({ items: result.rows }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch vault items:", error);
    return NextResponse.json(
      { error: "Failed to load encrypted vault items from the database." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    let body: CreateVaultItemBody;
    try {
      body = (await request.json()) as CreateVaultItemBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const ciphertext = typeof body.ciphertext === "string" ? body.ciphertext.trim() : "";
    const salt = typeof body.salt === "string" ? body.salt.trim() : "";
    const iv = typeof body.iv === "string" ? body.iv.trim() : "";

    if (!title || !ciphertext || !salt || !iv) {
      return NextResponse.json(
        {
          error:
            "Title, ciphertext, salt, and initialization vector (iv) are all required non-empty strings.",
        },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: "Item title cannot exceed 200 characters." },
        { status: 400 }
      );
    }

    const result = await query<VaultItemRow>(
      `INSERT INTO vault_items (user_id, title, ciphertext, salt, iv)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, ciphertext, salt, iv, created_at, updated_at`,
      [session.userId, title, ciphertext, salt, iv]
    );

    const createdItem = result.rows[0];
    if (!createdItem) {
      return NextResponse.json(
        { error: "Could not store encrypted vault item." },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: createdItem }, { status: 201 });
  } catch (error) {
    console.error("Failed to create vault item:", error);
    return NextResponse.json(
      { error: "An error occurred while saving your encrypted vault item." },
      { status: 500 }
    );
  }
}

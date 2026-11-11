# CipherVault — Zero-Knowledge Encrypted Vault

A zero-knowledge encrypted vault. Your secrets are encrypted in the browser before they ever reach the server — the server only ever sees ciphertext, and it can never read your data.

Built with **Next.js 16, React 19, TypeScript, Tailwind CSS 4, Neon Postgres**, and the browser's native **WebCrypto API**. Deployed on **Vercel**.

## What it does

- **Encrypted vault** — store API keys, recovery phrases, passwords and notes. Create, decrypt, edit, search and delete items.
- **File encryption** — encrypt any file in the browser and download it as a portable `.vault` file; decrypt it back later with the same passphrase. Files are never uploaded.
- **Password generator** — cryptographically random passwords with length and character-set controls and a live entropy estimate.
- **Expiring share links** — share one secret through an encrypted link with a 1-hour, 24-hour or 7-day expiry and a 1, 5 or 10 view limit. The link self-destructs when the limit is reached.
- **Accounts** — sign up and sign in with email and password. Your login password only authenticates you; it never encrypts anything.

## How the crypto works

The login password and the vault passphrase are two different secrets:

1. **Login** — your account password is hashed server-side with bcrypt and used only to issue an HTTP-only session cookie.
2. **Vault passphrase** — kept only in React memory while the vault is unlocked. It is never stored in localStorage, cookies, or the database, and never sent to the server.
3. **Key derivation** — the passphrase is combined with a fresh 16-byte random salt per item and run through **PBKDF2-SHA256 (600,000 iterations)** to derive a 256-bit key.
4. **Encryption** — plaintext is encrypted with **AES-256-GCM** using a fresh 12-byte IV per item. Only the ciphertext, salt, and IV are stored in Postgres.

The database record for an item looks like this — nothing in it can be read without the passphrase:

```json
{
  "title": "Production Root Key",
  "ciphertext": "8f9d2a...b41e==",
  "salt": "4c81e09a2b3f1180...",
  "iv": "9a01bc44d28f1011..."
}
```

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS 4 |
| Crypto | WebCrypto API — AES-256-GCM, PBKDF2-SHA256 |
| Auth | bcrypt password hashing, JWT session in an HTTP-only cookie |
| Database | Neon Postgres (`pg`) |
| Hosting | Vercel |

## Run it locally

```bash
git clone https://github.com/SarimArain99/CipherVault.git
cd CipherVault
npm install
cp .env.example .env.local
```

Set the two variables in `.env.local`:

```
DATABASE_URL="postgresql://user:password@your-neon-host/neondb?sslmode=require"
JWT_SECRET="a-random-secret-at-least-32-characters-long"
```

Create the tables, then start the app:

```bash
psql "$DATABASE_URL" -f db/schema.sql
npm run dev
```

Open http://localhost:3000, create an account, unlock the vault with a passphrase, and add your first secret.

## Project structure

```
app/
  page.tsx            Landing page
  signin/             Sign-in page
  signup/             Sign-up page
  vault/              Vault (unlock, add, decrypt, edit, share, delete)
  tools/              File encryption/decryption + password generator
  share/[id]/         Public share-link page
  api/
    auth/             signup, signin, signout, me
    vault/            vault item CRUD (ciphertext only)
    share/            share-link create + fetch (atomic view counting)
lib/
  crypto.ts           WebCrypto: PBKDF2 key derivation, AES-256-GCM text + bytes
  db.ts               Postgres pool
  auth.ts             bcrypt + JWT session cookies
db/
  schema.sql          users, vault_items, share_links
```

## Security notes

- If you forget your vault passphrase, your data cannot be recovered — by design. There is no reset, no backdoor, and the server cannot help.
- Share links count a view when the ciphertext is fetched, so a 1-view link is used up by opening it once. Tell the recipient the passphrase separately from the link.
- This is a portfolio project demonstrating applied cryptography, not an audited security product. Review the code in `lib/crypto.ts` before trusting it with real secrets.

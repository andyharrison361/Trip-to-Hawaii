// Central place to read configuration, with clear errors when something is missing.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local (or add it in Vercel → Settings → Environment Variables).`,
    );
  }
  return value;
}

// NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them in the browser bundle.
export function supabaseUrl() {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabasePublishableKey() {
  return required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

/** Server-only secret key (bypasses row-level security). Never expose to the browser. */
export function supabaseSecretKey() {
  return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
}

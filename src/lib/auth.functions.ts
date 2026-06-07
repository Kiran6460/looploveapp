import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Synthetic-email domain used to back phone-only accounts in Supabase Auth.
const PHONE_EMAIL_DOMAIN = "phone.looplove.app";

function phoneToSyntheticEmail(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `p${digits}@${PHONE_EMAIL_DOMAIN}`;
}

const phoneSignupSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid mobile number")
    .max(20, "Mobile number too long")
    .regex(/^\+?[0-9 ()-]+$/, "Mobile number contains invalid characters"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  name: z.string().trim().max(80).optional(),
});

export const signupWithPhone = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => phoneSignupSchema.parse(input))
  .handler(async ({ data }) => {
    const normalized = data.phone.replace(/\D/g, "");
    if (normalized.length < 7) {
      throw new Error("Enter a valid mobile number");
    }

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", normalized)
      .maybeSingle();
    if (lookupError) throw new Error("Couldn't verify mobile number");
    if (existing) {
      throw new Error("An account with this mobile number already exists");
    }

    const email = phoneToSyntheticEmail(normalized);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        name: data.name || `Loop ${normalized.slice(-4)}`,
        phone: normalized,
        signup_method: "phone",
      },
    });
    if (error || !created.user) {
      const msg = error?.message ?? "Couldn't create account";
      if (msg.toLowerCase().includes("already")) {
        throw new Error("An account with this mobile number already exists");
      }
      throw new Error(msg);
    }

    await supabaseAdmin
      .from("profiles")
      .update({ phone: normalized, terms_accepted_at: new Date().toISOString() })
      .eq("id", created.user.id);

    return { ok: true, email };
  });

const phoneLoginSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^\+?[0-9 ()-]+$/),
  password: z.string().min(1).max(200),
});

// Server-side phone login: resolves phone -> synthetic email server-side and
// performs the password sign-in, returning session tokens. Avoids leaking
// whether a phone number is registered (returns the same generic error for
// "no account" and "wrong password").
export const loginWithPhone = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => phoneLoginSchema.parse(input))
  .handler(async ({ data }) => {
    const normalized = data.phone.replace(/\D/g, "");
    const email = phoneToSyntheticEmail(normalized);

    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: result, error } = await client.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (error || !result.session) {
      // Generic message — do not reveal whether the phone number exists.
      throw new Error("Invalid mobile number or password");
    }
    return {
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    };
  });

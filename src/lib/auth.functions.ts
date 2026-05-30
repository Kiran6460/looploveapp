import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Synthetic-email domain used to back phone-only accounts in Supabase Auth.
// Real phone number is normalized to E.164-style digits.
const PHONE_EMAIL_DOMAIN = "phone.looplove.app";

export function phoneToSyntheticEmail(phone: string): string {
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

    // Duplicate check (profiles.phone is unique, but check first for a clean error).
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

    // Ensure profile carries the phone + terms acceptance (trigger inserts the row).
    await supabaseAdmin
      .from("profiles")
      .update({ phone: normalized, terms_accepted_at: new Date().toISOString() })
      .eq("id", created.user.id);

    return { ok: true, email };
  });

const phoneLookupSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^\+?[0-9 ()-]+$/),
});

export const resolvePhoneLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => phoneLookupSchema.parse(input))
  .handler(async ({ data }) => {
    const normalized = data.phone.replace(/\D/g, "");
    const { data: row } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", normalized)
      .maybeSingle();
    if (!row) return { email: null as string | null };
    return { email: phoneToSyntheticEmail(normalized) };
  });

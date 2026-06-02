import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const submitSchema = z.object({
  photoPath: z.string().min(3).max(300).regex(/^[a-zA-Z0-9/_.-]+$/),
  livenessScore: z.number().min(0).max(1),
});

export const submitVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Path must live under the user's folder in the verification bucket.
    if (!data.photoPath.startsWith(`${userId}/`)) {
      throw new Error("Invalid selfie path");
    }
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        verification_status: "pending",
        verification_selfie_url: data.photoPath,
        verification_submitted_at: new Date().toISOString(),
        liveness_score: data.livenessScore,
        verification_rejection_reason: null,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyVerification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "verification_status, verification_selfie_url, verification_submitted_at, verification_reviewed_at, verification_rejection_reason, liveness_score",
      )
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    let signedUrl: string | null = null;
    if (data?.verification_selfie_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from("verification")
        .createSignedUrl(data.verification_selfie_url, 60 * 30);
      signedUrl = signed?.signedUrl ?? null;
    }
    return { ...data, signedUrl };
  });

export const resetVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        verification_status: "unverified",
        verification_rejection_reason: null,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- Admin -----
async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const adminListPending = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, name, age, city, photo_url, verification_status, verification_selfie_url, verification_submitted_at, liveness_score",
      )
      .in("verification_status", ["pending", "rejected"])
      .order("verification_submitted_at", { ascending: true });
    if (error) throw new Error(error.message);

    const rows = await Promise.all(
      (data ?? []).map(async (p) => {
        let signedUrl: string | null = null;
        if (p.verification_selfie_url) {
          const { data: signed } = await supabaseAdmin.storage
            .from("verification")
            .createSignedUrl(p.verification_selfie_url, 60 * 30);
          signedUrl = signed?.signedUrl ?? null;
        }
        return { ...p, signedUrl };
      }),
    );
    return { rows };
  });

const reviewSchema = z.object({
  profileId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(300).optional(),
});

export const adminReviewVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reviewSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const newStatus = data.action === "approve" ? "verified" : "rejected";
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        verification_status: newStatus,
        verification_reviewed_at: new Date().toISOString(),
        verification_rejection_reason: data.action === "reject" ? (data.reason ?? "Did not meet our verification standards") : null,
      })
      .eq("id", data.profileId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("verification_reviews").insert({
      profile_id: data.profileId,
      reviewer_id: context.userId,
      action: data.action,
      reason: data.reason ?? null,
    });
    return { ok: true };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

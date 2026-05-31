import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const deleteSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

/**
 * Permanently delete the signed-in user's account.
 *
 * Removes:
 *  - profile row
 *  - all swipes (as swiper or swiped)
 *  - all matches the user is part of
 *  - all messages they sent (cascade via match rows below)
 *  - all messages tied to their matches
 *  - all blocks/reports they authored
 *  - their auth user record
 *  - their files in the `avatars` bucket (best-effort)
 *
 * Logs the deletion to `account_deletions` for admin records.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Look up identifying info before we wipe everything (for the deletion log).
    const [{ data: authUser }, { data: profile }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(userId),
      supabaseAdmin
        .from("profiles")
        .select("phone")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    // 1. Find this user's matches so we can clean up their messages too.
    const { data: matches } = await supabaseAdmin
      .from("matches")
      .select("id")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);
    const matchIds = (matches ?? []).map((m) => m.id);

    if (matchIds.length > 0) {
      await supabaseAdmin.from("messages").delete().in("match_id", matchIds);
    }
    await supabaseAdmin
      .from("messages")
      .delete()
      .eq("sender_id", userId);

    // 2. Delete matches involving this user.
    await supabaseAdmin
      .from("matches")
      .delete()
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);

    // 3. Delete swipes (either direction), blocks, reports authored by/about this user.
    await Promise.all([
      supabaseAdmin
        .from("swipes")
        .delete()
        .or(`swiper_id.eq.${userId},swiped_id.eq.${userId}`),
      supabaseAdmin
        .from("blocks")
        .delete()
        .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
      supabaseAdmin
        .from("reports")
        .delete()
        .or(`reporter_id.eq.${userId},reported_id.eq.${userId}`),
    ]);

    // 4. Best-effort storage cleanup — list & remove anything in this user's avatar folder.
    try {
      const { data: files } = await supabaseAdmin.storage
        .from("avatars")
        .list(userId, { limit: 100 });
      if (files && files.length > 0) {
        await supabaseAdmin.storage
          .from("avatars")
          .remove(files.map((f) => `${userId}/${f.name}`));
      }
    } catch {
      // ignore — storage cleanup is non-fatal
    }

    // 5. Profile row.
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // 6. Log the deletion BEFORE removing the auth user (admin records).
    await supabaseAdmin.from("account_deletions").insert({
      user_id: userId,
      email: authUser?.user?.email ?? null,
      phone: profile?.phone ?? null,
      reason: data.reason ?? null,
    });

    // 7. Delete the auth user last.
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) throw new Error(authErr.message);

    return { ok: true };
  });

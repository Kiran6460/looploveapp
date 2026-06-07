import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { moderateText } from "@/lib/moderation";

const onboardingSchema = z.object({
  name: z.string().trim().min(1).max(40),
  age: z.number().int().min(18).max(100),
  city: z.string().trim().max(60).optional().default(""),
  bio: z.string().trim().max(280).default(""),
  interests: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  photo_url: z.string().url().max(1000),
});

export const saveOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => onboardingSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Server-side moderation — clients cannot bypass via direct Supabase API calls.
    const nameCheck = moderateText(data.name, "Name");
    if (!nameCheck.ok) throw new Error(nameCheck.reason);
    const bioCheck = moderateText(data.bio, "Bio");
    if (!bioCheck.ok) throw new Error(bioCheck.reason);
    const cityCheck = moderateText(data.city ?? "", "City");
    if (!cityCheck.ok) throw new Error(cityCheck.reason);

    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        name: data.name,
        age: data.age,
        city: data.city ?? "",
        bio: data.bio,
        interests: data.interests,
        photo_url: data.photo_url,
        onboarded: true,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

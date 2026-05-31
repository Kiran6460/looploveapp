import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { SwipeDeck } from "@/components/SwipeDeck";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loop Love — Find your loop" },
      { name: "description", content: "Loop Love is a modern dating app. Swipe, match, and start the conversation." },
      { property: "og:title", content: "Loop Love — Find your loop" },
      { property: "og:description", content: "Swipe, match, and start the conversation." },
    ],
  }),
  component: Home,
});

function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { void navigate({ to: "/login" }); return; }
    void (async () => {
      const { data } = await supabase.from("profiles").select("onboarded").eq("id", user.id).maybeSingle();
      if (!data?.onboarded) { void navigate({ to: "/onboarding" }); return; }
      setChecking(false);
    })();
  }, [user, loading, navigate]);

  if (loading || !user || checking) {
    return <div className="min-h-[100dvh] flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div
      className="flex flex-col"
      style={{
        // Lock to viewport so the swipe deck + action bar are always visible without scrolling.
        height: "100dvh",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <AppHeader />
      <main className="flex-1 min-h-0 w-full max-w-2xl mx-auto px-4 pt-3 pb-3 flex flex-col">
        <SwipeDeck />
      </main>
    </div>
  );
}

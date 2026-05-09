import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { SwipeDeck } from "@/components/SwipeDeck";

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

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-5 pt-6 pb-32">
        <div className="mb-6">
          <h1 className="font-display text-4xl">Discover</h1>
          <p className="text-muted-foreground mt-1">Swipe right to like, left to pass.</p>
        </div>
        <SwipeDeck />
      </main>
    </div>
  );
}

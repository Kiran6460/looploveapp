import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "Your matches — Loop Love" },
      { name: "description", content: "All the people you matched with on Loop Love." },
    ],
  }),
  component: MatchesPage,
});

type MatchRow = {
  id: string;
  other_id: string;
  other: { name: string; photo_url: string; city: string } | null;
  last?: { content: string; created_at: string } | null;
};

function MatchesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<MatchRow[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    void load();
    const ch = supabase
      .channel("matches-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => void load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user?.id]);

  async function load() {
    if (!user) return;
    setBusy(true);
    const { data: matches } = await supabase
      .from("matches")
      .select("id,user_a,user_b,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!matches) { setItems([]); setBusy(false); return; }
    const rows: MatchRow[] = await Promise.all(
      matches.map(async (m) => {
        const otherId = m.user_a === user.id ? m.user_b : m.user_a;
        const { data: prof } = await supabase
          .from("profiles")
          .select("name,photo_url,city")
          .eq("id", otherId)
          .maybeSingle();
        const { data: last } = await supabase
          .from("messages")
          .select("content,created_at")
          .eq("match_id", m.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return { id: m.id, other_id: otherId, other: prof, last };
      })
    );
    setItems(rows);
    setBusy(false);
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-5 py-8">
        <h1 className="font-display text-4xl mb-1">Your matches</h1>
        <p className="text-muted-foreground mb-6">Say hi — they liked you back.</p>

        {busy ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-card/40 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-border/60 bg-card/40 p-10 text-center">
            <MessageCircle className="w-10 h-10 mx-auto text-primary mb-3" />
            <h3 className="font-display text-xl">No matches yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Keep swiping — your loop is forming.</p>
            <Link to="/" className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-gradient-love text-love-foreground font-medium shadow-love">Discover</Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((m) => (
              <li key={m.id}>
                <Link
                  to="/chat/$matchId"
                  params={{ matchId: m.id }}
                  className="flex items-center gap-4 p-3 rounded-2xl border border-border/40 bg-card/40 hover:bg-card transition-colors"
                >
                  <img
                    src={m.other?.photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"}
                    alt={m.other?.name ?? "Match"}
                    loading="lazy"
                    decoding="async"
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-full object-cover border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium truncate">{m.other?.name ?? "New match"}</span>
                      {m.other?.city && <span className="text-xs text-muted-foreground">{m.other.city}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {m.last?.content ?? "Say hello 👋"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

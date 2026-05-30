import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/chat/$matchId")({
  head: () => ({
    meta: [
      { title: "Chat — Loop Love" },
      { name: "description", content: "Chat with your match." },
    ],
  }),
  component: ChatPage,
});

type Message = { id: string; sender_id: string; content: string; created_at: string };

function ChatPage() {
  const { matchId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<{ name: string; photo_url: string } | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!authLoading && !user) void navigate({ to: "/login" }); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data: m } = await supabase.from("matches").select("user_a,user_b").eq("id", matchId).maybeSingle();
      if (!m) return;
      const otherId = m.user_a === user.id ? m.user_b : m.user_a;
      const { data: p } = await supabase.from("profiles").select("name,photo_url").eq("id", otherId).maybeSingle();
      setOther(p);
      const { data: msgs } = await supabase.from("messages").select("*").eq("match_id", matchId).order("created_at");
      setMessages(msgs ?? []);
    })();

    const ch = supabase
      .channel(`messages-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [matchId, user?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user) return;
    const content = text.trim().slice(0, 2000);
    if (content.length > 2000) { toast.error("Message too long (2000 max)"); return; }
    setSending(true);
    setText("");
    const { error } = await supabase.from("messages").insert({ match_id: matchId, sender_id: user.id, content });
    if (error) toast.error("Couldn't send");
    setSending(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/matches" className="p-2 rounded-xl hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <img
            src={other?.photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"}
            alt={other?.name ?? "Match"}
            className="w-10 h-10 rounded-full object-cover border border-border"
          />
          <div className="font-medium">{other?.name ?? "Match"}</div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-display text-xl text-foreground mb-2">You matched ✨</p>
            <p className="text-sm">Break the ice — ask about their favorite weekend.</p>
          </div>
        )}
        <div className="space-y-2">
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    mine
                      ? "bg-gradient-love text-love-foreground rounded-br-md shadow-love"
                      : "bg-card border border-border/40 rounded-bl-md"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </main>

      <form onSubmit={send} className="sticky bottom-0 backdrop-blur-xl bg-background/70 border-t border-border/40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            placeholder="Type a message…"
            className="flex-1 h-12 px-4 rounded-2xl bg-muted/60 border border-border/40 outline-none focus:border-primary text-sm"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="w-12 h-12 rounded-2xl bg-gradient-love flex items-center justify-center shadow-love disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="w-5 h-5 text-love-foreground" />
          </button>
        </div>
      </form>
    </div>
  );
}

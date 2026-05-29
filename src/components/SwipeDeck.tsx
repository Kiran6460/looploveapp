import { useEffect, useRef, useState } from "react";
import { Heart, X, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { ReportBlockMenu } from "@/components/ReportBlockMenu";

type Card = {
  id: string;
  name: string;
  age: number;
  bio: string;
  photo_url: string;
  city: string;
  interests: string[];
};

export function SwipeDeck() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const start = useRef({ x: 0, y: 0 });

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function load() {
    setLoading(true);
    if (!user) return;
    const [{ data: swiped }, { data: blocked }] = await Promise.all([
      supabase.from("swipes").select("swiped_id").eq("swiper_id", user.id),
      supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
    ]);
    const swipedIds = new Set((swiped ?? []).map((s) => s.swiped_id));
    const blockedIds = new Set((blocked ?? []).map((b) => b.blocked_id));
    const [{ data: demo }, { data: real }] = await Promise.all([
      supabase.from("demo_profiles").select("*"),
      supabase.from("profiles").select("id,name,age,bio,photo_url,city,interests").neq("id", user.id).eq("suspended", false),
    ]);
    const all: Card[] = [...(real ?? []), ...(demo ?? [])]
      .filter((p) => !swipedIds.has(p.id) && !blockedIds.has(p.id) && p.photo_url)
      .sort(() => Math.random() - 0.5);
    setCards(all);
    setLoading(false);
  }

  function removeTop() {
    setCards((c) => c.slice(1));
  }

  async function swipe(liked: boolean) {
    const top = cards[0];
    if (!top || !user) return;
    setCards((c) => c.slice(1));
    const { error } = await supabase.from("swipes").insert({ swiper_id: user.id, swiped_id: top.id, liked });
    if (error) {
      toast.error("Couldn't save swipe");
      return;
    }
    if (liked) {
      // Check for match
      const { data: match } = await supabase
        .from("matches")
        .select("id")
        .or(`and(user_a.eq.${user.id},user_b.eq.${top.id}),and(user_a.eq.${top.id},user_b.eq.${user.id})`)
        .maybeSingle();
      if (match) {
        toast.success(`It's a match with ${top.name}! 💕`, { duration: 4000 });
      }
    }
  }

  function onDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.active) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, active: true });
  }
  function onUp() {
    if (!drag.active) return;
    const threshold = 110;
    if (drag.x > threshold) { setDrag({ x: 600, y: drag.y, active: false }); setTimeout(() => { void swipe(true); setDrag({ x: 0, y: 0, active: false }); }, 200); }
    else if (drag.x < -threshold) { setDrag({ x: -600, y: drag.y, active: false }); setTimeout(() => { void swipe(false); setDrag({ x: 0, y: 0, active: false }); }, 200); }
    else setDrag({ x: 0, y: 0, active: false });
  }

  if (loading) {
    return <div className="h-[560px] rounded-3xl bg-card/50 animate-pulse" />;
  }

  if (cards.length === 0) {
    return (
      <div className="h-[560px] rounded-3xl border border-border/60 bg-card/40 flex flex-col items-center justify-center text-center p-8">
        <Sparkles className="w-12 h-12 text-primary mb-4" />
        <h3 className="font-display text-2xl mb-2">You're all caught up</h3>
        <p className="text-muted-foreground max-w-xs">New people show up here every day. Check back soon — or invite a friend.</p>
      </div>
    );
  }

  const rot = drag.x / 18;

  return (
    <div className="relative h-[560px]">
      {cards.slice(0, 3).reverse().map((card, idxFromBack) => {
        const indexFromFront = Math.min(2, cards.length - 1) - idxFromBack;
        const isTop = indexFromFront === 0;
        const scale = 1 - indexFromFront * 0.04;
        const ty = indexFromFront * 12;
        return (
          <article
            key={card.id}
            onPointerDown={isTop ? onDown : undefined}
            onPointerMove={isTop ? onMove : undefined}
            onPointerUp={isTop ? onUp : undefined}
            onPointerCancel={isTop ? onUp : undefined}
            className="absolute inset-0 rounded-3xl overflow-hidden shadow-card border border-border/40 bg-card touch-none select-none"
            style={{
              transform: isTop
                ? `translate(${drag.x}px, ${drag.y * 0.3}px) rotate(${rot}deg)`
                : `translateY(${ty}px) scale(${scale})`,
              transition: isTop && drag.active ? "none" : "transform 280ms cubic-bezier(.2,.9,.3,1.2)",
              zIndex: 10 - indexFromFront,
              cursor: isTop ? "grab" : "default",
            }}
          >
            <img src={card.photo_url} alt={card.name} className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            {isTop && (
              <div className="absolute top-4 right-4 z-20" onPointerDown={(e) => e.stopPropagation()}>
                <ReportBlockMenu targetId={card.id} targetName={card.name} onBlocked={removeTop} />
              </div>
            )}
            {isTop && drag.x > 40 && (
              <div className="absolute top-8 left-8 rotate-[-12deg] border-4 border-love text-love px-4 py-1 rounded-xl text-2xl font-display font-bold tracking-wider">LIKE</div>
            )}
            {isTop && drag.x < -40 && (
              <div className="absolute top-8 right-8 rotate-[12deg] border-4 border-muted-foreground text-muted-foreground px-4 py-1 rounded-xl text-2xl font-display font-bold tracking-wider">NOPE</div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="flex items-end gap-2">
                <h3 className="font-display text-4xl font-semibold">{card.name}</h3>
                <span className="text-2xl font-light pb-1">{card.age}</span>
              </div>
              {card.city && (
                <div className="flex items-center gap-1 text-sm text-white/80 mt-1">
                  <MapPin className="w-3.5 h-3.5" /> {card.city}
                </div>
              )}
              <p className="mt-3 text-sm text-white/90 line-clamp-2">{card.bio}</p>
              {card.interests?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {card.interests.slice(0, 4).map((i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/15 backdrop-blur border border-white/20">{i}</span>
                  ))}
                </div>
              )}
            </div>
          </article>
        );
      })}
      <div className="absolute -bottom-20 left-0 right-0 flex items-center justify-center gap-6">
        <button
          onClick={() => void swipe(false)}
          className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-card"
          aria-label="Pass"
        >
          <X className="w-7 h-7 text-muted-foreground" />
        </button>
        <button
          onClick={() => void swipe(true)}
          className="w-20 h-20 rounded-full bg-gradient-love flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-love"
          aria-label="Like"
        >
          <Heart className="w-9 h-9 text-love-foreground" fill="currentColor" />
        </button>
      </div>
    </div>
  );
}

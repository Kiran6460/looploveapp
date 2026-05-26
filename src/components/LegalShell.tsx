import { Link } from "@tanstack/react-router";
import { ArrowLeft, Heart } from "lucide-react";
import { Footer } from "@/components/Footer";

export function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/60 border-b border-border/40">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-love flex items-center justify-center shadow-love">
              <Heart className="w-4 h-4 text-love-foreground" fill="currentColor" />
            </div>
            <span className="font-display text-lg font-semibold">Loop<span className="text-gradient-love"> Love</span></span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-5 py-10 w-full">
        <h1 className="font-display text-4xl mb-2">{title}</h1>
        <p className="text-xs text-muted-foreground mb-8 uppercase tracking-widest">Last updated · {updated}</p>
        <article className="prose prose-invert max-w-none text-[15px] leading-relaxed [&_h2]:font-display [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:my-3 [&_ul]:my-3 [&_ul]:pl-6 [&_ul]:list-disc [&_li]:my-1.5 [&_strong]:text-foreground text-muted-foreground">
          {children}
        </article>
      </main>

      <Footer />
    </div>
  );
}

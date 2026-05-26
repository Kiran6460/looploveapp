import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/60 backdrop-blur-xl">
      <div className="max-w-2xl mx-auto px-5 py-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <Link to="/legal/terms" className="hover:text-foreground transition">Terms</Link>
        <Link to="/legal/privacy" className="hover:text-foreground transition">Privacy</Link>
        <Link to="/legal/guidelines" className="hover:text-foreground transition">Community Guidelines</Link>
        <span className="opacity-60">© {new Date().getFullYear()} Loop Love</span>
      </div>
    </footer>
  );
}

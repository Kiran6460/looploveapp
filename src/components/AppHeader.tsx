import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, MessageCircle, Flame, Settings as SettingsIcon, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function AppHeader() {
  const { user } = useAuth();
  const _navigate = useNavigate();
  void _navigate;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/60 border-b border-border/40">
      <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-2xl bg-gradient-love flex items-center justify-center shadow-love group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5 text-love-foreground" fill="currentColor" />
          </div>
          <span className="font-display text-2xl font-semibold tracking-tight">
            Loop<span className="text-gradient-love"> Love</span>
          </span>
        </Link>
        {user && (
          <nav className="flex items-center gap-1">
            <Link to="/" activeOptions={{ exact: true }} className="p-2.5 rounded-xl hover:bg-muted transition-colors data-[status=active]:text-primary" aria-label="Discover">
              <Flame className="w-5 h-5" />
            </Link>
            <Link to="/matches" className="p-2.5 rounded-xl hover:bg-muted transition-colors data-[status=active]:text-primary" aria-label="Matches">
              <MessageCircle className="w-5 h-5" />
            </Link>
            <Link to="/profile" className="p-2.5 rounded-xl hover:bg-muted transition-colors data-[status=active]:text-primary" aria-label="Profile">
              <User className="w-5 h-5" />
            </Link>
            <Link to="/settings" className="p-2.5 rounded-xl hover:bg-muted transition-colors data-[status=active]:text-primary" aria-label="Settings">
              <SettingsIcon className="w-5 h-5" />
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

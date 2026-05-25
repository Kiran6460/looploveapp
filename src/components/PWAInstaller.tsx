import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "looplove_pwa_install_dismissed";

export function PWAInstaller() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Guard: never register in iframe / Lovable preview hosts.
    const inIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();
    const host = window.location.hostname;
    const isPreview =
      host.includes("id-preview--") ||
      host.includes("lovableproject.com") ||
      host === "localhost" ||
      host === "127.0.0.1";

    if (inIframe || isPreview) {
      // Clean any stale registrations in preview/iframe.
      navigator.serviceWorker?.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (localStorage.getItem(DISMISS_KEY) !== "1") setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible || !deferred) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-border bg-card/95 p-4 shadow-card backdrop-blur">
      <div className="flex items-start gap-3">
        <img src="/icon-192.png" alt="" width={44} height={44} className="rounded-xl" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Install Loop Love</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Add to your home screen for the full app experience.</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={install} className="bg-gradient-love text-love-foreground shadow-love">
              <Download className="mr-1.5 h-4 w-4" /> Install
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              <X className="mr-1.5 h-4 w-4" /> Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render(target: HTMLElement, options: { sitekey: string; action: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }): string;
      remove(widgetId: string): void;
      reset(widgetId: string): void;
    };
  }
}

const scriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({ onToken, resetCount }: { onToken: (token: string) => void; resetCount: number }) {
  const target = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string>("");
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const render = () => {
      if (!target.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(target.current, {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
        action: "lead_submit",
        callback: token => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });
    };
    if (window.turnstile) render();
    else {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
      const script = existing ?? document.createElement("script");
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render);
      if (!existing) document.head.append(script);
      return () => script.removeEventListener("load", render);
    }
  }, []);

  useEffect(() => {
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, [resetCount]);

  useEffect(() => () => {
    if (widgetId.current) window.turnstile?.remove(widgetId.current);
  }, []);

  return <div className="turnstile-control" ref={target} />;
}

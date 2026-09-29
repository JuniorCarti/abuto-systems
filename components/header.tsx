"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { navigation } from "@/data/site";
import { Wordmark } from "./wordmark";

export function Header() {
  const [open, setOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  return <header className="site-header"><div className="shell header-inner"><Wordmark /><nav className="desktop-nav" aria-label="Primary navigation">{navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}</nav><Link className="button button-dark header-cta" href="/contact">Talk to Us <span aria-hidden="true">↗</span></Link><button ref={menuToggle} className="menu-toggle" type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}><span /><span /></button></div><nav id="mobile-navigation" className={`mobile-nav${open ? " is-open" : ""}`} aria-label="Mobile navigation" inert={!open} onKeyDown={event => { if (event.key === "Escape") { setOpen(false); requestAnimationFrame(() => menuToggle.current?.focus()); } }}>{navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setOpen(false)}>{item.label}<span aria-hidden="true">↗</span></Link>)}</nav></header>;
}

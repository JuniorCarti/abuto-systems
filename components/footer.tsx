import Link from "next/link";
import { navigation, products } from "@/data/site";
import { buildWhatsAppUrl, contactDetails, whatsappMessages } from "@/lib/contact";
import { Wordmark } from "./wordmark";
import { VirtualHours } from "@/components/virtual-hours";

export function Footer() {
  return <footer className="site-footer"><div className="shell footer-grid"><div><Wordmark inverted /></div><div><h2>Company</h2>{navigation.slice(1).map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</div><div><h2>Products</h2>{products.map(product => <Link key={product.href} href={product.href}>{product.name}</Link>)}</div><div><h2>Contact</h2><p>Have a problem technology could solve?</p><Link className="footer-contact" href="/contact">Talk to us <span aria-hidden="true">↗</span></Link><a href={buildWhatsAppUrl(contactDetails.primaryWhatsApp.number, whatsappMessages.general)} target="_blank" rel="noopener noreferrer">WhatsApp {contactDetails.primaryWhatsApp.display}</a><a href={buildWhatsAppUrl(contactDetails.secondaryWhatsApp.number, whatsappMessages.general)} target="_blank" rel="noopener noreferrer">WhatsApp {contactDetails.secondaryWhatsApp.display}</a><a href={`mailto:${contactDetails.email}`}>{contactDetails.email}</a></div></div><div className="shell footer-hours"><VirtualHours compact /></div><div className="shell footer-bottom"><span>© {new Date().getFullYear()} Abuto Systems.</span><span>Technology that works for you.</span><nav className="footer-legal" aria-label="Legal"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookies</Link></nav></div></footer>;
}

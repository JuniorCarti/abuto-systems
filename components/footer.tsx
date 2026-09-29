import Link from "next/link";
import { navigation, products } from "@/data/site";
import { Wordmark } from "./wordmark";

export function Footer() {
  return <footer className="site-footer"><div className="shell footer-grid"><div><Wordmark inverted /></div><div><h2>Company</h2>{navigation.slice(1).map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</div><div><h2>Products</h2>{products.map(product => <Link key={product.href} href={product.href}>{product.name}</Link>)}</div><div><h2>Start a conversation</h2><p>Have a problem technology could solve?</p><Link className="footer-contact" href="/contact">Talk to us <span aria-hidden="true">↗</span></Link></div></div><div className="shell footer-bottom"><span>© {new Date().getFullYear()} Abuto Systems.</span><span>Technology that works for you.</span></div></footer>;
}

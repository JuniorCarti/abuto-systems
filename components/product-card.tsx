import Link from "next/link";
import { products } from "@/data/site";

export function ProductCard() {
  const product = products[0];
  return <article className="product-card"><div className="product-card-copy"><div className="product-pill"><span className="pill-dot" /> A product by Abuto Systems</div><div><p className="product-kicker">PHARMACY MANAGEMENT SYSTEM</p><h3>{product.name}<span className="product-period">.</span></h3><p className="product-tagline">{product.description}</p></div><Link className="text-link" href={product.href}>Explore AskanPharma <span aria-hidden="true">↗</span></Link></div><div className="product-art" aria-hidden="true"><div className="product-orbit orbit-one" /><div className="product-orbit orbit-two" /><div className="product-art-panel"><div className="panel-top"><span>ASKANPHARMA</span></div><div className="panel-lines"><i /><i /><i /></div><div className="panel-bars"><i /><i /><i /><i /><i /></div></div><span className="product-art-caption">Practical tools for pharmacy teams.</span></div></article>;
}

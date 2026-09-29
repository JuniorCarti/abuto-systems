import Link from "next/link";

export function Wordmark({ inverted = false }: { inverted?: boolean }) {
  return <Link href="/" className={`wordmark${inverted ? " wordmark-inverted" : ""}`} aria-label="Abuto Systems home">Abuto <span>Systems</span><span className="wordmark-dot" aria-hidden="true">.</span></Link>;
}

import Link from "next/link";
import Image from "next/image";

export function Wordmark({ inverted = false }: { inverted?: boolean }) {
  if (inverted) {
    return (
      <Link href="/" className="footer-brand-logo">
        <Image
          src="/brand/abuto-logo-full.png"
          alt="Abuto Systems — Building practical digital solutions."
          width={900}
          height={671}
          unoptimized
        />
      </Link>
    );
  }

  return (
    <Link href="/" className="wordmark">
      <Image className="wordmark-mark" src="/brand/abuto-symbol.png" alt="Abuto Systems" width={170} height={138} unoptimized priority />
      <span className="wordmark-text" aria-hidden="true">Abuto <span>Systems</span></span>
    </Link>
  );
}

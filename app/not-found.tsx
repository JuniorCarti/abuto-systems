import Link from "next/link";

export default function NotFound() {
  return <main id="main" className="not-found shell"><span className="large-index">404 / PAGE NOT FOUND</span><h1>That page isn’t here.</h1><p>Let’s get you back to something useful.</p><Link className="button button-dark" href="/">Back to home <span aria-hidden="true">↗</span></Link></main>;
}

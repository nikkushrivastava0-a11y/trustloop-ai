import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="empty-state">
      <div className="eyebrow green">404 · OUTSIDE THE LOOP</div>
      <h1>This page has moved out of reach.</h1>
      <p>Check the address or explore the campus collection.</p>
      <Link href="/student" className="button">
        Browse resources
      </Link>
    </main>
  );
}

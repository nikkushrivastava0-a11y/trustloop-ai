"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="empty-state" role="alert">
      <h1>Something interrupted the loop.</h1>
      <p>
        We couldn’t display this page. Try again, or return to the collection.
      </p>
      <div className="action-row">
        <button className="button" onClick={reset}>
          Try again
        </button>
        <Link href="/student" className="button secondary">
          Browse resources
        </Link>
      </div>
    </main>
  );
}

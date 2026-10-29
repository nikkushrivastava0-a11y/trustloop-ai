export default function Loading() {
  return (
    <main id="main-content" className="content" aria-busy="true">
      <p>Opening your campus workspace…</p>
      <div className="skeleton" style={{ marginTop: 24 }} />
    </main>
  );
}

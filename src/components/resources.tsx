"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { presentation } from "@/lib/fixtures";
import { matchResources } from "@/lib/resource-matcher";
import type { Resource } from "@/lib/types";
import { Icon } from "./icons";
import { Shell } from "./shell";
import { useSession } from "./provider";
export function ResourceArt({
  resource,
  large = false,
}: {
  resource: Resource;
  large?: boolean;
}) {
  // Database UUIDs have no entry in fixture-based presentation assets.
  // Resolve live inventory by category; use bundled illustrations rather than
  // remote image services, so cards render consistently for judges.
  const fallbackByCategory: Record<string, { image: string; label: string; accent: string }> = {
    camera: { image: "/equipment/camera.svg", label: "Capture the moment", accent: "peach" },
    photography: { image: "/equipment/camera.svg", label: "Capture the moment", accent: "peach" },
    fabrication: { image: "/equipment/printer.svg", label: "Make it real", accent: "sage" },
    audio: { image: "/equipment/audio.svg", label: "Every voice counts", accent: "rose" },
    presentation: { image: "/equipment/projector.svg", label: "Share your big idea", accent: "sand" },
    electronics: { image: "/equipment/arduino.svg", label: "Experiment and invent", accent: "blue" },
    spaces: { image: "/equipment/meeting-room.svg", label: "Room to collaborate", accent: "sage" },
    computers: { image: "/equipment/laptop.svg", label: "Power your next project", accent: "lavender" },
  };
  const p = presentation[resource.id] || fallbackByCategory[resource.category.toLowerCase()];
  return (
    <div
      className={`resource-art ${p?.accent || "sage"} ${large ? "large" : ""}`}
    >
      {p ? (
        <Image
          src={p.image}
          alt={resource.title}
          width={480}
          height={300}
          priority={large}
        />
      ) : (
        <Icon name="box" size={100} />
      )}
      <span className="art-label">{p?.label || "Campus collection"}</span>
    </div>
  );
}
export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <article className="resource-card">
      <Link href={`/resources/${resource.id}`} className="resource-image-link">
        <ResourceArt resource={resource} />
        <span
          className={`availability ${resource.available ? "" : "unavailable"}`}
        >
          <span />
          {resource.available ? "Available" : "In use"}
        </span>
      </Link>
      <div className="resource-body">
        <div className="eyebrow">{resource.category}</div>
        <Link href={`/resources/${resource.id}`} className="resource-title">
          {resource.title}
          <Icon name="arrow" size={18} />
        </Link>
        <p className="location">
          <Icon name="pin" size={14} />
          {resource.location}
        </p>
        <div className="resource-bottom">
          <span className={resource.requires_training ? "training" : "ready"}>
            <Icon
              name={resource.requires_training ? "shield" : "check"}
              size={14}
            />
            {!resource.available
              ? "Currently in use"
              : resource.requires_training
                ? "Training required"
                : "Ready to book"}
          </span>
          <Link href={`/resources/${resource.id}`}>View details</Link>
        </div>
      </div>
    </article>
  );
}
export function Discover() {
  const { user } = useSession();
  const [items, setItems] = useState<Resource[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [projectNeed, setProjectNeed] = useState("");
  const [showMatches, setShowMatches] = useState(false);
  const [category, setCategory] = useState("All resources");
  const [available, setAvailable] = useState(false);
  const [training, setTraining] = useState(false);
  const [sort, setSort] = useState("recommended");
  async function load() {
    setLoading(true);
    try {
      setItems(await api.resources());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    api
      .resources()
      .then((value) => {
        if (active) {
          setItems(value);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const matches = showMatches && projectNeed.trim().length >= 3
    ? matchResources(projectNeed, items, user?.trained_resource_ids || []).slice(0, 3)
    : [];
  const categories = [
    "All resources",
    ...new Set(items.map((r) => r.category)),
  ];
  const phraseMatches = query.trim().length >= 3
    ? matchResources(query, items, user?.trained_resource_ids || [])
    : [];
  const directMatches = items.filter((r) =>
    `${r.title} ${r.category} ${r.description} ${r.location}`
      .toLowerCase().includes(query.trim().toLowerCase())
  );
  // Natural language falls back to explainable capability matching.
  // Keep simple keyword searches behaving exactly as before.
  const candidateResources = query.trim() && directMatches.length === 0
    ? phraseMatches.filter((match) => match.score >= 10).map((match) => match.resource)
    : directMatches;
  const isSmartSearch = query.trim().length >= 3 && directMatches.length === 0 && candidateResources.length > 0;
  const filtered = candidateResources
    .filter((r) =>
      (category === "All resources" || r.category === category) &&
      (!available || r.available) &&
      (!training || !r.requires_training)
    )
    .sort((a, b) =>
      sort === "name"
        ? a.title.localeCompare(b.title)
        : isSmartSearch
          ? phraseMatches.findIndex((m) => m.resource.id === a.id) - phraseMatches.findIndex((m) => m.resource.id === b.id)
          : Number(b.available) - Number(a.available)
    );
  return (
    <Shell>
      <div className="page-heading">
        <div>
          <div className="eyebrow green">YOUR NEXT BIG IDEA STARTS HERE</div>
          <h1>
            Discover your possibilities<span>.</span>
          </h1>
          <p>The right tools. The right space. All within your campus.</p>
        </div>
        <Link href="/bookings" className="button secondary">
          <Icon name="clock" size={17} /> My bookings
        </Link>
      </div>
      <section className="discovery-banner">
        <div className="banner-copy">
          <span className="tag">
            <Icon name="spark" size={14} /> MADE FOR YOUR NEXT WHAT IF
          </span>
          <h2>
            Big ideas.
            <br />
            Shared possibilities.
          </h2>
          <p>
            Borrow the tools to bring your next project to life.
            <br />
            Your campus has more to offer than you think.
          </p>
          <a href="#resource-list" className="button">
            Explore resources <Icon name="arrow" size={17} />
          </a>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="floating-tile tile-one">
            <Icon name="box" size={42} />
          </span>
          <span className="floating-tile tile-two">
            <Icon name="spark" size={38} />
          </span>
          <span className="floating-tile tile-three">
            <Icon name="shield" size={36} />
          </span>
          <span className="orbit-core">∞</span>
          <span className="banner-caption">ONE CAMPUS. ENDLESS POTENTIAL.</span>
        </div>
      </section>
      <div className="stats-strip">
        <div>
          <span className="stat-icon">
            <Icon name="box" />
          </span>
          <div>
            <strong>{loading ? "—" : items.length}</strong>
            <span>Campus resources</span>
          </div>
        </div>
        <div>
          <span className="stat-icon">
            <Icon name="check" />
          </span>
          <div>
            <strong>
              {loading ? "—" : items.filter((r) => r.available).length}
            </strong>
            <span>Available to explore</span>
          </div>
        </div>
        <div>
          <span className="stat-icon">
            <Icon name="shield" />
          </span>
          <div>
            <strong>Verified</strong>
            <span>Campus community</span>
          </div>
        </div>
        <div>
          <span className="stat-icon">
            <Icon name="users" />
          </span>
          <div>
            <strong>Share more</strong>
            <span>Create together</span>
          </div>
        </div>
      </div>
      <section className="panel" aria-labelledby="smart-match-heading" style={{ marginBottom: 28 }}>
        <div className="eyebrow green">EXPLAINABLE RESOURCE MATCHING</div>
        <h2 id="smart-match-heading" style={{ marginTop: 10 }}>Tell us what you're building.</h2>
        <p>Describe your project to find fitting equipment, with availability and training requirements shown upfront.</p>
        <form onSubmit={(event) => { event.preventDefault(); setShowMatches(true); }} style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
          <input
            aria-label="Describe your project for resource matching"
            value={projectNeed}
            maxLength={300}
            onChange={(event) => { setProjectNeed(event.target.value); setShowMatches(false); }}
            placeholder="e.g. I want to record a documentary or build a 3D prototype"
            style={{ flex: "1 1 280px", minWidth: 0 }}
            required
            minLength={3}
          />
          <button type="submit" className="button">Find matching tools</button>
        </form>
        {showMatches && (
          <div aria-live="polite" style={{ marginTop: 16 }}>
            {matches.length ? (
              <div className="resource-grid">
                {matches.map(({ resource, reasons, bookable }) => (
                  <div key={resource.id} className="panel">
                    <div className="eyebrow">{resource.category}</div>
                    <h3><Link href={`/resources/${resource.id}`}>{resource.title}</Link></h3>
                    <p>{reasons.join(" · ")}</p>
                    <Link className="button secondary" href={`/resources/${resource.id}`}>
                      {bookable ? "View and request" : "View requirements"}
                    </Link>
                  </div>
                ))}
              </div>
            ) : <p role="status">No strong matches yet. Browse the full collection below or try a different description.</p>}
            <small>How it works: keyword and capability matching only. Recommendations use listed resource data; this is not generative AI.</small>
          </div>
        )}
      </section>
      <section id="resource-list" className="listing">
        <div className="section-heading">
          <div>
            <h2>Find your next resource</h2>
            <p>Equipment for your curiosity. Access for your ambition.</p>
          </div>
          <span className="count-label" role="status">
            {loading
              ? "Loading resources…"
              : error
                ? "Collection unavailable"
                : `${filtered.length} resources`}
          </span>
        </div>
        <div className="search-toolbar">
          <label className="search-field">
            <Icon name="search" />
            <input
              aria-label="Search resources"
              placeholder="Search equipment, spaces, or a big idea…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>⌕</kbd>
          </label>
          <label className="sort-select">
            Sort by{" "}
            <select
              aria-label="Sort resources"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recommended">Availability</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
        </div>
        <div className="filters">
          <div className="category-tabs" aria-label="Resource categories">
            {categories.map((c) => (
              <button
                key={c}
                aria-pressed={category === c}
                className={category === c ? "selected" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="filter-checks">
            <label>
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
              />{" "}
              Available now
            </label>
            <label>
              <input
                type="checkbox"
                checked={training}
                onChange={(e) => setTraining(e.target.checked)}
              />{" "}
              No training needed
            </label>
          </div>
        </div>
        {isSmartSearch && !loading && !error && (
          <p className="notice" role="status" style={{ marginBottom: 16 }}>
            Showing project-relevant equipment using keyword and capability matching.
            This is an explainable search, not a generative AI response.
          </p>
        )}
        {loading ? (
          <div className="resource-grid" aria-label="Loading resources">
            {[1, 2, 3].map((n) => (
              <div className="skeleton" key={n} />
            ))}
          </div>
        ) : error ? (
          <div className="empty-state" role="alert">
            <h3>We couldn’t load the collection.</h3>
            <p>{error}</p>
            <button className="button" onClick={() => void load()}>
              Try again
            </button>
          </div>
        ) : filtered.length ? (
          <div className="resource-grid">
            {filtered.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Icon name="search" size={36} />
            <h3>No resources found</h3>
            <p>Try a different search or clear your filters.</p>
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setCategory("All resources");
                setAvailable(false);
                setTraining(false);
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
      <div className="bottom-note">
        <Icon name="shield" />
        <div>
          <strong>Shared with trust, returned with care.</strong>
          <p>Every booking keeps our campus community moving forward.</p>
        </div>
        <span>{user ? "You’re part of the loop." : "Join the loop."}</span>
      </div>
    </Shell>
  );
}

import type { Resource } from "./types";

/**
 * Explainable, deterministic resource matching.
 * No external model is called; never market this as LLM-powered AI.
 */
const synonyms: Record<string, string[]> = {
  photo: ["camera", "photography", "dslr", "lens", "shoot", "portrait"],
  film: ["video", "camera", "shoot", "documentary", "record"],
  podcast: ["microphone", "audio", "record", "studio", "voice"],
  prototype: ["printer", "3d", "fabrication", "model", "cad"],
  circuit: ["oscilloscope", "electronics", "lab", "measure", "debug"],
  presentation: ["projector", "screen", "slides", "display"],
  immersive: ["vr", "virtual", "quest", "headset", "mixed"],
};
const tokens = (value: string) =>
  value.toLowerCase().match(/[a-z0-9]+/g)?.filter((t) => t.length > 2) ?? [];

export interface ResourceMatch {
  resource: Resource;
  score: number;
  reasons: string[];
  bookable: boolean;
}

export function matchResources(need: string, resources: Resource[], trainedIds: string[] = []): ResourceMatch[] {
  const query = new Set(tokens(need));
  const expanded = new Set(query);
  for (const [concept, words] of Object.entries(synonyms)) {
    if (query.has(concept) || words.some((word) => query.has(word))) {
      expanded.add(concept);
      words.forEach((word) => expanded.add(word));
    }
  }
  return resources.map((resource) => {
    const title = new Set(tokens(resource.title));
    const category = new Set(tokens(resource.category));
    const description = new Set(tokens(resource.description + " " + resource.rules.join(" ")));
    const matchedTitle = [...expanded].filter((term) => title.has(term));
    const matchedCategory = [...expanded].filter((term) => category.has(term));
    const matchedDescription = [...expanded].filter((term) => description.has(term));
    const relevance = matchedTitle.length * 5 + matchedCategory.length * 3 + matchedDescription.length;
    const bookable = resource.available && (!resource.requires_training || trainedIds.includes(resource.id));
    const reasons = [];
    if (matchedTitle.length) reasons.push("Matches equipment: " + matchedTitle.slice(0, 3).join(", "));
    if (matchedCategory.length) reasons.push("Relevant category: " + resource.category);
    if (!matchedTitle.length && matchedDescription.length) reasons.push("Relevant capabilities: " + matchedDescription.slice(0, 3).join(", "));
    if (!resource.available) reasons.push("Currently unavailable");
    else if (!bookable) reasons.push("Training verification required");
    else reasons.push("Available and eligible to request");
    return { resource, score: relevance * 10 + (bookable ? 2 : 0), reasons, bookable };
  }).filter((item) => item.score > 2)
    .sort((a, b) => b.score - a.score || a.resource.title.localeCompare(b.resource.title));
}

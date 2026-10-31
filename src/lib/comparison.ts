const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const compareCookieName = "fs-compare";
export const matchContextCookieName = "fs-match";
export const compareLimit = 3;

export type StoredMatchContext = {
  query: string;
  category: string;
  city: string;
  region: string;
};

export function parseMatchContext(value: string | undefined): StoredMatchContext {
  const empty = { query: "", category: "", city: "", region: "" };
  if (!value || value.length > 800) return empty;
  try {
    const parsed = JSON.parse(value) as Partial<StoredMatchContext>;
    const category = typeof parsed.category === "string" ? parsed.category : "";
    return {
      query: clip(parsed.query, 200),
      category: /^[a-z0-9-]*$/.test(category) ? category.slice(0, 80) : "",
      city: clip(parsed.city, 120),
      region: clip(parsed.region, 160),
    };
  } catch {
    return empty;
  }
}

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function parseCompareSlugs(value: string | undefined) {
  if (!value) {
    return [];
  }

  const slugs = value
    .split(",")
    .map((slug) => slug.trim())
    .filter((slug) => slugPattern.test(slug));

  return [...new Set(slugs)].slice(0, compareLimit);
}

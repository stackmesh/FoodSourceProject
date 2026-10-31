const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const compareCookieName = "fs-compare";
export const compareLimit = 3;

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

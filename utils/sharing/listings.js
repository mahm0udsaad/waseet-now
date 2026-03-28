const WEBSITE_ORIGIN = "https://www.wasitalan.com";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function buildListingShareUrl(type, id) {
  if (!type || !id) return null;
  return `${WEBSITE_ORIGIN}/${type}/${id}`;
}

export function buildListingSharePayload(ad) {
  if (!ad?.id || !ad?.type) return null;

  const url = buildListingShareUrl(ad.type, ad.id);
  const title = normalizeText(ad.title) || "وسيط الآن";
  const description = normalizeText(ad.description);
  const body = [title, description, url].filter(Boolean).join("\n");

  return {
    title,
    url,
    message: body,
  };
}

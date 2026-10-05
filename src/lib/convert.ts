export type PlatformSlug = "shopee" | "tiktok" | "lazada" | "tiki";

export const PLATFORM_LABEL: Record<PlatformSlug, string> = {
  shopee: "Shopee",
  tiktok: "TikTok Shop",
  lazada: "Lazada",
  tiki: "Tiki",
};

const HOST_MAP: { match: RegExp; slug: PlatformSlug }[] = [
  { match: /(^|\.)shopee\.(vn|com)$/i, slug: "shopee" },
  { match: /(^|\.)(tiktok|vt)\.(com|vn)$/i, slug: "tiktok" },
  { match: /(^|\.)lazada\.vn$/i, slug: "lazada" },
  { match: /(^|\.)tiki\.vn$/i, slug: "tiki" },
  { match: /(^|\.)shp\.ee$/i, slug: "shopee" },
  { match: /(^|\.)s\.shopee\.vn$/i, slug: "shopee" },
  { match: /(^|\.)s\.lazada\.vn$/i, slug: "lazada" },
];

export function detectPlatform(rawUrl: string): PlatformSlug | null {
  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.replace(/^www\./, "");
    for (const entry of HOST_MAP) {
      if (entry.match.test(host)) return entry.slug;
    }
    return null;
  } catch {
    return null;
  }
}

export function guessTitle(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());
    const last = url.pathname.split("/").filter(Boolean).pop() ?? "";
    const cleaned = decodeURIComponent(last)
      .replace(/\.html?$/i, "")
      .replace(/-i\.\d+\.\d+$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
    return cleaned ? cleaned.slice(0, 90) : url.hostname;
  } catch {
    return "Sản phẩm";
  }
}

export function makeShortCode(): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 7; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function buildAffiliateUrl(
  rawUrl: string,
  param: string | null,
  value: string | null,
  shortCode: string,
): string {
  try {
    const url = new URL(rawUrl.trim());
    if (param) url.searchParams.set(param, value || shortCode);
    url.searchParams.set("utm_source", "hoantien");
    url.searchParams.set("utm_campaign", shortCode);
    return url.toString();
  } catch {
    return rawUrl;
  }
}

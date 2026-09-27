/**
 * Fork addition: per-site branding. A site's .pages.yml can carry a
 * `branding` block (name, logo, colours, fonts) that restyles the CMS while
 * that site is open. Everything here re-validates its input because the
 * values end up inside a <style> tag and a Google Fonts URL.
 */

import { createOctokitInstance } from "@/lib/utils/octokit";
import { getInstallationToken } from "@/lib/token";
import { getConfig } from "@/lib/config-store";

type BrandingColors = {
  primary?: string;
  background?: string;
  surface?: string;
  text?: string;
  border?: string;
  sidebar?: string;
  sidebar_text?: string;
};

type Branding = {
  name?: string;
  description?: string;
  website?: string;
  logo?: string;
  colors: BrandingColors;
  font: { body?: string; heading?: string };
};

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const FONT_NAME = /^[A-Za-z0-9 ]{1,60}$/;
const LOGO_TYPES: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};
const LOGO_MAX_BYTES = 256 * 1024;
const LOGO_TTL = 5 * 60 * 1000;

const COLOR_KEYS: (keyof BrandingColors)[] = [
  "primary",
  "background",
  "surface",
  "text",
  "border",
  "sidebar",
  "sidebar_text",
];

const readWebsite = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

const readBranding = (configObject: any): Branding | null => {
  const raw = configObject?.branding;
  if (!raw || typeof raw !== "object") return null;

  const colors: BrandingColors = {};
  for (const key of COLOR_KEYS) {
    const value = raw.colors?.[key];
    if (typeof value === "string" && HEX_COLOR.test(value)) colors[key] = value;
  }

  const font: Branding["font"] = {};
  for (const key of ["body", "heading"] as const) {
    const value = raw.font?.[key];
    if (typeof value === "string" && FONT_NAME.test(value.trim())) font[key] = value.trim();
  }

  return {
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 60) : undefined,
    description: typeof raw.description === "string" && raw.description.trim()
      ? raw.description.trim().slice(0, 200)
      : undefined,
    website: readWebsite(raw.website),
    logo: typeof raw.logo === "string" && raw.logo.trim() ? raw.logo.trim() : undefined,
    colors,
    font,
  };
};

// Black or white, whichever reads better on the given colour.
const contrastText = (hex: string) => {
  const full = hex.length === 4
    ? hex.slice(1).split("").map((c) => c + c).join("")
    : hex.slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(full.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#131313" : "#ffffff";
};

const mix = (color: string, percent: number, base: string) =>
  `color-mix(in oklab, ${color} ${percent}%, ${base})`;

const fontStack = (name: string) =>
  `"${name}", ui-sans-serif, system-ui, sans-serif`;

// Light mode takes the full palette. Dark mode keeps the CMS's own dark
// theme and only picks up the brand's primary colour.
const getBrandingCss = (branding: Branding) => {
  const { colors, font } = branding;
  const light: string[] = [];
  const dark: string[] = [];
  const set = (target: string[], name: string, value: string) =>
    target.push(`--${name}: ${value};`);

  if (colors.primary) {
    const foreground = contrastText(colors.primary);
    for (const target of [light, dark]) {
      set(target, "primary", colors.primary);
      set(target, "primary-foreground", foreground);
      set(target, "sidebar-primary", colors.primary);
      set(target, "sidebar-primary-foreground", foreground);
    }
    set(light, "ring", colors.primary);
  }

  const surface = colors.surface ?? colors.background;
  if (colors.background) set(light, "background", colors.background);
  if (surface) {
    set(light, "card", surface);
    set(light, "popover", surface);
  }
  if (colors.text) {
    for (const name of ["foreground", "card-foreground", "popover-foreground", "secondary-foreground", "accent-foreground"]) {
      set(light, name, colors.text);
    }
  }
  if (colors.text && surface) {
    set(light, "muted", mix(colors.text, 5, surface));
    set(light, "accent", mix(colors.text, 6, surface));
    set(light, "secondary", mix(colors.text, 6, surface));
    set(light, "muted-foreground", mix(colors.text, 60, surface));
  }
  if (colors.border) {
    set(light, "border", colors.border);
    set(light, "input", colors.border);
  }

  const sidebar = colors.sidebar;
  const sidebarText = colors.sidebar_text ?? (sidebar ? contrastText(sidebar) : undefined);
  if (sidebar && sidebarText) {
    set(light, "sidebar", sidebar);
    set(light, "sidebar-foreground", sidebarText);
    set(light, "sidebar-accent", mix(sidebarText, 12, sidebar));
    set(light, "sidebar-accent-foreground", sidebarText);
    set(light, "sidebar-border", mix(sidebarText, 14, sidebar));
  }

  const rules: string[] = [];
  if (light.length) rules.push(`html:not(.dark) { ${light.join(" ")} }`);
  if (dark.length) rules.push(`html.dark { ${dark.join(" ")} }`);
  if (sidebar && sidebarText) {
    // Secondary text inside the sidebar (branch name, group labels).
    rules.push(`html:not(.dark) [data-slot="sidebar"] { --muted-foreground: ${mix(sidebarText, 65, sidebar)}; }`);
  }
  // next/font sets --font-inter with a class on <body>; !important wins over it.
  if (font.body) rules.push(`body { --font-inter: ${fontStack(font.body)} !important; }`);
  if (font.heading) {
    rules.push(
      `h1, h2, h3, [data-slot="card-title"], [data-slot="dialog-title"], [data-slot="sheet-title"] { font-family: ${fontStack(font.heading)}; }`,
    );
  }

  return rules.join("\n");
};

const getBrandingFontsUrl = (branding: Branding) => {
  const families = Array.from(new Set([branding.font.body, branding.font.heading].filter(Boolean))) as string[];
  if (!families.length) return null;
  const query = families
    .map((family) => `family=${family.replace(/ /g, "+")}:wght@400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
};

const logoCache = new Map<string, { time: number; src: string | null }>();

// Reads the logo from the repository and returns it as a data URI, so it
// works for private repositories without exposing a token to the browser.
const getBrandingLogo = async (
  owner: string,
  repo: string,
  branch: string,
  path: string,
  token: string,
): Promise<string | null> => {
  const cleanPath = path.replace(/^\/+/, "");
  const extension = cleanPath.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = LOGO_TYPES[extension];
  if (!mimeType || cleanPath.includes("..")) return null;

  const cacheKey = `${owner.toLowerCase()}/${repo.toLowerCase()}/${branch}/${cleanPath}`;
  const cached = logoCache.get(cacheKey);
  if (cached && Date.now() - cached.time < LOGO_TTL) return cached.src;

  let src: string | null = null;
  try {
    const octokit = createOctokitInstance(token);
    const response = await octokit.rest.repos.getContent({ owner, repo, path: cleanPath, ref: branch });
    const file = response.data as any;
    if (!Array.isArray(file) && file.type === "file" && file.content && file.size <= LOGO_MAX_BYTES) {
      src = `data:${mimeType};base64,${String(file.content).replace(/\n/g, "")}`;
    }
  } catch (error) {
    console.warn(`Branding logo not loaded for ${owner}/${repo}: ${cleanPath}`, error);
  }

  logoCache.set(cacheKey, { time: Date.now(), src });
  return src;
};

// The sign-in page is branded for one site when the link names it, either
// as ?site=owner/repo or through the page the visitor was headed to.
const RESERVED_SEGMENTS = new Set(["admin", "settings", "api", "auth", "sign-in"]);
const SITE_PATTERN = /^([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})$/;
const REDIRECT_PATTERN = /^\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})(?:[/?#]|$)/;

const getSignInSite = (site?: string, redirect?: string) => {
  const fromSite = site?.trim().match(SITE_PATTERN);
  if (fromSite) return { owner: fromSite[1], repo: fromSite[2] };

  const fromRedirect = redirect?.match(REDIRECT_PATTERN);
  if (fromRedirect && !RESERVED_SEGMENTS.has(fromRedirect[1].toLowerCase())) {
    return { owner: fromRedirect[1], repo: fromRedirect[2] };
  }
  return null;
};

type SignInBranding = {
  owner: string;
  repo: string;
  name?: string;
  logo: string | null;
  css: string;
  fontsUrl: string | null;
};

const signInCache = new Map<string, { time: number; value: SignInBranding | null }>();

// Reads the site's branding with the GitHub App's own access, since nobody
// is signed in yet. Results (including "no branding") are kept for a few
// minutes so the public sign-in page cannot be used to hammer GitHub.
const getSignInBranding = async (owner: string, repo: string): Promise<SignInBranding | null> => {
  const cacheKey = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
  const cached = signInCache.get(cacheKey);
  if (cached && Date.now() - cached.time < LOGO_TTL) return cached.value;

  let value: SignInBranding | null = null;
  try {
    const token = await getInstallationToken(owner, repo);
    const octokit = createOctokitInstance(token);
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    const branch = repoData.default_branch;
    const config = await getConfig(owner, repo, branch, { getToken: async () => token });
    const branding = readBranding(config?.object);
    if (branding) {
      value = {
        owner: repoData.owner.login,
        repo: repoData.name,
        name: branding.name,
        logo: branding.logo ? await getBrandingLogo(owner, repo, branch, branding.logo, token) : null,
        css: getBrandingCss(branding),
        fontsUrl: getBrandingFontsUrl(branding),
      };
    }
  } catch {
    // Unknown repository or the app is not installed there: default sign-in.
  }

  signInCache.set(cacheKey, { time: Date.now(), value });
  return value;
};

export type { Branding, SignInBranding };
export {
  readBranding,
  getBrandingCss,
  getBrandingFontsUrl,
  getBrandingLogo,
  getSignInSite,
  getSignInBranding,
};

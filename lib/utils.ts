// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Theme management
export type Theme = "dark" | "light" | "system";

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("theme") as Theme) || "system";
}

export function setTheme(theme: Theme) {
  const root = window.document.documentElement;
  root.classList.remove("light", "dark");

  if (theme === "system") {
    const systemTheme = getSystemTheme();
    root.classList.add(systemTheme);
    localStorage.removeItem("theme");
  } else {
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }
}

// Form field validation
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// URL parameter handling
export function parseUrlParams(url: string) {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    return {
      baseUrl: `${urlObj.origin}${urlObj.pathname}`,
      params: Array.from(params.entries()).map(([key, value]) => ({
        id: key,
        value: decodeURIComponent(value),
        label: ""
      }))
    };
  } catch {
    return null;
  }
}

export function constructUrl(baseUrl: string, fields: Array<{ id: string; value: string }>) {
  const validFields = fields.filter(f => f.id && f.value);
  if (!validFields.length) return null;

  const params = validFields
    .map(f => `${f.id}=${encodeURIComponent(f.value)}`)
    .join("&");
  
  const connector = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${connector}${params}`;
}
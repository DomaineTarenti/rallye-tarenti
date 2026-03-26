"use client";

import { useEffect } from "react";
import { useThemeStore } from "./store";
import type { ThemeConfig } from "./types";

// ─── Hook pour consommer le thème ────────────────────────────────
export function useTheme() {
  return useThemeStore((s) => s.theme);
}

// ─── Applique les CSS variables sur :root ────────────────────────
export function useApplyTheme() {
  const theme = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", theme.primaryColor);
    root.style.setProperty("--color-primary-light", theme.primaryColorLight);
    root.style.setProperty("--color-primary-dark", theme.primaryColorDark);
  }, [theme]);

  return theme;
}

// ─── Charger un thème depuis une session ─────────────────────────
export function applySessionTheme(session: {
  primary_color?: string | null;
  logo_url?: string | null;
  name?: string;
}) {
  const updates: Partial<ThemeConfig> = {};
  if (session.primary_color) {
    updates.primaryColor = session.primary_color;
    updates.primaryColorLight = lighten(session.primary_color, 30);
    updates.primaryColorDark = darken(session.primary_color, 20);
  }
  if (session.logo_url) updates.logoUrl = session.logo_url;
  if (session.name) updates.appName = session.name;

  useThemeStore.getState().setTheme(updates);
}

// ─── Helpers couleur simples ─────────────────────────────────────
function lighten(hex: string, percent: number): string {
  return adjustColor(hex, percent);
}

function darken(hex: string, percent: number): string {
  return adjustColor(hex, -percent);
}

function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(2.55 * percent)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

import { useSyncExternalStore } from 'react';
import { themes, defaultTheme, type ThemeId } from './theme-catalog';
export const appearanceKey = 'family-paws:appearance';
export const palettes = themes.map((theme) => theme.id);
export type Appearance = { palette: ThemeId };
const defaults: Appearance = { palette: defaultTheme };
type Snapshot = Appearance & { memoryOnly: boolean };
let current: Snapshot = { ...defaults, memoryOnly: false };
const serverSnapshot = current;
const listeners = new Set<() => void>();
let initialized = false;
let appScope = typeof window !== 'undefined' && location.pathname.startsWith('/app/');
export function setAppearanceScope(isApp: boolean) {
  appScope = isApp;
  renderAppearance();
}
function renderAppearance() {
  const root = document.documentElement;
  if (appScope) {
    root.dataset.colorTheme = current.palette;
    root.dataset.uiStyle = current.palette;
  } else {
    delete root.dataset.colorTheme;
    delete root.dataset.uiStyle;
  }
  const color = getComputedStyle(root).getPropertyValue('--md-primary').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}
export function parseAppearance(value: string | null): Appearance {
  try {
    const parsed = JSON.parse(value ?? 'null');
    if (!parsed || ![1, 2].includes(parsed.version)) return defaults;
    const legacy: Record<string, ThemeId> = {
      'google-calendar': 'google',
      gmail: 'google',
      'apple-calendar': 'apple',
      warm: 'google',
      blue: 'vscode-light',
      forest: 'google',
      iris: 'vscode-dark',
      'solarized-light': 'google',
      'intellij-light': 'vscode-light',
      monokai: 'vscode-dark',
      dracula: 'vscode-dark',
    };
    const palette = legacy[parsed.palette] ?? parsed.palette;
    return { palette: palettes.includes(palette) ? palette : defaultTheme };
  } catch {
    return defaults;
  }
}
function apply(value: Appearance, memoryOnly = false) {
  current = { ...value, memoryOnly };
  renderAppearance();
  listeners.forEach((listener) => listener());
}
function read() {
  try {
    return { ...parseAppearance(localStorage.getItem(appearanceKey)), memoryOnly: false };
  } catch {
    return { ...defaults, memoryOnly: true };
  }
}
export function initializeAppearance() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const stored = read();
  apply(stored, stored.memoryOnly);
  window.addEventListener('storage', (event) => {
    if (event.key !== appearanceKey && event.key !== null) return;
    const stored = read();
    apply(stored, stored.memoryOnly);
  });
}
export function changeAppearance(value: Appearance) {
  let memoryOnly = false;
  try {
    localStorage.setItem(appearanceKey, JSON.stringify({ version: 2, ...value }));
  } catch {
    memoryOnly = true;
  }
  apply(value, memoryOnly);
}
export function resetAppearance() {
  changeAppearance(defaults);
}
export function useAppearance() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => current,
    () => serverSnapshot,
  );
}

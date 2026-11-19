// Curated app-family themes, mapped from the linked original sources.
export const themes = [
  {
    id: 'google',
    mode: 'light',
    radius: 24,
    surface: '#ffffff',
    primary: '#0b57d0',
    source:
      'https://workspaceupdates.googleblog.com/2024/10/new-look-and-feel-and-dark-mode-google-calendar.html',
  },
  {
    id: 'apple',
    mode: 'light',
    radius: 8,
    surface: '#ffffff',
    primary: '#e9152d',
    source: 'https://developer.apple.com/design/human-interface-guidelines/color',
  },
  {
    id: 'vscode-light',
    mode: 'light',
    radius: 4,
    surface: '#ffffff',
    primary: '#005fb8',
    source:
      'https://github.com/microsoft/vscode/blob/main/extensions/theme-defaults/themes/light_modern.json',
  },
  {
    id: 'vscode-dark',
    mode: 'dark',
    radius: 4,
    surface: '#1f1f1f',
    primary: '#0078d4',
    source:
      'https://github.com/microsoft/vscode/blob/main/extensions/theme-defaults/themes/dark_modern.json',
  },
] as const;
export type ThemeId = (typeof themes)[number]['id'];
export const defaultTheme: ThemeId = 'google';

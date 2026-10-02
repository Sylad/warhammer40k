/**
 * L33 — raccourci de la recherche rapide selon la plateforme (le gestionnaire accepte Ctrl+K et
 * ⌘K partout). Indice : `navigator.userAgentData.platform` (Chromium) s'il existe, sinon l'agent
 * utilisateur — jamais `navigator.platform`, obsolète. Inconnu → « Ctrl K ».
 */
export interface PlatformHints {
  userAgentData?: { platform?: string };
  userAgent?: string;
}

export function isApplePlatform(nav: PlatformHints | undefined): boolean {
  const platform = nav?.userAgentData?.platform;
  if (platform) return /^(macOS|iOS|iPadOS)$/i.test(platform);
  return /Macintosh|Mac OS X|iPhone|iPad|iPod/.test(nav?.userAgent ?? '');
}

/** `hint` : texte affiché dans le bouton ; `label` : son nom accessible. */
export function searchShortcut(nav: PlatformHints | undefined): { hint: string; label: string } {
  return isApplePlatform(nav)
    ? { hint: '⌘K', label: 'Rechercher (⌘K)' }
    : { hint: 'Ctrl K', label: 'Rechercher (Ctrl+K)' };
}

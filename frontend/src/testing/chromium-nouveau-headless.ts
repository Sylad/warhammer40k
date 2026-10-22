/**
 * L165 — setup de `vitest.e2e.config.ts` : les acceptations navigateur lancent Chromium en mode headless
 * « nouveau » (`channel: 'chromium'`) au lieu du `chrome-headless-shell` que `chromium.launch()` choisit par
 * défaut. Raison LOCALE (Big-Blue) : `~/.cache/ms-playwright/chromium_headless_shell-1243` y est un lien vers
 * le build 1228 (Chrome 149), posé le 18-10 pour contourner le blocage des captures ; sur ce binaire, plus
 * ancien que celui qu'attend playwright-core, un onglet ouvert par clic du milieu plante (page créée,
 * adresse vide). Le vrai headless shell 1243 (Chrome 153, celui de la CI) ouvre cet onglet normalement : ce
 * n'est PAS un défaut du headless shell en général. Cela n'explique pas non plus le rouge de R9 en CI (délai
 * sur l'événement « page »), non reproduit et non diagnostiqué. Un lancement qui fixe déjà `channel` ou
 * `executablePath` est laissé tel quel. À retirer quand le lien 1243 → 1228 l'est.
 */
import { chromium } from 'playwright-core';

const lancer = chromium.launch.bind(chromium);
chromium.launch = (options = {}) =>
  lancer(options.channel || options.executablePath ? options : { ...options, channel: 'chromium' });

/**
 * L165 — setup de `vitest.e2e.config.ts` : les acceptations navigateur lancent Chromium en mode headless
 * « nouveau » (`channel: 'chromium'`) au lieu de `chrome-headless-shell`, que `chromium.launch()` choisit
 * par défaut. Avec ce dernier (constaté sous WSL, builds 149), tout onglet ouvert par clic du milieu ou
 * Ctrl+clic plante (« Target crashed », `page.url()` reste vide) même sur une page statique, ce qui
 * rendait rouge « L47 R9 — clic du milieu » sans défaut de l'application. Un lancement qui fixe déjà
 * `channel` ou `executablePath` est laissé tel quel.
 */
import { chromium } from 'playwright-core';

const lancer = chromium.launch.bind(chromium);
chromium.launch = (options = {}) =>
  lancer(options.channel || options.executablePath ? options : { ...options, channel: 'chromium' });

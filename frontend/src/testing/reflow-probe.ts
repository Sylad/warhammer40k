/**
 * L31/L32 — sonde de redistribution (WCAG 1.4.10), exécutée DANS la page (`page.evaluate(reflowProbe,
 * selector)`) : autonome, sans import. Pour chaque nœud texte visible sous `root` :
 *  - `overflow` : texte hors de la fenêtre (défilement horizontal) ;
 *  - `clipped`  : texte rogné par un ancêtre `overflow: hidden | clip` (hors conteneur défilant) ;
 *  - `broken`   : titre (h1–h4) coupé à l'intérieur d'un mot — une coupure APRÈS un trait d'union
 *    (« Vaisseaux-/Mondes ») est une coupure de ligne normale, pas une coupure de mot.
 * `scroll` : largeur de défilement du document moins largeur de la fenêtre (0 attendu).
 */
export interface ReflowReport {
  scroll: number;
  overflow: string[];
  clipped: string[];
  broken: string[];
}

export function reflowProbe(rootSelector: string): ReflowReport {
  const vw = document.documentElement.clientWidth;
  const out: ReflowReport = { scroll: document.documentElement.scrollWidth - vw, overflow: [], clipped: [], broken: [] };
  const root = document.querySelector(rootSelector);
  if (!root) return out;
  const label = (e: Element, t: string) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : ''} « ${t.slice(0, 40)} »`;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = (node.textContent ?? '').trim();
    const el = node.parentElement;
    if (!text || !el) continue;
    if (getComputedStyle(el).visibility === 'hidden' || el.closest('[inert], .sr-only, dialog:not([open])')) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) continue;
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    if (right > vw + 1 || left < -1) out.overflow.push(`${label(el, text)} [${Math.round(left)}, ${Math.round(right)}] / ${vw}`);
    for (let a: Element | null = el; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX === 'auto' || s.overflowX === 'scroll') break;
      if (s.overflowX !== 'hidden' && s.overflowX !== 'clip') continue;
      const box = a.getBoundingClientRect();
      if (box.width <= 2) break;
      if (right > box.right + 1 || left < box.left - 1) {
        out.clipped.push(`${label(el, text)} rogné de ${Math.round(Math.max(right - box.right, box.left - left))} px`);
        break;
      }
    }
    if (el.closest('h1, h2, h3, h4')) {
      const words = /[^\s\-‐]+/g;
      let m: RegExpExecArray | null;
      while ((m = words.exec(node.textContent ?? ''))) {
        const w = document.createRange();
        w.setStart(node, m.index);
        w.setEnd(node, m.index + m[0].length);
        const lines = new Set([...w.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)));
        if (lines.size > 1) out.broken.push(`${label(el, text)} : « ${m[0]} » coupé`);
      }
    }
  }
  return out;
}

'use client';

import { useEffect } from 'react';

/**
 * Tabelas largas (`.table-wrap`) só mostram a barra de rolagem horizontal
 * embaixo do próprio conteúdo — com muitas linhas, ela fica fora da tela.
 * Este componente cria uma barra "fantasma" fixa no rodapé da viewport,
 * sincronizada com o scroll real, sempre que a barra nativa não estiver visível.
 */
export default function StickyScrollbars() {
  useEffect(() => {
    const GHOST_CLASS = 'sticky-hscroll';
    const registry = new Map<
      HTMLElement,
      { ghost: HTMLDivElement; inner: HTMLDivElement; syncing: boolean }
    >();

    function isInsideModal(el: HTMLElement) {
      return el.closest('.modal-card') !== null;
    }

    function ensureGhost(wrap: HTMLElement) {
      if (registry.has(wrap)) return registry.get(wrap)!;
      const ghost = document.createElement('div');
      ghost.className = GHOST_CLASS;
      const inner = document.createElement('div');
      ghost.appendChild(inner);
      document.body.appendChild(ghost);

      let syncingFromWrap = false;
      let syncingFromGhost = false;

      ghost.addEventListener('scroll', () => {
        if (syncingFromWrap) return;
        syncingFromGhost = true;
        wrap.scrollLeft = ghost.scrollLeft;
        syncingFromGhost = false;
      });
      wrap.addEventListener('scroll', () => {
        if (syncingFromGhost) return;
        syncingFromWrap = true;
        ghost.scrollLeft = wrap.scrollLeft;
        syncingFromWrap = false;
      });

      const entry = { ghost, inner, syncing: false };
      registry.set(wrap, entry);
      return entry;
    }

    function removeGhost(wrap: HTMLElement) {
      const entry = registry.get(wrap);
      if (entry) {
        entry.ghost.remove();
        registry.delete(wrap);
      }
    }

    function update() {
      for (const wrap of Array.from(registry.keys())) {
        if (!document.body.contains(wrap)) removeGhost(wrap);
      }

      const wraps = Array.from(document.querySelectorAll<HTMLElement>('.table-wrap'));
      const ativos = new Set<HTMLElement>();

      for (const wrap of wraps) {
        if (isInsideModal(wrap)) continue;
        const overflow = wrap.scrollWidth - wrap.clientWidth > 2;
        if (!overflow) continue;

        const rect = wrap.getBoundingClientRect();
        const nativeScrollbarVisible = rect.bottom <= window.innerHeight && rect.bottom >= 0;
        const tableVisible = rect.top < window.innerHeight && rect.bottom > 0;

        if (!tableVisible || nativeScrollbarVisible) continue;

        ativos.add(wrap);
        const { ghost, inner } = ensureGhost(wrap);
        const left = Math.max(rect.left, 0);
        const width = Math.min(rect.right, window.innerWidth) - left;
        ghost.style.left = `${left}px`;
        ghost.style.width = `${width}px`;
        inner.style.width = `${wrap.scrollWidth}px`;
        if (ghost.scrollLeft !== wrap.scrollLeft) ghost.scrollLeft = wrap.scrollLeft;
        ghost.style.display = 'block';
      }

      for (const wrap of Array.from(registry.keys())) {
        if (!ativos.has(wrap)) {
          const entry = registry.get(wrap)!;
          entry.ghost.style.display = 'none';
        }
      }
    }

    let raf = 0;
    function scheduleUpdate() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    }

    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('scroll', scheduleUpdate, true);
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', scheduleUpdate, true);
      window.removeEventListener('resize', scheduleUpdate);
      if (raf) cancelAnimationFrame(raf);
      for (const wrap of Array.from(registry.keys())) removeGhost(wrap);
    };
  }, []);

  return null;
}

/**
 * Node record modal. Same material as /nodos/<id>, without leaving the home
 * page. The plan gallery comes from nodes.json (real paths now, no base64).
 * The shared HTML fragments live in lib/node-render.ts, alongside the ones
 * NodeDetail.astro renders at build time for the static node page — one
 * source for both, so an escaping fix or a markup change can't drift.
 */
import { asset, byId, galleryLabel, nodeById } from '../lib/data';
import { DOM } from '../lib/dom-ids';
import { escapeHtml as esc } from '../lib/escape-html';
import type { Locale } from '../i18n/ui';
import {
  renderActionLinks,
  renderAreaTag,
  renderMigStrip,
  renderOltTable,
  renderTownsBlock,
} from '../lib/node-render';
import { registerPlanSet } from './lightbox';
import { openWalk } from './walk';

/* properties, not method shorthand: main.ts, map.ts and tour.ts all take
   `openNode` off this object and call it on its own, which is exactly what
   method syntax would be warning about */
export interface ModalApi {
  openNode: (id: string, view?: number) => void;
  closeModal: () => void;
}

/** Wires the modal shell rendered by NodeModal.astro (#modalBg and its
 *  children). Call once; the returned openNode/closeModal are also what
 *  map.ts and tour.ts need to open a node record from the map or the tour. */
export function initModal(): ModalApi {
  /* Layout.astro stamps <html lang> at build time per page; node-render.ts's
     functions run at build time (NodeDetail.astro) and here at runtime, so
     they take locale as a plain argument rather than reading the DOM
     themselves — this is the one place on the client side that resolves it. */
  const locale: Locale = document.documentElement.lang === 'en' ? 'en' : 'es';
  /* astro:i18n's getRelativeLocaleUrl isn't available in a plain client
     script, but prefixDefaultLocale:false means the English prefix is always
     exactly "en/" appended after BASE_URL — see astro.config.mjs's i18n
     block. Composing it this way (rather than hardcoding "/en/") keeps this
     correct if the site's base path ever moves again. */
  const base = locale === 'en' ? `${import.meta.env.BASE_URL}en/` : import.meta.env.BASE_URL;
  const mBg = document.getElementById(DOM.modalBg)!;
  /* The record's hero is one <img> swapping through a gallery behind its
     tabs, so the DOM cannot describe the set the way the node page's grid
     can. Hand the lightbox the whole gallery, and let its arrows drive the
     tabs so closing leaves the record on the plan you ended up at. */
  const heroLink = document.getElementById(DOM.mImgLink) as HTMLAnchorElement;
  registerPlanSet(heroLink, () => {
    const n = openId ? byId[openId] : null;
    return {
      plans: (n?.gallery ?? []).map((g) => ({
        src: asset(g.src),
        caption: `${galleryLabel(g.label, locale)} · ${n!.name}`,
      })),
      index: shownView,
      onChange: (i: number) => {
        if (openId) openNode(openId, i);
      },
    };
  });
  const homeHref = location.href;
  const nodePrefix = `${base}nodos/`;
  let openId: string | null = null;
  /** which gallery tab the record is showing, for the lightbox to open at */
  let shownView = 0;

  /** id of the node whose permalink the current path names, or null. */
  function idFromPath(path: string): string | null {
    if (!path.startsWith(nodePrefix)) return null;
    const id = path.slice(nodePrefix.length).replace(/\/$/, '');
    return id && byId[id] ? id : null;
  }

  function render(id: string, view = 0) {
    /* locale-resolved: enclosure/extra/townsNote/ponGroups.note/OLT notes are
       nested {es,en} on disk, so the modal needs this node's own translation
       rather than the Spanish-default byId lookup other call sites use. */
    const n = nodeById(id, locale);
    if (!n) return;
    const gallery = n.gallery;
    view = Math.min(view, gallery.length - 1);
    const img = document.getElementById(DOM.mImg) as HTMLImageElement;
    shownView = view;
    const shot = gallery[view]!;
    img.src = asset(shot.src);
    img.width = shot.w;
    img.height = shot.h;
    /* the alt doubles as the full-size view's caption, so it names the plan
       and its node rather than staying the generic placeholder */
    img.alt = `${galleryLabel(shot.label, locale)} · ${n.name}`;
    (document.getElementById(DOM.mImgLink) as HTMLAnchorElement).href = asset(shot.src);
    document.getElementById(DOM.mBadge)!.style.display = view > 0 ? 'block' : 'none';

    const tabs = document.getElementById(DOM.mTabs)!;
    tabs.innerHTML = '';
    if (gallery.length > 1) {
      gallery.forEach((g, i) => {
        const b = document.createElement('button');
        b.textContent = galleryLabel(g.label, locale);
        if (i === view) b.classList.add('on');
        b.onclick = (e) => {
          e.stopPropagation();
          openNode(id, i);
        };
        tabs.appendChild(b);
      });
    }

    document.getElementById(DOM.mTitle)!.innerHTML = `${esc(n.name)} ${renderAreaTag(n, locale)}`;
    document.getElementById(DOM.mAddr)!.textContent = '📍 ' + n.address;
    document.getElementById(DOM.mEnv)!.textContent = n.enclosure;
    const ex = document.getElementById(DOM.mExtra)!;
    if (n.extra) {
      ex.style.display = 'block';
      ex.textContent = n.extra;
    } else ex.style.display = 'none';

    const pb = document.getElementById(DOM.mPobl)!;
    const townsHtml = renderTownsBlock(n, locale);
    pb.style.display = townsHtml ? 'block' : 'none';
    pb.innerHTML = townsHtml;

    const t = document.getElementById(DOM.mOlt)!;
    const oltHtml = renderOltTable(n, locale);
    t.style.display = oltHtml ? 'table' : 'none';
    t.innerHTML = oltHtml;

    document.getElementById(DOM.mMig)!.innerHTML = renderMigStrip(n, locale);

    const wbtn = document.getElementById(DOM.mWalk)!;
    wbtn.style.display = n.gallery.length > 1 ? 'block' : 'none';
    wbtn.onclick = () => {
      closeModal();
      /* fire and forget: openWalk reports its own failure to load the 3D
         engine, and there is nothing for this handler to do about it */
      void openWalk(n.id);
    };

    document.getElementById(DOM.mActs)!.innerHTML = renderActionLinks(n, '', true, locale);

    /* permalink to the full record, in case someone wants to share it */
    const perma = document.getElementById(DOM.mPerma) as HTMLAnchorElement;
    perma.href = `${base}nodos/${n.id}`;

    mBg.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  /** Opens a node's modal and, unless it's already the open one (a gallery
   *  tab switch), pushes its permalink so the URL bar names what's on
   *  screen and reloading (or sharing the link) lands back on it — the
   *  standalone /nodos/<id> page renders the same material. */
  function openNode(id: string, view = 0) {
    if (!byId[id]) return;
    render(id, view);
    if (openId !== id) history.pushState({}, '', `${base}nodos/${id}`);
    openId = id;
  }

  function closeModal() {
    mBg.classList.remove('open');
    document.body.style.overflow = '';
    if (openId !== null) history.pushState({}, '', homeHref);
    openId = null;
  }

  document.getElementById(DOM.mClose)!.onclick = closeModal;
  mBg.addEventListener('click', (e) => {
    if (e.target === mBg) closeModal();
    /* links to an action are anchors on this very page: close before jumping */
    if ((e.target as HTMLElement).closest('[data-close]')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  /* Back/forward across a pushed node permalink: re-render or hide in
   * place, without pushing a new entry for a navigation that already
   * happened. */
  window.addEventListener('popstate', () => {
    const id = idFromPath(location.pathname);
    if (id) {
      render(id, 0);
      openId = id;
    } else {
      mBg.classList.remove('open');
      document.body.style.overflow = '';
      openId = null;
    }
  });

  return { openNode, closeModal };
}

/**
 * Highlights the header nav link for whichever section is currently in
 * view — on scroll, not just on :hover/:focus-visible, which only react to
 * the pointer. Clicking a link already scrolls the browser there natively,
 * so the same scroll-driven highlight covers both without separate code.
 */
export function initNavSpy() {
  const nav = document.querySelector('nav');
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('nav a[href*="#"]'));
  const pairs = links.flatMap((link) => {
    const id = link.getAttribute('href')?.split('#').pop();
    const section = id ? document.getElementById(id) : null;
    return section ? [{ link, section }] : [];
  });
  if (!nav || !pairs.length) return;

  const setActive = (section: Element) => {
    for (const { link, section: s } of pairs) link.classList.toggle('active', s === section);
  };

  /* The activation band sits just below the sticky nav and stops well short
     of the bottom, so a section counts as "current" once it has scrolled
     under the header rather than only once it fills the whole viewport. */
  const navH = nav.getBoundingClientRect().height;
  const visible = new Set<Element>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      /* Several sections can be in the band at once near a boundary — the
         last one in document order is the one the visitor scrolled to. */
      for (let i = pairs.length - 1; i >= 0; i--) {
        const section = pairs[i]!.section;
        if (visible.has(section)) {
          setActive(section);
          break;
        }
      }
    },
    { rootMargin: `-${navH + 8}px 0px -65% 0px`, threshold: 0 },
  );
  pairs.forEach(({ section }) => observer.observe(section));

  /* A page load that lands directly on a hash (e.g. a nav link followed
     from the node record page) may paint before the observer's first
     callback — set the initial state from the URL so there's no flash of
     nothing highlighted. */
  const hit = pairs.find(({ section }) => `#${section.id}` === location.hash);
  if (hit) setActive(hit.section);
}

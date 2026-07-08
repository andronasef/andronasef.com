// Lenis smooth-scroll + GSAP scroll choreography.
// One Lenis instance for the whole session (survives ClientRouter soft navs).
// Reduced-motion: Lenis is never started and entrances become no-ops — content
// is already visible in CSS, so nothing is gated behind an animation.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reduce =
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis: Lenis | null = null;

function startLenis() {
  if (lenis || reduce) return;
  lenis = new Lenis({
    duration: 1.05,
    easing: (t: number) => 1 - Math.pow(1 - t, 4), // ease-out-quart
    smoothWheel: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (time: number) => {
    lenis?.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

// Hero load timeline — staggered rise. Elements carry [data-hero] and are
// visible by default; this only enhances.
function playHero() {
  const items = gsap.utils.toArray<HTMLElement>('[data-hero]');
  if (!items.length) return;
  if (reduce) {
    gsap.set(items, { clearProps: 'all', opacity: 1, y: 0 });
    return;
  }
  gsap.fromTo(
    items,
    { opacity: 0, y: 22 },
    {
      opacity: 1,
      y: 0,
      duration: 0.85,
      ease: 'power3.out',
      stagger: 0.09,
      delay: 0.05,
    }
  );
}

// Scroll reveals — batch elements with .reveal. Visible by default in CSS;
// GSAP sets the start state only when motion is allowed, then reveals on enter.
function wireReveals() {
  const els = gsap.utils.toArray<HTMLElement>('.reveal');
  if (!els.length || reduce) return;
  els.forEach((el) => {
    gsap.set(el, { opacity: 0, y: 26 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () =>
        gsap.to(el, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }),
    });
  });
}

// Run per page (first load + every ClientRouter navigation).
export function initPage() {
  startLenis();
  // Kill triggers from the previous page before wiring the new DOM.
  ScrollTrigger.getAll().forEach((t) => t.kill());
  playHero();
  wireReveals();
  ScrollTrigger.refresh();
}

// After a ClientRouter swap the browser sets window scroll (0 for a new page,
// the restored offset for history back/forward). Lenis keeps its own stale
// internal offset and would snap the page back on the next frame — so sync it
// to whatever the browser just set.
export function syncScroll() {
  if (!lenis) return;
  lenis.scrollTo(window.scrollY, { immediate: true, force: true });
}

// ---- GSAP page transition (a layered curtain that matches the dark/blue vibe).
// A blue accent panel and a near-black panel sweep up to cover the screen (with
// the terminal logo mark), the page swaps underneath, then they sweep up and
// off to reveal. Replaces Astro's view-transition visuals entirely.
let covered = false;

function panels() {
  const el = document.getElementById('pageTransition');
  if (!el) return null;
  return {
    accent: el.querySelector<HTMLElement>('.pt-accent'),
    dark: el.querySelector<HTMLElement>('.pt-dark'),
    logo: el.querySelector<HTMLElement>('.pt-logo'),
  };
}

// Cover the screen; resolves when fully covered so the swap can happen hidden.
export function coverPage(): Promise<void> {
  const p = panels();
  if (reduce || !p) return Promise.resolve();
  covered = true;
  return new Promise((resolve) => {
    gsap
      .timeline({ onComplete: () => resolve() })
      // y:0 clears the px value GSAP infers from the CSS translateY(100%),
      // so only yPercent drives the panels.
      .set([p.accent, p.dark], { yPercent: 100, y: 0 })
      .set(p.logo, {
        opacity: 0, scale: 1.5, y: 6
      })
      .to(p.accent, { yPercent: 0, duration: 0.5, ease: 'power4.inOut' }, 0)
      .to(p.dark, { yPercent: 0, duration: 0.5, ease: 'power4.inOut' }, 0.08)
      .to(
        p.logo,
        { opacity: 1, scale: 2, y: 0, duration: 0.4, ease: 'power2.out' },
        0.3
      );
  });
}

// Sweep the panels off to reveal the freshly-swapped page. Skips on first load
// (nothing was covered) so it never hides content the user hasn't seen.
export function revealPage() {
  const p = panels();
  if (!p || !covered) return;
  covered = false;
  if (reduce) {
    gsap.set([p.accent, p.dark], { yPercent: 100, y: 0 });
    gsap.set(p.logo, { opacity: 0 });
    return;
  }
  gsap
    .timeline()
    .to(p.logo, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0)
    .to(p.dark, { yPercent: -100, duration: 0.6, ease: 'power4.inOut' }, 0.05)
    .to(p.accent, { yPercent: -100, duration: 0.6, ease: 'power4.inOut' }, 0.14)
    .set([p.accent, p.dark], { yPercent: 100, y: 0 }); // park below for next time
}

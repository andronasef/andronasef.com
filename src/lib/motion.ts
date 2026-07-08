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

// If a soft nav lands mid-page, make sure Lenis is at the right offset.
export function resetScroll() {
  lenis?.scrollTo(0, { immediate: true });
}

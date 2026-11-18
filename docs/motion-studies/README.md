# Family Paws motion study · 2026-11-17

Local interactive prototype: `/docs/motion-studies/2026-11-17.html` on the development server. This documentation artifact is not included in the production build.

Compared two original experiments using the site's existing SVG artwork: paper-cut pieces gathering along curved paths, and orbital weaving. The paper-cut direction was selected: independent internal shapes enter from alternating sides in a short stagger, follow a shallow arc, settle into the icon's own unfolding/snipping/page-turn action, then gently separate near departure. Whole noncircular icons remain upright. No third-party code, dependencies, or artwork were copied.

Research references:

- [Codrops · On-Scroll Shape Morph](https://github.com/codrops/OnScrollShapeMorph): inspiration for scroll-linked shape choreography.
- [Codrops · SVG Path Animations](https://github.com/codrops/OnScrollPathAnimations): inspiration for continuous path changes tied to scrolling.
- [GSAP · Easing visualizer](https://gsap.com/docs/v3/Eases/): timing comparison and the requested exponential-out feel.

Implementation uses the existing requestAnimationFrame timeline and native SVG/CSS. Chapter clicks use exact `easeOutExpo` over one second: rapid launch, long deceleration, exact endpoints. Manual scrolling stays directly reversible. Counters replay over 1.1 seconds whenever at least 20% of the number enters the viewport; leaving cancels/reset, and reduced motion shows the final total immediately. Accessible labels always expose the full total.

## Scrolltide-inspired connected scenes

Owner explicitly authorized changing elements, layouts and design. Public references reviewed: [Scrolltide components](https://www.scrolltide.co/components) (Quarto, Pip, Glowcap, Radish) and [Frostpaw](https://www.scrolltide.co/templates/frostpaw). Adapted the principles into original SVG/CSS: a growing circular chapter window anchored to the reused flower, pet pupils/head lean following its position, and a welcome ensemble of dog/cat/rabbit joined by a drawn trail. No premium prompts, assets or code copied. The chapter-window.html prototype explores forward/reverse exponential reveals; production uses the existing reversible timeline and snapshots in-flight windows for rapid retargeting. Windows paint behind copy and artwork and disappear in static/reduced-motion layouts.

## Current composition correction

The circular-window and floating-miniature experiments were superseded by a quiet stage-aligned wipe. The same boundary now paints dark/cream ink and vector tint locally. Structural icon parts stay attached to hinges/spines; only small accents travel. The hero keeps the dog as its focal point, with all three pets introduced in Experience. Totals use one shared page snapshot and replay only their display. Earlier study files remain historical experiments, not current production behavior.

## Current owner-selected background direction

The final direction is a soft expansion from the scene center in every chapter. It supersedes the intermediate lateral and diagonal wipes. scene-field.ts shares the exact radial field with text/vector paint; inverse screen matrices keep the moon and all rotated icon parts aligned. Middle scenes use related ivory/mist tones. The footer is warm paper with dark ink, and its logo remains unlined on hover.

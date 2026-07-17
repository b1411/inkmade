type GsapBundle = {
  gsap: typeof import('gsap').gsap
  ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger
  SplitText: typeof import('gsap/SplitText').SplitText
}

let pending: Promise<GsapBundle> | null = null

/** Load the editorial motion engine only when an effect is actually mounted. */
export function loadGsap(): Promise<GsapBundle> {
  if (!pending) {
    pending = Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
      import('gsap/SplitText'),
    ]).then(([core, scroll, split]) => {
      const bundle = {
        gsap: core.gsap,
        ScrollTrigger: scroll.ScrollTrigger,
        SplitText: split.SplitText,
      }
      bundle.gsap.registerPlugin(bundle.ScrollTrigger, bundle.SplitText)
      return bundle
    })
  }
  return pending
}

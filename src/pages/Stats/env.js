/**
 * Runtime environment probes.
 *
 * These live outside the component files so that those files export components
 * and nothing else — Fast Refresh only preserves state for modules whose every
 * export is a component, and a single helper exported alongside them silently
 * turns every edit into a full remount.
 */

/**
 * Read live rather than cached. A reader can toggle the OS setting mid-session,
 * and a value captured at module load would keep animating at them afterwards.
 */
export const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const canObserve = () => typeof IntersectionObserver !== 'undefined';

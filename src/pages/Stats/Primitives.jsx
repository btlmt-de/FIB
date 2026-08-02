/**
 * FIB Stats — the component vocabulary.
 *
 * Everything shared across the five views lives here. The rule for what
 * belongs: if two views render it, it goes in this file — so the "save button"
 * problem (the same affordance drawn two different ways on two screens) cannot
 * happen by construction.
 */

import React, {
  useEffect, useLayoutEffect, useRef, useState, useCallback,
} from 'react';
import {
  tokens, RARITY_LABEL, ITEM_TEXTURE_FALLBACK, spriteSize, rarityColor,
} from './tokens.js';
import {
  itemKey, itemLabel, itemTexture, playerName, avatarAt, AVATAR_FALLBACK,
} from './adapter.js';
import { prefersReducedMotion, canObserve } from './env.js';
import { useSeen, usePendingReveal } from './useSeen.js';
import * as f from './format.js';

/* ── Reveal ───────────────────────────────────────────────────────────── */

/**
 * A section that fades up as it scrolls into view.
 *
 * The default render is VISIBLE — see `usePendingReveal`, which owns the rule
 * that an entrance is an override on correct content and never a gate in front
 * of it.
 */
export function Reveal({ as, className = '', children, ...rest }) {
  const Tag = as || 'div';
  const ref = useRef(null);
  usePendingReveal(ref, 'reveal');

  return (
    <Tag ref={ref} className={`fib-reveal ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}

/* ── Numerals ─────────────────────────────────────────────────────────── */

const easeOutQuint = (t) => 1 - (1 - t) ** 5;

/**
 * Counts up from zero the first time it scrolls into view. Once, never again.
 *
 * Reduced motion, a missing observer, or a non-finite value all render the
 * final number immediately: the animation is decoration on top of a number
 * that is always correct, never a precondition for seeing it. Digits are
 * tabular in CSS, so nothing reflows mid-count.
 */
export function Counter({ value, format = f.num, className, ...rest }) {
  const ref = useRef(null);
  const seen = useSeen(ref);
  const done = useRef(false);
  const primed = useRef(false);

  /*
   * React always renders the REAL number. The count-up is a temporary override
   * written straight to the text node, for two reasons.
   *
   * Correctness: the true value is what lives in the DOM by default, so a
   * headless render, a failed effect or a reader with JS disabled all get the
   * statistic rather than a zero. Any re-render restores the truth.
   *
   * Cost: a page carries a dozen of these. Driving 60fps text through setState
   * would re-render every one of them roughly forty times a second, for an
   * animation that changes nothing but a string.
   */
  /*
   * The current props, readable from a stale closure.
   *
   * An effect cleanup runs AFTER the render that superseded it, so a cleanup
   * closing over the old props writes a number React has already replaced. That
   * is not hypothetical: switching a profile from Solo to Duos re-rendered each
   * figure with the duo total, and the previous effect's cleanup then painted
   * the solo total straight back over it — the strip showed 81 matches played
   * where the ledger, which owns no imperative text, correctly showed 15. Every
   * imperative write below goes through here so the DOM can never disagree with
   * the render.
   */
  const latest = useRef({ value, format });
  latest.current = { value, format };

  const settle = useCallback(() => {
    const el = ref.current;
    if (el) el.textContent = latest.current.format(latest.current.value);
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;
    if (prefersReducedMotion() || !canObserve() || !Number.isFinite(value)) return;
    // A hidden tab throttles rAF to a standstill and may never report an
    // intersection, so zeroing the text there would strand every figure on "0"
    // until the reader came back. Only prime what can actually animate.
    if (typeof document !== 'undefined' && document.hidden) return;
    // Zeroed before the browser paints, so the number never flashes at full
    // value and then snaps back to nothing.
    el.textContent = format(0);
    primed.current = true;
    // Deliberately once, on mount: this decides the starting frame, and
    // re-running it on a prop change would restart a finished count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !seen || done.current || !primed.current) return undefined;

    // Same reasoning as above, re-checked at start time: the tab may have been
    // backgrounded between mount and the element scrolling into view.
    if (typeof document !== 'undefined' && document.hidden) {
      done.current = true;
      settle();
      return undefined;
    }

    done.current = true;
    // Whole numbers must stay whole while counting. Interpolating 4471 and
    // handing 1216.896 to a grouping formatter renders "1,216.896", which looks
    // like a bug because it is one.
    const whole = Number.isInteger(value);
    const start = performance.now();

    let raf = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / tokens.motion.count);
      const v = value * easeOutQuint(t);
      el.textContent = format(whole ? Math.round(v) : v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else settle();
    });

    // Backgrounding mid-count stops rAF dead. Without this the figure would sit
    // frozen on a half-counted number for as long as the tab stayed hidden, and
    // still be wrong when the reader returned.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        settle();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      // Interrupted mid-count: land on the real number, never a partial one —
      // and "the real number" is whatever the latest render says, not the value
      // this closure was created with.
      settle();
    };
  }, [seen, value, format, settle]);

  return (
    <span ref={ref} className={className} {...rest}>
      {format(value)}
    </span>
  );
}

/**
 * The module's headline element: a number, what it is, and — wherever there is
 * a field to compare against — where it sits in that field.
 *
 * `unit` renders at 0.42em beside the value rather than folded into it, so
 * "68 %" and "1.2 M" keep their digits at full display weight.
 */
export function Figure({
  value, format = f.num, label, unit, note, size = 'md', tone,
  fill, fillTone, count = true, gaugeLabel,
}) {
  const numeric = Number.isFinite(value);
  return (
    <div className="fib-figure" data-size={size} data-tone={tone}>
      <div className="fib-figure-value">
        {numeric && count
          ? <Counter value={value} format={format} />
          : <span>{numeric ? format(value) : '—'}</span>}
        {unit ? <span className="fib-figure-unit">{unit}</span> : null}
      </div>
      {label ? <div className="fib-figure-label">{label}</div> : null}
      {Number.isFinite(fill) ? (
        <div
          className="fib-gauge"
          data-tone={fillTone ?? tone}
          role="img"
          aria-label={gaugeLabel ?? `${label}: ${Math.round(fill * 100)}% of the best in this field`}
        >
          <i style={{ '--fill': Math.max(0, Math.min(1, fill)) }} />
        </div>
      ) : null}
      {note ? <div className="fib-figure-note">{note}</div> : null}
    </div>
  );
}

export function Delta({ value, suffix = '' }) {
  return (
    <span className="fib-delta" data-dir={f.deltaDir(value)}>
      {f.signed(value)}{suffix}
    </span>
  );
}

/**
 * Rank movement — PLACES gained or lost since last week, not a change in the
 * value beside it.
 *
 * This shipped as a bare `▲ 2` glued to the end of the string "matches won",
 * which reads as two more wins. It counts places. The arrow keeps carrying it
 * visually, but the unit is now stated: spelled out in `verbose` form where
 * there is room (the podium), and always present in the accessible name, so a
 * screen reader never gets an unlabelled triangle.
 */
export function Movement({ value, verbose = false }) {
  const m = f.movement(value);
  const flat = m.dir === 'flat';
  const noun = Math.abs(value) === 1 ? 'place' : 'places';

  return (
    <span className="fib-delta" data-dir={m.dir}>
      <span className="fib-sr">{flat ? 'No change in rank this week' : `${m.label} this week`}</span>
      {/* The arrow is redundant once the phrase is spelled out for the flat
          case — "— no change" says the same thing twice. */}
      {flat && verbose ? null : <span aria-hidden="true">{m.text}</span>}
      {verbose ? (
        <span className="fib-delta-unit" aria-hidden="true">
          {flat ? 'no change this week' : `${noun} this week`}
        </span>
      ) : null}
    </span>
  );
}

/* ── Objects ──────────────────────────────────────────────────────────── */

/**
 * An item sprite in its well.
 *
 * Display size snaps to an exact integer downscale of the 128px source —
 * nearest-neighbour at a fractional ratio drops source pixels unevenly and
 * makes pixel art look chewed. `width`/`height` are always set, so the well
 * never collapses and reflows when the image lands.
 */
/** Match-phase key → its colour token, for the well's phase bleed. */
const PHASE_VAR = {
  EARLY: 'var(--fib-phase-early)',
  MID: 'var(--fib-phase-mid)',
  LATE: 'var(--fib-phase-late)',
};

export function Sprite({ name, size = 32, pad = 8, className = '', title, tier, phase }) {
  const px = spriteSize(size);
  /*
   * `tier` puts the rarity on the rim of the well, the same way an inventory
   * slot does. One pattern, so a Legendary pull looks Legendary wherever it is
   * shown rather than only where someone remembered to add a badge.
   *
   * `phase` (EARLY/MID/LATE) bleeds the item's match phase up from the floor of
   * the well in green/yellow/red — the same code the item index uses. It sits
   * on a different axis from rarity, so a scarce EARLY item shows both.
   */
  return (
    <div
      className={`fib-well ${className}`.trim()}
      data-tier={tier || undefined}
      data-phase={phase || undefined}
      style={{
        width: px + pad * 2,
        height: px + pad * 2,
        ...(tier ? { '--tier': rarityColor(tier) } : null),
        ...(phase && PHASE_VAR[phase] ? { '--phase': PHASE_VAR[phase] } : null),
      }}
      title={title ?? itemLabel(name)}
    >
      <ItemImage name={name} size={px} />
    </div>
  );
}

/**
 * Just the sprite, with the remote fallback attached.
 *
 * Split out of `Sprite` so callers that size their own container — the
 * inventory grid sizes slots from the CSS grid, not from a fixed pixel box —
 * get the texture resolution and error handling without re-implementing it.
 */
export function ItemImage({ name, size = 32, className = '', loading = 'lazy' }) {
  const px = spriteSize(size);
  const [failed, setFailed] = useState(false);
  const src = failed
    ? `${ITEM_TEXTURE_FALLBACK}/${itemKey(name)}.png`
    : itemTexture(name);

  return (
    <img
      className={`fib-sprite ${className}`.trim()}
      src={src}
      width={px}
      height={px}
      alt=""
      loading={loading}
      decoding="async"
      draggable={false}
      onError={() => { if (!failed) setFailed(true); }}
    />
  );
}

export function Avatar({ uuid, size = 28, className = '' }) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      className={`fib-avatar ${className}`.trim()}
      src={failed ? AVATAR_FALLBACK : avatarAt(uuid, size * 2)}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => { if (!failed) setFailed(true); }}
    />
  );
}

/**
 * Podium position. Places outside the top three render as a plain numeral.
 *
 * `null` is "there is no standing" — the match replay parks here whenever every
 * competitor is level, which is every scrub before the first item lands. Ranking
 * an undifferentiated field 1 through 7 invents an order, and calling all seven
 * of them first spends the module's rank colour on the absence of a rank; a rule
 * says neither, which is the truth at 0:00.
 */
export function Medal({ place }) {
  const podium = place >= 1 && place <= 3;
  return (
    <span className="fib-medal" data-place={podium ? place : 0}>{place ?? '—'}</span>
  );
}

export function PlayerLink({ uuid, onOpen, size = 24, name }) {
  return (
    <button type="button" className="fib-cell-player" onClick={() => onOpen?.(uuid)}>
      <Avatar uuid={uuid} size={size} />
      <span>{name ?? playerName(uuid)}</span>
    </button>
  );
}

/* ── Controls ─────────────────────────────────────────────────────────── */

/**
 * Segmented control with a sliding indicator.
 *
 * The thumb is measured from the live DOM rather than inferred from label
 * length: the options are words of different widths, and a thumb that guesses
 * is a thumb that is subtly wrong on every second option.
 *
 * ── Why a radiogroup and not a tablist ──
 *
 * This shipped as `role="tablist"` / `role="tab"`, which was wrong twice. There
 * is no tab panel anywhere — scope is a lens on the current view, not a switch
 * between two regions — so the tabs controlled nothing, and every option sat at
 * `tabIndex 0`, so arrow keys did nothing while Tab walked all three. An ARIA
 * tab widget that ignores arrow keys is a broken tab widget.
 *
 * "Pick exactly one of N" is a radio group, and radio groups carry the keyboard
 * contract this control was always pretending to have: one tab stop for the
 * whole set, arrows move the selection, Home/End jump to the ends.
 */
export function Segmented({ options, value, onChange, label }) {
  const wrapRef = useRef(null);
  const thumbRef = useRef(null);

  /*
   * Written to the node directly. The thumb's position is a pure function of
   * layout, so putting it in state would only buy an extra render per click.
   *
   * Measured with getBoundingClientRect, not offsetLeft/offsetWidth, and with
   * no fudge factor. Both mattered:
   *
   *   The old code subtracted 3 from offsetLeft to "account for" the track's
   *   3px padding. It should not have. `offsetLeft` is already measured from
   *   the offsetParent's padding EDGE, and an absolutely-positioned thumb at
   *   `left: 0` resolves against the same edge — the two origins are the same
   *   point, so the correction was pure error. Every thumb sat 3px left of the
   *   label it was highlighting.
   *
   *   offset* are integers. These labels lay out on fractions (58.39px,
   *   92.47px), so rounding added up to another half-pixel of drift and a
   *   thumb slightly narrower than its button. Rects are fractional.
   *
   * The border width is subtracted because the thumb's containing block is the
   * track's padding box while getBoundingClientRect returns border-box
   * coordinates. It is 0 today; this keeps the maths true if that changes.
   *
   * ── Why both axes, and why the size is measured too ──
   *
   * The thumb used to set only `width` and `translateX`, with `top: 3px; bottom:
   * 3px` pinning its height. That silently required the track to be a single
   * line, so the control could not carry more than about four options — which is
   * exactly why the leaderboard's six metrics shipped as a chip row instead,
   * leaving two different controls doing "pick one of N" on one screen.
   *
   * Measuring both axes and both dimensions costs nothing and lets the track
   * wrap, so the same control now scales from three options to eight.
   */
  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const thumb = thumbRef.current;
    const active = wrap?.querySelector('[aria-checked="true"]');
    if (!wrap || !thumb || !active) return;

    const wrapRect = wrap.getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    const cs = getComputedStyle(wrap);
    const bx = parseFloat(cs.borderLeftWidth) || 0;
    const by = parseFloat(cs.borderTopWidth) || 0;

    thumb.style.width = `${rect.width}px`;
    thumb.style.height = `${rect.height}px`;
    thumb.style.transform =
      `translate(${rect.left - wrapRect.left - bx}px, ${rect.top - wrapRect.top - by}px)`;
    thumb.style.opacity = '1';
  }, []);

  useLayoutEffect(() => { measure(); }, [measure, value, options]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !wrapRef.current) return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [measure]);

  /*
   * Arrow keys select AND move focus, which is the radio-group contract: the
   * selection follows the cursor rather than needing a second keypress to
   * commit. Focus is moved imperatively because the newly-checked option is
   * the only one that will still be in the tab order after the re-render.
   */
  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    const at = options.findIndex((o) => o.id === value);
    let next = null;

    if (step) next = (at + step + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    else return;

    e.preventDefault();
    const id = options[next].id;
    if (id !== value) onChange(id);
    wrapRef.current?.querySelectorAll('[role="radio"]')[next]?.focus();
  };

  return (
    <div
      className="fib-seg"
      ref={wrapRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {/* Hidden until measured, so it never flashes at the far left on mount. */}
      <span className="fib-seg-thumb" ref={thumbRef} style={{ opacity: 0 }} aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          /* One tab stop for the whole control: Tab reaches the group, arrows
             move within it. */
          tabIndex={value === o.id ? 0 : -1}
          title={o.hint}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AsyncView({ state, loadingLabel, errorTitle = 'Couldn’t load', notFound, children }) {
  if (state.loading) return <Loading label={loadingLabel} />;

  if (state.error) {
    const is404 = state.error.status === 404;
    if (is404 && notFound) return notFound;
    return (
        <div className="fib-page">
          <Empty
              title={is404 ? 'Not found' : errorTitle}
              action={
                <button type="button" className="fib-btn fib-btn--primary" onClick={() => window.location.reload()}>
                  Try again
                </button>
              }
          >
            {is404
                ? 'That page doesn’t exist, or hasn’t been recorded yet.'
                : 'The stats service didn’t respond. Match results are written server-side the moment a match ends, so they’ll be here when it does.'}
          </Empty>
        </div>
    );
  }

  // Loaded. children is a function of the data, so a view reads its payload without a null-check.
  return children(state.data);
}

/*
 * `Chip` used to live here: a toggle-styled `<button aria-pressed>` that five
 * views reached for whenever they needed "pick one of N" — the leaderboard
 * metric, the item sort, the collection sort, the match mode, the podium scope.
 *
 * It is gone, and that is the point. Every one of those is exactly the job
 * `Segmented` does, so the module was shipping two controls with different
 * shapes, different keyboard behaviour (five tab stops versus one) and different
 * ARIA for one interaction — twice on the leaderboards page, side by side. A
 * reader has no way to learn that a pill and a track behave identically.
 *
 * If a genuine multi-select toggle is ever needed, it is `CheckRow`, not a chip:
 * "some of N" is a checkbox, and the facet rail already uses it.
 */

/**
 * The module's search field.
 *
 * `hotkey` binds `/` to focus it and prints the key in the field, the way every
 * search-first tool a player already uses does. The badge is the point as much as
 * the binding: an accelerator nobody can see is an accelerator nobody uses.
 *
 * Opt-in per call site rather than always-on, because two fields listening for
 * the same key on one view would race. One search per view gets it.
 */
export function Search({ value, onChange, placeholder = 'Search', label, hotkey = false }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!hotkey) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      // Never steal the key from someone typing — including into this very field.
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hotkey]);

  return (
    <label className="fib-search">
      <span className="fib-sr">{label ?? placeholder}</span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hotkey ? <kbd className="fib-search-key" aria-hidden="true">/</kbd> : null}
    </label>
  );
}

/* ── Facets ───────────────────────────────────────────────────────────────
 *
 * A filter rail, the marketplace affordance the module was missing entirely: a
 * 616-item index that could only be sorted three ways and searched by name, so
 * "which late-game items get skipped most" was a question the interface could
 * not be asked.
 *
 * Three pieces, deliberately plain controls. Checkboxes are checkboxes and number
 * inputs are number inputs — a filter rail is the last place to invent an
 * affordance, because a reader has to trust that what they set is what they got.
 */

/** One titled block in the rail. A fieldset, so its legend names its controls. */
export function FacetGroup({ title, children, hint }) {
  return (
    <fieldset className="fib-facet">
      <legend className="fib-facet-title">{title}</legend>
      {hint ? <p className="fib-facet-hint">{hint}</p> : null}
      {children}
    </fieldset>
  );
}

/** A checkbox row with an optional count of what it would leave. */
export function CheckRow({ checked, onChange, children, count, swatch }) {
  return (
    <label className="fib-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {swatch ? <i className="fib-check-swatch" style={{ background: swatch }} aria-hidden="true" /> : null}
      <span className="fib-check-label">{children}</span>
      {count != null ? <span className="fib-meta">{f.num(count)}</span> : null}
    </label>
  );
}

/**
 * A min/max pair, CSFloat's "From / To" shape.
 *
 * Both sides are optional and empty means unbounded, which is why the value is
 * held as a string rather than a number: a half-typed "1" in the min box must not
 * be coerced to a bound the reader did not mean, and clearing the box has to be
 * distinguishable from typing zero.
 */
export function RangeInputs({ min, max, onMin, onMax, suffix, step = 1, low = 'From', high = 'To' }) {
  return (
    <div className="fib-range">
      <label>
        {/* The unit rides on the label rather than inside the box: a suffix inside
            a number input either collides with the spinner or has to suppress it,
            and a number input without its spinner is a text field pretending. */}
        <span>{low}{suffix ? <em>{suffix}</em> : null}</span>
        <input
          type="number" inputMode="numeric" step={step} min={0}
          value={min} onChange={(e) => onMin(e.target.value)} placeholder="0"
        />
      </label>
      <label>
        <span>{high}{suffix ? <em>{suffix}</em> : null}</span>
        <input
          type="number" inputMode="numeric" step={step} min={0}
          value={max} onChange={(e) => onMax(e.target.value)} placeholder="∞"
        />
      </label>
    </div>
  );
}

/**
 * The rail itself. Below the shell's own breakpoint it collapses into a
 * `<details>` — a native disclosure rather than a hand-rolled sheet, so it is
 * keyboard-operable and announces its own state for free. `activeCount` puts the
 * number of live filters in the summary, because a collapsed rail that is
 * silently filtering the list is how a reader concludes the data is broken.
 */
export function FacetRail({ children, activeCount = 0, onClear }) {
  /*
   * `open` is held in state and mirrored back from the element's own toggle.
   *
   * It cannot be a bare `open` attribute: React treats it as controlled, so every
   * re-render would reassert it — and since ticking a facet re-renders, a rail the
   * reader had just closed would spring open under their finger. Reading the
   * element's state back in `onToggle` keeps the two in agreement.
   *
   * The initial value is the breakpoint: open beside the grid on desktop, closed
   * above it on a phone, where a rail that ate the first screenful would be
   * something to scroll past on every visit. Deliberately not re-derived on
   * resize — after first paint the open state belongs to the reader.
   */
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
    return !window.matchMedia('(max-width: 900px)').matches;
  });

  return (
    <details
      className="fib-facet-rail"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <span className="fib-facet-rail-title">Filters</span>
        {activeCount > 0 ? <span className="fib-facet-count">{activeCount}</span> : null}
      </summary>
      <div className="fib-facet-rail-body">
        {children}
        {activeCount > 0 && onClear ? (
          <button type="button" className="fib-btn fib-btn--quiet fib-facet-clear" onClick={onClear}>
            Clear {activeCount === 1 ? 'filter' : `all ${activeCount} filters`}
          </button>
        ) : null}
      </div>
    </details>
  );
}

/* ── Furniture ────────────────────────────────────────────────────────── */

export function Section({ title, sub, aside, children, id }) {
  return (
    <Reveal as="section" className="fib-section" id={id}>
      {(title || aside) && (
        <div className="fib-section-head">
          <div>
            {title ? <h2 className="fib-h1">{title}</h2> : null}
            {sub ? <p>{sub}</p> : null}
          </div>
          {aside}
        </div>
      )}
      {children}
    </Reveal>
  );
}

/* ── Product card (the CSFloat listing shape) ─────────────────────────── */

/**
 * The reusable marketplace card. A tone top-line (rank/rarity/quiet), an object
 * on a lit media band, a title, whatever body the view composes, and a footer.
 * Renders as a <button> when it opens something, a <div> otherwise, so a card
 * that navigates is a real, keyboard-reachable control.
 *
 * `tone` colours the top line and hover border/glow; `glow` overrides the hover
 * bloom colour when it should differ from the tone (rarely needed).
 */
export function PCard({ tone, glow, onClick, media, badge, title, sub, children, foot, ...rest }) {
  const style = {};
  if (tone) style['--pcard-tone'] = tone;
  if (glow) style['--pcard-glow'] = glow;
  const interactive = typeof onClick === 'function';
  const Tag = interactive ? 'button' : 'div';
  return (
    <Tag
      type={interactive ? 'button' : undefined}
      className="fib-pcard"
      style={style}
      onClick={onClick}
      {...rest}
    >
      {media != null ? (
        <div className="fib-pcard-media">
          {badge ? <div className="fib-pcard-badge">{badge}</div> : null}
          {media}
        </div>
      ) : null}
      <div className="fib-pcard-body">
        {title != null ? <div className="fib-pcard-title">{title}</div> : null}
        {sub != null ? <div className="fib-pcard-sub fib-meta">{sub}</div> : null}
        {children}
      </div>
      {foot != null ? <div className="fib-pcard-foot">{foot}</div> : null}
    </Tag>
  );
}

/**
 * A labelled meter for inside a card — the CSFloat "price + bar" rhythm. The
 * fill is clamped and carries an accessible name, and the tone defaults to
 * diamond (a comparison, not a good/bad judgment). `fill` is 0..1.
 */
export function CardMeter({ label, value, fill, tone = 'diamond' }) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(fill) ? fill : 0));
  return (
    <div className="fib-pcard-meter">
      <div className="fib-pcard-meter-head">
        <span className="fib-label">{label}</span>
        {value != null ? <span className="fib-meta">{value}</span> : null}
      </div>
      <div
        className="fib-ramp-track"
        style={{ height: 6, color: `var(--fib-${tone})` }}
        role="img"
        aria-label={value != null ? `${label}: ${value}` : label}
      >
        <i style={{ '--fill': pct }} />
      </div>
    </div>
  );
}

/* ── Rarity ───────────────────────────────────────────────────────────── */

export function RarityTag({ tier }) {
  return (
    <span className="fib-rarity" style={{ color: rarityColor(tier) }}>
      <i aria-hidden="true" />
      {RARITY_LABEL[tier] ?? tier}
    </span>
  );
}

/**
 * The five-tier ramp, one meter per tier, each scaled against the LARGEST tier
 * rather than the total. The whole point of the ramp is that low tiers dwarf
 * high ones; scaling by total would flatten every rare tier into an invisible
 * sliver and hide the only interesting part.
 */
export function RarityRamp({ counts, keys }) {
  const max = Math.max(1, ...keys.map((k) => counts[k] ?? 0));
  return (
    <div className="fib-ramp">
      {keys.map((k) => {
        const n = counts[k] ?? 0;
        return (
          <div className="fib-ramp-row" key={k} style={{ color: rarityColor(k) }}>
            <b>{RARITY_LABEL[k] ?? k}</b>
            <div
              className="fib-ramp-track"
              role="img"
              aria-label={`${RARITY_LABEL[k] ?? k}: ${f.num(n)}`}
            >
              <i style={{ '--fill': n / max }} />
            </div>
            <em>{f.num(n)}</em>
          </div>
        );
      })}
    </div>
  );
}

/* ── States ───────────────────────────────────────────────────────────── */

export function Skeleton({ w = '100%', h = 12, style }) {
  return <div className="fib-skel" style={{ width: w, height: h, ...style }} aria-hidden="true" />;
}

/**
 * Skeletons mirror the geometry of what they replace so nothing shifts when
 * the real content lands. A generic bar stack standing in for a hero is a
 * layout shift waiting to happen.
 */
export function TableSkeleton({ rows = 8, cols = 5 }) {
  return (
    <div style={{ padding: 'var(--fib-space-4)' }} aria-hidden="true">
      <div style={{ display: 'flex', gap: 'var(--fib-space-4)', paddingBottom: 14 }}>
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} w={i === 0 ? '34%' : '14%'} h={10} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 'var(--fib-space-4)', padding: '11px 0' }}>
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} w={c === 0 ? '34%' : '14%'} h={c === 0 ? 20 : 12} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Loading({ label = 'Loading statistics' }) {
  return (
    <div className="fib-page">
      <span className="fib-sr" role="status">{label}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--fib-space-5)' }}>
        <Skeleton w="240px" h={28} />
        <div className="fib-panel fib-panel--flush"><TableSkeleton rows={8} cols={5} /></div>
      </div>
    </div>
  );
}

/**
 * Empty states teach the interface rather than announcing absence: what the
 * thing is, why it is empty, and what fills it.
 */
export function Empty({ title, children, action }) {
  return (
    <div className="fib-empty">
      <b>{title}</b>
      {typeof children === 'string' ? <p>{children}</p> : children}
      {action}
    </div>
  );
}


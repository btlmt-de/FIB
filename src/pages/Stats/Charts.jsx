/**
 * FIB Stats — charts.
 *
 * Hand-built SVG rather than a charting library, for two reasons. The obvious
 * one is that default library styling is instantly recognisable and would sit
 * outside this design system. The less obvious one is that every chart here is
 * small and specific — a score trend, a race — and a general-purpose library
 * costs more in bundle size and configuration than the geometry costs to write.
 *
 * All of them render at MEASURED pixel width rather than scaling a fixed
 * viewBox. Scaling a viewBox scales the type with it, so a chart in a narrow
 * column ends up with 6px axis labels. Measuring keeps every label at its
 * designed size at every width.
 */

import React, { useEffect, useId, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { tokens } from './tokens.js';
import { prefersReducedMotion } from './env.js';
import { usePendingReveal } from './useSeen.js';
import * as f from './format.js';

/** Container width in CSS pixels, tracked live. */
function useWidth(ref, fallback = 720) {
  const [w, setW] = useState(fallback);

  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const measure = () => setW(ref.current?.clientWidth || fallback);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref, fallback]);

  return w;
}

/**
 * Draws a path on first render by animating its dash offset.
 *
 * Uses the path's own measured length, so the reveal takes the same time
 * regardless of how long the line is. Skipped entirely under reduced motion,
 * where the path is simply present.
 */
function useDraw(ref, deps = []) {
  useEffect(() => {
    const path = ref.current;
    if (!path || prefersReducedMotion() || typeof path.getTotalLength !== 'function') return;
    const len = path.getTotalLength();
    if (!len) return;
    path.style.transition = 'none';
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    // Force a style flush so the transition below actually has a start value.
    void path.getBoundingClientRect();
    path.style.transition = `stroke-dashoffset 900ms ${tokens.motion.ease}`;
    path.style.strokeDashoffset = '0';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const linePath = (pts) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

/* ── Score trend ──────────────────────────────────────────────────────── */

/**
 * A player's score across their recent matches, oldest to newest.
 *
 * Wins are marked gold; the dim horizontal line is the player's mean, which is
 * what turns a wiggly line into an answer to "am I improving". Without the
 * mean, a trend chart is decoration.
 */
export function ScoreTrend({ points, height = 190, label = 'Score per match' }) {
  const wrapRef = useRef(null);
  const pathRef = useRef(null);
  const width = useWidth(wrapRef);

  const pad = { top: 16, right: 14, bottom: 24, left: 40 };
  const innerW = Math.max(10, width - pad.left - pad.right);
  const innerH = Math.max(10, height - pad.top - pad.bottom);

  const geometry = useMemo(() => {
    if (!points?.length) return null;
    const values = points.map((p) => p.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    // A flat series would otherwise divide by zero and collapse to the axis.
    const span = max - min || Math.max(1, max || 1);
    const lo = Math.max(0, min - span * 0.15);
    const hi = max + span * 0.15;

    const x = (i) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = (v) => pad.top + innerH - ((v - lo) / (hi - lo)) * innerH;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    return {
      pts: points.map((p, i) => ({ ...p, x: x(i), y: y(p.value) })),
      meanY: y(mean),
      mean, lo, hi,
    };
  }, [points, innerW, innerH, pad.left, pad.top]);

  useDraw(pathRef, [geometry?.pts?.length, width]);

  if (!geometry) return null;
  const { pts, meanY, mean, lo, hi } = geometry;

  const areaD = `${linePath(pts)} L${pts[pts.length - 1].x.toFixed(1)} ${pad.top + innerH} L${pts[0].x.toFixed(1)} ${pad.top + innerH} Z`;

  return (
    <div ref={wrapRef}>
      <svg
        className="fib-chart"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label}. ${pts.length} matches, from ${f.num(pts[0].value)} to ${f.num(pts[pts.length - 1].value)}, average ${f.num(Math.round(mean))}.`}
      >
        <defs>
          <linearGradient id="fib-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--fib-diamond)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--fib-diamond)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[lo, (lo + hi) / 2, hi].map((v, i) => {
          const y = pad.top + innerH - ((v - lo) / (hi - lo)) * innerH;
          return (
            <g key={i}>
              <line className="grid" x1={pad.left} x2={width - pad.right} y1={y} y2={y} />
              <text x={pad.left - 8} y={y + 3} textAnchor="end">{f.num(Math.round(v))}</text>
            </g>
          );
        })}

        <path className="area" d={areaD} fill="url(#fib-trend-fill)" />

        {/* The mean, dashed, behind the trace. */}
        <line
          className="trace trace--dim"
          x1={pad.left} x2={width - pad.right} y1={meanY} y2={meanY}
          strokeDasharray="3 4"
        />
        <text x={width - pad.right} y={meanY - 6} textAnchor="end">
          avg {f.num(Math.round(mean))}
        </text>

        <path
          ref={pathRef}
          className="trace"
          d={linePath(pts)}
          stroke="var(--fib-diamond)"
        />

        {pts.map((p, i) => (
          <circle
            key={i}
            className="dot"
            cx={p.x} cy={p.y} r={p.won ? 4 : 2.5}
            fill={p.won ? 'var(--fib-gold)' : 'var(--fib-diamond)'}
          >
            <title>{`${p.label ?? `Match ${i + 1}`}: ${f.num(p.value)}${p.won ? ' — won' : ''}`}</title>
          </circle>
        ))}
      </svg>

      {/*
        The swatch carries the series colour; the label stays at reading ink.
        Tinting the label too put "Career average" on `trace-dim` — a value with
        a 3:1 floor because it describes a LINE, not text — and it measured
        3.08:1 as a word.
      */}
      <ul className="fib-chart-legend">
        <li><i style={{ background: 'var(--fib-gold)' }} />Match won</li>
        <li><i style={{ background: 'var(--fib-diamond)' }} />Score</li>
        <li><i style={{ background: 'var(--fib-trace-dim)' }} />Career average</li>
      </ul>
    </div>
  );
}

/* ── Sparkline ────────────────────────────────────────────────────────── */

/** Inline trend, no axes. Used in table rows where a full chart would shout. */
export function Sparkline({ values, width = 88, height = 24, tone = 'var(--fib-ink-3)' }) {
  if (!values?.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / Math.max(1, values.length - 1)) * (width - 2) + 1,
    y: height - 2 - ((v - min) / span) * (height - 4),
  }));

  return (
    <svg className="fib-chart" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path className="trace" d={linePath(pts)} stroke={tone} strokeWidth="1.5" />
    </svg>
  );
}

/* ── Race trace ───────────────────────────────────────────────────────── */

/**
 * Cumulative score against match time, one lane per competitor.
 *
 * Score is a step function — you gain a point at the instant an item is
 * collected — so this draws steps rather than interpolating between events.
 * Interpolation would imply a player was on 3.5 items at some moment, which is
 * not a thing that can happen.
 *
 * Lanes carry both a colour and a dash pattern, so colour is never the only
 * differentiator.
 *
 * Three optional layers, all cheap and all meaningful:
 *
 *   markers   lead-change timestamps, ticked on the time axis — "when it
 *             turned" is the most useful landmark on the chart.
 *   onScrub   pointer movement over the chart becomes a live time preview.
 *             Pointer-only by design: the range input next to the chart stays
 *             the precise, keyboard-operable control.
 *   iconFor   a node per legend entry (avatar chips), so a name in the legend
 *             is visibly the same competitor as a lane on the track.
 */
const DASHES = ['', '6 3', '2 3', '10 3 2 3', '4 2', '8 4', '1 3', '12 3'];

export function RaceTrace({ entries, duration, height = 260, cursor, labelFor, iconFor, markers = [], onScrub }) {
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef);

  const pad = { top: 14, right: 16, bottom: 26, left: 40 };
  const innerW = Math.max(10, width - pad.left - pad.right);
  const innerH = Math.max(10, height - pad.top - pad.bottom);

  const maxScore = Math.max(1, ...entries.map((e) => e.events.length));
  const x = (t) => pad.left + (Math.min(t, duration) / Math.max(1, duration)) * innerW;
  const y = (s) => pad.top + innerH - (s / maxScore) * innerH;

  const stepPath = (entry) => {
    let d = `M${pad.left.toFixed(1)} ${y(0).toFixed(1)}`;
    entry.events.forEach((ev, i) => {
      d += ` L${x(ev.t).toFixed(1)} ${y(i).toFixed(1)} L${x(ev.t).toFixed(1)} ${y(i + 1).toFixed(1)}`;
    });
    const last = entry.events.length;
    d += ` L${x(duration).toFixed(1)} ${y(last).toFixed(1)}`;
    return d;
  };

  const ticks = 4;

  const handleMove = onScrub
    ? (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const t = ((e.clientX - rect.left - pad.left) / innerW) * duration;
        onScrub(Math.round(Math.max(0, Math.min(duration, t))));
      }
    : undefined;

  return (
    <div ref={wrapRef}>
      <svg
        className="fib-chart"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Score over time for ${entries.length} competitors across ${f.duration(duration)}.`}
        data-scrubbable={onScrub ? 'true' : undefined}
        onPointerMove={handleMove}
        onPointerLeave={onScrub ? () => onScrub(null) : undefined}
      >
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const s = Math.round((maxScore / ticks) * i);
          return (
            <g key={i}>
              <line className="grid" x1={pad.left} x2={width - pad.right} y1={y(s)} y2={y(s)} />
              <text x={pad.left - 8} y={y(s) + 3} textAnchor="end">{s}</text>
            </g>
          );
        })}

        {Array.from({ length: 5 }, (_, i) => {
          const t = (duration / 4) * i;
          return (
            <text key={i} x={x(t)} y={height - 8} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}>
              {f.clock(t)}
            </text>
          );
        })}

        <line className="axis" x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + innerH} />

        {/* Lead changes, ticked along the base of the track. */}
        {markers.map((t) => (
          <line key={t} className="tick" x1={x(t)} x2={x(t)} y1={pad.top + innerH - 5} y2={pad.top + innerH + 5} />
        ))}

        {entries.map((entry, i) => (
          <path
            key={entry.key}
            className="trace"
            d={stepPath(entry)}
            stroke={`var(--fib-race-${i % 8})`}
            strokeDasharray={DASHES[i % DASHES.length] || undefined}
            opacity={cursor == null ? 1 : 0.9}
          />
        ))}

        {/* Scrub cursor. Only drawn when the view is actually scrubbing. */}
        {cursor != null ? (
          <line
            className="axis"
            x1={x(cursor)} x2={x(cursor)} y1={pad.top} y2={pad.top + innerH}
            stroke="var(--fib-ink-2)" strokeWidth="1" strokeDasharray="2 3"
          />
        ) : null}
      </svg>

      <ul className="fib-chart-legend">
        {entries.map((entry, i) => (
          <li key={entry.key}>
            <i style={{ height: 2, background: `var(--fib-race-${i % 8})` }} />
            {iconFor ? iconFor(entry) : null}
            <span>{labelFor ? labelFor(entry) : entry.key}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Race miniature ───────────────────────────────────────────────────── */

/**
 * The race compressed to a band: no axes, no numbers, just the shape of the
 * fight — lanes, lead-change ticks, and a dot per lane at the finish line so
 * the final order reads on the right edge. Used where the race is an
 * invitation (the featured match on the overview) rather than the subject.
 *
 * ── The draw ──
 *
 * The band runs itself once, left to right, when it scrolls into view. The
 * featured card's copy promises the reader they can "watch it unfold"; before
 * this it was a finished picture and the sentence was writing a cheque the
 * chart did not cash.
 *
 * It is ONE wipe across the whole lane group, not a per-lane stroke-dashoffset
 * draw. That distinction is the whole reason this reads as a race: the x axis
 * is match time, and a dash draw advances along each path's own LENGTH. A lane
 * with thirty items has more vertical segments than one with twenty, so at the
 * halfway point of its own length it sits at a different moment of the match —
 * the lanes would desynchronise and the picture would be a lie. A single wipe
 * is linear in x, so every lane is revealed at the same instant on the clock,
 * and overtakes happen on screen exactly when they happened in the match.
 *
 * The baseline is deliberately outside the clip: the track exists before the
 * race runs along it.
 */
export function RaceMini({ entries, duration, height = 132, markers = [], label = 'Score over time' }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const width = useWidth(wrapRef);
  usePendingReveal(svgRef, 'wipe');

  /* Colons are legal in an id but not in a url(#…) reference without escaping,
     and React's generated ids contain them. */
  const clipId = `fib-wipe-${useId().replace(/:/g, '')}`;

  const pad = { top: 10, right: 12, bottom: 12, left: 6 };
  const innerW = Math.max(10, width - pad.left - pad.right);
  const innerH = Math.max(10, height - pad.top - pad.bottom);

  const maxScore = Math.max(1, ...entries.map((e) => e.events.length));
  const x = (t) => pad.left + (Math.min(t, duration) / Math.max(1, duration)) * innerW;
  const y = (s) => pad.top + innerH - (s / maxScore) * innerH;

  const stepPath = (entry) => {
    let d = `M${pad.left.toFixed(1)} ${y(0).toFixed(1)}`;
    entry.events.forEach((ev, i) => {
      d += ` L${x(ev.t).toFixed(1)} ${y(i).toFixed(1)} L${x(ev.t).toFixed(1)} ${y(i + 1).toFixed(1)}`;
    });
    const last = entry.events.length;
    d += ` L${x(duration).toFixed(1)} ${y(last).toFixed(1)}`;
    return d;
  };

  return (
    <div ref={wrapRef}>
      <svg
        ref={svgRef}
        className="fib-chart"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label} for ${entries.length} competitors across ${f.duration(duration)}.`}
      >
        <defs>
          <clipPath id={clipId}>
            {/* Collapses to its own left edge, which sits on t=0. */}
            <rect
              className="fib-wipe-rect"
              x={pad.left}
              y={0}
              width={Math.max(1, width - pad.left)}
              height={height}
            />
          </clipPath>
        </defs>

        {/* The track, always present — the race is drawn along it. */}
        <line className="grid" x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} />

        <g clipPath={`url(#${clipId})`}>
          {markers.map((t) => (
            <line key={t} className="tick" x1={x(t)} x2={x(t)} y1={pad.top + innerH - 4} y2={pad.top + innerH + 4} />
          ))}

          {entries.map((entry, i) => (
            <path
              key={entry.key}
              className="trace"
              d={stepPath(entry)}
              stroke={`var(--fib-race-${i % 8})`}
              strokeWidth="1.6"
              opacity="0.9"
            />
          ))}

          {/* Final order, readable as a column of dots on the finish line. The
              wipe reaches them last, which is when the race is decided. */}
          {entries.map((entry, i) => (
            <circle
              key={`${entry.key}-end`}
              className="enddot"
              cx={x(duration)}
              cy={y(entry.events.length)}
              r="2.6"
              fill={`var(--fib-race-${i % 8})`}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

/* ── Distribution ─────────────────────────────────────────────────────── */

/**
 * Horizontal ranked bars — used for "most collected items" and anywhere a
 * ranked magnitude comparison beats a table. Bars are scaled to the largest
 * value, and the label sits outside the bar so it stays legible when the bar
 * is short.
 */
export function RankedBars({ rows, tone = 'var(--fib-ink-3)', format = f.num, max: maxProp }) {
  const max = maxProp ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r) => (
        <div
          key={r.key}
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 'var(--fib-space-3)', alignItems: 'center' }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 'var(--fib-text-sm)', marginBottom: 5,
            }}>
              {r.icon}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.label}
              </span>
            </div>
            <div className="fib-ramp-track" style={{ height: 6, color: r.tone ?? tone }}>
              <i style={{ '--fill': r.value / max }} />
            </div>
          </div>
          <em style={{
            fontFamily: 'var(--fib-font-mono)', fontStyle: 'normal',
            fontSize: 'var(--fib-text-sm)', fontVariantNumeric: 'tabular-nums',
            color: 'var(--fib-ink-2)',
          }}>
            {format(r.value)}
          </em>
        </div>
      ))}
    </div>
  );
}

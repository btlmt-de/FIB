import React from 'react';
import Swords       from 'lucide-react/dist/esm/icons/swords';
import Zap          from 'lucide-react/dist/esm/icons/zap';
import Trophy       from 'lucide-react/dist/esm/icons/trophy';
import SkipForward  from 'lucide-react/dist/esm/icons/skip-forward';
import ScanSearch   from 'lucide-react/dist/esm/icons/scan-search';
import Split        from 'lucide-react/dist/esm/icons/split';
import Brain        from 'lucide-react/dist/esm/icons/brain';
import Link         from 'lucide-react/dist/esm/icons/link';
import Footer from "../components/common/Footer.jsx";

/* ─────────────────────────────────────
   Textures — same source as ItemPoolManager / ForceItemPools
───────────────────────────────────── */
const IMG_BASE  = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';
const fib       = (m) => `${IMG_BASE}/${String(m).toLowerCase()}.png`;
const BARRIER   = `${IMG_BASE}/barrier.png`;
const onImgErr  = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = BARRIER; };
const itemLabel = (m) => String(m).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const Sprite = ({ item, size = 20, dim = false }) => (
    <img
        src={fib(item)} alt={itemLabel(item)} onError={onImgErr}
        style={{ width: size, height: size, imageRendering: 'pixelated', flexShrink: 0, display: 'block', opacity: dim ? 0.4 : 1 }}
    />
);

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');

  .gp {
    font-family: 'Barlow', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: oklch(17% 0.025 255);
    color: oklch(94% 0.007 255);
    min-height: 100vh; display: flex; flex-direction: column;
  }
  .gp-rule  { height: 1px; background: oklch(22% 0.022 255); }
  .gp-shell { max-width: 1080px; margin: 0 auto; padding: 0 28px; width: 100%; box-sizing: border-box; }

  /* ── Header ── */
  .gp-header { padding: 80px 0 64px; }
  .gp-eyebrow {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;
    color: oklch(76% 0.16 68); margin: 0 0 14px;
  }
  .gp-h1 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(44px, 6.5vw, 76px); font-weight: 800;
    line-height: 0.95; letter-spacing: -0.5px; text-transform: uppercase;
    color: oklch(94% 0.007 255); margin: 0 0 18px;
  }
  .gp-sub { font-size: 16px; color: oklch(52% 0.012 255); max-width: 480px; line-height: 1.75; margin: 0 0 28px; }

  /* ── Section shared ── */
  .gp-section { padding: 72px 0; }
  .gp-section-layout {
    display: grid; grid-template-columns: 260px 1fr;
    gap: 0 64px; align-items: start;
  }
  @media (max-width: 760px) { .gp-section-layout { grid-template-columns: 1fr; gap: 28px 0; } }

  .gp-label { position: sticky; top: 32px; }
  .gp-tag {
    display: inline-flex; align-items: center;
    padding: 4px 10px; border-radius: 4px; margin-bottom: 18px;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
  }
  .gp-tag.amber  { background: oklch(76% 0.16 68 / 0.12); border: 1px solid oklch(76% 0.16 68 / 0.30); color: oklch(76% 0.16 68); }
  .gp-tag.green  { background: oklch(64% 0.20 142 / 0.12); border: 1px solid oklch(64% 0.20 142 / 0.30); color: oklch(64% 0.20 142); }
  .gp-tag.purple { background: oklch(65% 0.18 300 / 0.12); border: 1px solid oklch(65% 0.18 300 / 0.28); color: oklch(65% 0.18 300); }
  .gp-tag.blue   { background: oklch(65% 0.16 255 / 0.12); border: 1px solid oklch(65% 0.16 255 / 0.28); color: oklch(65% 0.16 255); }

  .gp-h2 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(26px, 3.5vw, 36px); font-weight: 800;
    text-transform: uppercase; letter-spacing: -0.2px;
    color: oklch(94% 0.007 255); margin: 0 0 14px; line-height: 1.0;
  }
  .gp-label-body { font-size: 13.5px; color: oklch(52% 0.013 255); line-height: 1.72; margin: 0; }

  /* ── Basics 2x2 grid ── */
  .gp-basics {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 1px; background: oklch(24% 0.022 255);
    border-radius: 9px; overflow: hidden; margin-bottom: 16px;
  }
  @media (max-width: 480px) { .gp-basics { grid-template-columns: 1fr; } }
  .gp-basic-tile { background: oklch(20% 0.023 255); padding: 18px 20px; display: flex; align-items: flex-start; gap: 13px; }
  .gp-basic-icon { width: 32px; height: 32px; border-radius: 7px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .gp-basic-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px;
    color: oklch(90% 0.009 255); margin: 0 0 4px; line-height: 1.1;
  }
  .gp-basic-desc { font-size: 12.5px; color: oklch(52% 0.013 255); line-height: 1.55; }

  .gp-flow {
    padding: 14px 18px;
    background: oklch(76% 0.16 68 / 0.07); border: 1px solid oklch(76% 0.16 68 / 0.22);
    border-radius: 8px; font-size: 14px; line-height: 1.72; color: oklch(70% 0.12 68);
  }
  .gp-flow strong { color: oklch(82% 0.14 68); }

  /* ════════════════════════════════════════
     Mode selector + panel — connected unit
  ════════════════════════════════════════ */

  /* Outer container — selector and panel flush-connected */
  .gp-mode-group { display: flex; flex-direction: column; }

  /* ── Selector: 3 cards across the top ── */
  .gp-msel {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    gap: 1px; background: oklch(25% 0.022 255);
    border-radius: 10px 10px 0 0; overflow: hidden;
  }
  .gp-msel-item {
    background: oklch(19.5% 0.023 255);
    padding: 16px 16px 15px;
    cursor: pointer; border: none; text-align: left;
    display: flex; flex-direction: column; gap: 8px;
    position: relative; overflow: hidden;
    transition: background 0.12s ease-out;
  }
  .gp-msel-item:hover:not(.active) { background: oklch(21.5% 0.022 255); }
  .gp-msel-item.active { background: oklch(21% 0.023 255); }

  /* Top accent strip — fades in on active */
  .gp-msel-item::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: var(--mc); opacity: 0;
    transition: opacity 0.15s ease-out;
  }
  .gp-msel-item.active::before { opacity: 1; }

  /* Number — large watermark, dims on inactive */
  .gp-msel-hdr { display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; }
  .gp-msel-num {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 30px; font-weight: 900; letter-spacing: -1.5px; line-height: 1;
    color: oklch(27% 0.019 255);
    transition: color 0.15s ease-out;
  }
  .gp-msel-item.active .gp-msel-num { color: var(--mc); }

  /* Badge */
  .gp-msel-badge {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
    padding: 3px 7px; border-radius: 3px;
    background: oklch(23% 0.022 255);
    border: 1px solid oklch(27% 0.019 255);
    color: oklch(38% 0.012 255);
    white-space: nowrap;
    transition: background 0.15s ease-out, color 0.15s ease-out, border-color 0.15s ease-out;
  }
  .gp-msel-item.active .gp-msel-badge {
    background: var(--mc-bg); border-color: var(--mc-bd); color: var(--mc);
  }

  /* Identity row: icon + name */
  .gp-msel-identity { display: flex; align-items: center; gap: 7px; }
  .gp-msel-icon { color: oklch(34% 0.012 255); transition: color 0.15s ease-out; flex-shrink: 0; }
  .gp-msel-item.active .gp-msel-icon { color: var(--mc); }
  .gp-msel-name {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 13.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px;
    color: oklch(40% 0.012 255);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    transition: color 0.15s ease-out;
  }
  .gp-msel-item.active .gp-msel-name { color: oklch(88% 0.008 255); }

  /* One-liner hook */
  .gp-msel-hook {
    font-size: 11px; color: oklch(30% 0.011 255); line-height: 1.5; margin: 0;
    transition: color 0.15s ease-out;
  }
  .gp-msel-item.active .gp-msel-hook { color: oklch(46% 0.011 255); }

  @media (max-width: 580px) {
    .gp-msel { grid-template-columns: 1fr; border-radius: 10px 10px 0 0; }
    .gp-msel-hook { display: none; }
    .gp-msel-item { padding: 12px 14px; gap: 6px; }
  }

  /* ── Panel: three stacked zones ── */
  .gp-mpanel {
    background: oklch(20% 0.023 255);
    border: 1px solid oklch(25% 0.022 255);
    border-top: none;
    border-radius: 0 0 10px 10px; overflow: hidden;
  }
  /* Head: mode name + badge — no prose, no alignment tension */
  .gp-mpanel-head {
    padding: 16px 24px;
    border-bottom: 1px solid oklch(24% 0.022 255);
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
  }
  .gp-mpanel-name {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.2px;
    color: oklch(94% 0.007 255); margin: 0; line-height: 1;
  }
  .gp-mpanel-badge {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
    padding: 4px 10px; border-radius: 4px;
    background: var(--mc-bg); border: 1px solid var(--mc-bd); color: var(--mc);
    flex-shrink: 0;
  }
  /* Body: dark, full-width viz */
  .gp-mpanel-body { padding: 26px 24px 24px; background: oklch(17% 0.025 255); }
  /* Foot: key rule accent bar */
  .gp-mpanel-foot {
    padding: 11px 24px;
    background: var(--mc-bg); border-top: 1px solid var(--mc-bd);
    display: flex; align-items: center; gap: 12px;
  }
  .gp-mpanel-foot-lbl {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;
    color: var(--mc); opacity: 0.75; flex-shrink: 0;
  }
  .gp-mpanel-foot-sep { width: 1px; height: 12px; background: var(--mc); opacity: 0.22; flex-shrink: 0; }
  .gp-mpanel-foot-val {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2px;
    color: oklch(82% 0.009 255);
  }

  /* ════════════════════════════════════════
     Shared viz
  ════════════════════════════════════════ */
  .vz-lbl {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;
    color: oklch(34% 0.012 255);
  }

  /* ── FIBViz — full-width scoreboard ── */
  .fib-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .fib-clock {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 14px; font-weight: 700; letter-spacing: 0.5px;
    color: oklch(76% 0.16 68); font-variant-numeric: tabular-nums;
  }
  .fib-tbar-wrap { height: 3px; background: oklch(22% 0.022 255); border-radius: 1.5px; overflow: hidden; margin-bottom: 12px; }
  .fib-tbar-fill { height: 100%; background: oklch(76% 0.16 68 / 0.5); border-radius: 1.5px; }
  .fib-stages { display: flex; gap: 5px; margin-bottom: 20px; }
  .fib-stage {
    padding: 3px 10px; border-radius: 4px;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
    background: oklch(22% 0.022 255); color: oklch(36% 0.012 255);
  }
  .fib-stage.s-mid { background: oklch(76% 0.16 68 / 0.14); color: oklch(76% 0.16 68); }
  /* Single-line player rows — full panel width gives room for everything on one row */
  .fib-players { display: flex; flex-direction: column; gap: 10px; }
  .fib-player  { display: flex; align-items: center; gap: 10px; }
  .fib-rank {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 0.5px; font-variant-numeric: tabular-nums;
    color: oklch(32% 0.012 255); width: 14px; text-align: right; flex-shrink: 0;
  }
  .fib-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .fib-pname {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;
    color: oklch(56% 0.011 255);
    width: 68px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .fib-item-cell { display: flex; align-items: center; gap: 6px; width: 132px; flex-shrink: 0; }
  .fib-iname {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2px;
    color: oklch(42% 0.012 255); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .fib-ptrack { flex: 1; height: 6px; background: oklch(22% 0.022 255); border-radius: 3px; overflow: hidden; }
  .fib-pbar   { height: 100%; border-radius: 3px; }
  .fib-pscore {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1;
    min-width: 28px; text-align: right; flex-shrink: 0;
  }

  /* ── RunBattleViz — full width ── */
  .run-target {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 20px 24px 18px; margin-bottom: 20px;
    background: oklch(19% 0.024 255); border: 1px solid oklch(27% 0.020 255);
    border-radius: 9px; position: relative;
  }
  .run-item-box {
    width: 60px; height: 60px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    background: oklch(23% 0.022 255); border: 1px solid oklch(30% 0.019 255);
  }
  .run-target-name {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 17px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px;
    color: oklch(88% 0.008 255); line-height: 1.1;
  }
  .run-claimed-badge {
    position: absolute; top: 12px; right: 14px;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;
    color: oklch(64% 0.20 142);
    padding: 3px 8px; border-radius: 4px;
    background: oklch(64% 0.20 142 / 0.10); border: 1px solid oklch(64% 0.20 142 / 0.25);
  }
  .run-players { display: flex; flex-direction: column; gap: 6px; }
  .run-player  { display: flex; align-items: center; gap: 10px; border-radius: 6px; padding: 6px 8px; }
  .run-player.winner { background: oklch(64% 0.20 142 / 0.06); }
  .run-pdot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .run-pname {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;
    color: oklch(56% 0.011 255);
    width: 68px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .run-track { flex: 1; height: 8px; background: oklch(22% 0.022 255); border-radius: 4px; overflow: hidden; }
  .run-bar   { height: 100%; border-radius: 4px; }
  .run-check {
    font-size: 10px; color: oklch(64% 0.20 142); flex-shrink: 0; width: 14px; text-align: center;
    font-family: 'Barlow Condensed', system-ui, sans-serif; font-weight: 800;
  }
  .run-pscore {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1;
    min-width: 26px; text-align: right; flex-shrink: 0;
  }

  /* ── ForceChainViz — vertical queue ── */
  .chain-hdr { margin-bottom: 14px; }
  .chain-list {
    display: flex; flex-direction: column;
    border-radius: 9px; overflow: hidden;
    border: 1px solid oklch(25% 0.021 255);
    margin-bottom: 14px;
  }
  .chain-row {
    display: flex; align-items: center; gap: 14px;
    padding: 13px 16px; position: relative;
  }
  .chain-row + .chain-row { border-top: 1px solid oklch(25% 0.021 255); }

  /* Current: blue tint + left accent bar */
  .chain-row-curr { background: oklch(75% 0.12 200 / 0.09); padding-left: 20px; }
  .chain-row-curr::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    background: oklch(75% 0.12 200 / 0.75); border-radius: 0 2px 2px 0;
  }
  /* Next: subtle neutral */
  .chain-row-next { background: oklch(21% 0.023 255); }
  /* Future: dimmest */
  .chain-row-future { background: oklch(19% 0.024 255); }

  /* Sprite box — identical size on every row */
  .chain-spr-box {
    width: 38px; height: 38px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: oklch(17% 0.025 255); border: 1px solid oklch(24% 0.021 255);
  }
  .chain-row-curr .chain-spr-box { border-color: oklch(75% 0.12 200 / 0.24); }

  /* Info: label + name stacked */
  .chain-row-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .chain-row-lbl {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
    color: oklch(34% 0.012 255);
  }
  .chain-row-curr .chain-row-lbl { color: oklch(62% 0.10 200); }
  .chain-row-name {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.1;
  }
  .chain-row-curr   .chain-row-name { color: oklch(90% 0.008 255); }
  .chain-row-next   .chain-row-name { color: oklch(50% 0.009 255); }
  .chain-row-future .chain-row-name { color: oklch(30% 0.010 255); }

  /* Status badge — current row only */
  .chain-row-status {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
    padding: 3px 8px; border-radius: 4px; flex-shrink: 0;
    background: oklch(75% 0.12 200 / 0.12); border: 1px solid oklch(75% 0.12 200 / 0.28);
    color: oklch(75% 0.12 200);
  }

  /* ? in the sprite box for the future slot */
  .chain-future-q {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 20px; font-weight: 900; line-height: 1; color: oklch(28% 0.012 255);
  }
  .chain-hint {
    padding: 10px 14px;
    background: oklch(75% 0.12 200 / 0.06); border: 1px solid oklch(75% 0.12 200 / 0.15);
    border-radius: 7px;
    font-size: 12.5px; color: oklch(48% 0.012 255); line-height: 1.55;
  }
  .chain-hint strong { color: oklch(75% 0.12 200); font-weight: 600; }

  /* ════════════════════════════════════════
     Item Pools section
  ════════════════════════════════════════ */

  /* Timeline bar: three tiers connected by a progress line */
  .pools-timeline {
    display: flex; align-items: center; gap: 0; margin-bottom: 28px;
  }
  .pools-timeline-tier {
    display: flex; align-items: center; gap: 9px;
    flex: 1;
    padding: 11px 14px;
    border-radius: 8px;
    border: 1px solid oklch(25% 0.021 255);
    background: oklch(20% 0.023 255);
  }
  .pools-timeline-connector {
    width: 28px; flex-shrink: 0; height: 1px;
    background: oklch(26% 0.020 255); position: relative;
  }
  .pools-timeline-connector::after {
    content: '›'; position: absolute;
    right: -5px; top: -10px;
    font-size: 13px; color: oklch(28% 0.016 255);
  }
  .pools-tier-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }
  .pools-tier-info { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
  .pools-tier-name {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
  }
  .pools-tier-when {
    font-size: 11px; color: oklch(38% 0.011 255); white-space: nowrap;
  }

  /* Three pool tier cards */
  .pools-tiers {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    gap: 1px; background: oklch(24% 0.022 255);
    border-radius: 10px; overflow: hidden; margin-bottom: 24px;
  }
  @media (max-width: 680px) { .pools-tiers { grid-template-columns: 1fr; } }

  .pools-tier-card {
    background: oklch(20% 0.023 255);
    padding: 18px 18px 16px;
    display: flex; flex-direction: column; gap: 12px;
    border-top: 2px solid var(--tier-color);
  }
  .pools-tier-head { display: flex; align-items: center; justify-content: space-between; }
  .pools-tier-badge {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
    padding: 3px 9px; border-radius: 4px;
    background: var(--tier-bg); border: 1px solid var(--tier-bd); color: var(--tier-color);
  }
  .pools-tier-desc {
    font-size: 12px; color: oklch(46% 0.011 255); line-height: 1.65; margin: 0;
  }

  /* Item grid inside each tier card */
  .pools-item-grid {
    display: flex; flex-wrap: wrap; gap: 6px;
  }
  .pools-item {
    display: flex; align-items: center; gap: 5px;
    padding: 4px 7px 4px 5px;
    background: oklch(17% 0.025 255); border: 1px solid oklch(25% 0.021 255);
    border-radius: 5px;
  }
  /* Tag badge on item — dot only */
  .pools-item-tag {
    width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
    margin-left: 2px;
  }
  .pools-item-name {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2px;
    color: oklch(48% 0.010 255); white-space: nowrap;
  }

  /* Tag legend */
  .pools-tags {
    display: flex; gap: 6px; flex-wrap: wrap;
  }
  .pools-tag-pill {
    display: flex; align-items: center; gap: 7px;
    padding: 7px 12px; border-radius: 7px;
    background: oklch(20% 0.023 255); border: 1px solid oklch(24% 0.021 255);
    flex: 1; min-width: 140px;
  }
  .pools-tag-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .pools-tag-info { display: flex; flex-direction: column; gap: 1px; }
  .pools-tag-name {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
    color: oklch(70% 0.009 255);
  }
  .pools-tier-more {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
    color: oklch(36% 0.011 255); margin-top: 4px; display: block;
  }

  /* Loading skeleton */
  .pools-skeleton { display: flex; flex-wrap: wrap; gap: 6px; }
  .pools-skel-item {
    height: 26px; width: 72px; border-radius: 5px;
    background: oklch(23% 0.021 255);
    animation: pools-pulse 1.4s ease-in-out infinite;
  }
  .pools-skel-item:nth-child(2) { animation-delay: 0.15s; }
  .pools-skel-item:nth-child(3) { animation-delay: 0.3s; width: 58px; }
  .pools-skel-item:nth-child(4) { animation-delay: 0.1s; width: 80px; }
  .pools-skel-item:nth-child(5) { animation-delay: 0.25s; width: 64px; }
  .pools-skel-item:nth-child(6) { animation-delay: 0.4s; width: 54px; }
  @keyframes pools-pulse {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1; }
  }

  /* Footer: tags + link side by side */
  .pools-footer {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
  }
  .pools-tags { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
  .pools-link {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
    color: oklch(76% 0.16 68); text-decoration: none;
    padding: 7px 13px; border-radius: 6px;
    background: oklch(76% 0.16 68 / 0.08); border: 1px solid oklch(76% 0.16 68 / 0.24);
    white-space: nowrap; flex-shrink: 0; align-self: center;
    transition: background 0.12s ease-out, border-color 0.12s ease-out;
  }
  .pools-link:hover { background: oklch(76% 0.16 68 / 0.14); border-color: oklch(76% 0.16 68 / 0.38); }


  .gp-tips { display: flex; flex-direction: column; }
  .gp-tip {
    display: flex; gap: 20px; align-items: flex-start;
    padding: 22px 0; border-top: 1px solid oklch(22% 0.022 255);
  }
  .gp-tip:last-child { border-bottom: 1px solid oklch(22% 0.022 255); }
  .gp-tip-num {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 13px; font-weight: 700; color: oklch(36% 0.015 255); letter-spacing: 1px;
    font-variant-numeric: tabular-nums; flex-shrink: 0; margin-top: 3px; width: 24px; text-align: right;
  }
  .gp-tip-icon { width: 34px; height: 34px; border-radius: 7px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .gp-tip-content { flex: 1; min-width: 0; }
  .gp-tip-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 17px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px;
    color: oklch(90% 0.009 255); margin: 0 0 8px; line-height: 1.1;
  }
  .gp-tip-desc { font-size: 13.5px; color: oklch(54% 0.012 255); line-height: 1.75; margin: 0 0 10px; }
  .gp-tip-bullets { display: flex; flex-direction: column; gap: 7px; list-style: none; margin: 0; padding: 0; }
  .gp-tip-bullet { display: flex; align-items: baseline; gap: 10px; font-size: 13px; color: oklch(58% 0.012 255); line-height: 1.65; }
  .gp-tip-bullet::before { content: '—'; color: oklch(36% 0.015 255); font-size: 11px; flex-shrink: 0; }

  @media (max-width: 600px) {
    .gp-shell { padding: 0 20px; }
    .gp-header { padding: 60px 0 52px; }
    .gp-section { padding: 52px 0; }
  }
`;

/* ─────────────────────────────────────
   Data
───────────────────────────────────── */
const BASICS = [
    { icon: Swords,      color: 'oklch(62% 0.22 25)',  title: 'You get an item',      desc: 'At the start and after each score, the game assigns you a random item. It appears in your HUD.' },
    { icon: ScanSearch,  color: 'oklch(68% 0.12 200)', title: 'Find it in the world', desc: 'Craft, mine, farm, trade, or loot. The game auto-detects it across your inventory, backpack, and bundles.' },
    { icon: Trophy,      color: 'oklch(76% 0.16 68)',  title: 'Score the point',      desc: 'Once detected, you score immediately and receive the next item. The round is continuous.' },
    { icon: SkipForward, color: 'oklch(64% 0.20 142)', title: 'Or use a joker',       desc: 'Stuck on something costly? Spend a joker to skip. You get a limited supply — use them wisely.' },
];

const MODES = [
    {
        icon: Swords, color: 'oklch(62% 0.22 25)', badge: 'Classic',
        name: 'ForceItemBattle',
        hook: 'Collect more items than everyone else before time runs out.',
        desc: 'Every player draws from the same item pool, which progresses through Early, Mid, and Late tiers as the round goes on.',
        mechanic: 'Most items collected when the timer hits zero wins.',
        plays: [
            'All players share the same pool — same items, same order',
            'Pool tier advances on a timer: Early → Mid → Late',
            'Items get harder and rarer as the round progresses',
        ],
    },
    {
        icon: Zap, color: 'oklch(76% 0.16 68)', badge: 'Speed',
        name: 'RunBattle',
        hook: 'First to claim the target item takes the point.',
        desc: 'A single item is active for all players at once. The first to collect it scores — everyone else resets to chase the next one.',
        mechanic: 'Claim it first or walk away with nothing.',
        plays: [
            'One shared target item active at a time for all players',
            'First to collect scores — the item is gone for everyone else',
            'Rewards speed and efficient routing over volume',
        ],
    },
    {
        icon: Link, color: 'oklch(75% 0.12 200)', badge: 'Strategy',
        name: 'ForceChain',
        hook: 'Your next item is always visible — plan two moves ahead.',
        desc: 'You can always see both your current item and the one after it. The best players route for both at once.',
        mechanic: 'Route planning starts before you finish your current item.',
        plays: [
            'Current and next item are both visible at all times',
            'Skilled players plan routes two items ahead',
            'Future items beyond "next" remain hidden',
        ],
    },
];

const TIPS = [
    {
        icon: Split, iconBg: 'oklch(65% 0.16 255 / 0.14)', iconColor: 'oklch(65% 0.16 255)',
        title: 'Split Up Strategically',
        desc: 'In a team, split up in entirely different directions. Covering more biomes means a higher chance of quickly finding whatever item gets assigned.',
    },
    {
        icon: ScanSearch, iconBg: 'oklch(68% 0.12 200 / 0.14)', iconColor: 'oklch(68% 0.12 200)',
        title: 'Use the Back-to-Back Detection System',
        desc: 'ForceItemBattle automatically scans your entire inventory — including backpack, bundles, and shulker boxes — for assigned items.',
        bullets: [
            'If an item in your backpack matches your current objective, it is instantly detected and counted.',
            'The system also scans inside shulker boxes and bundles stored in the backpack or inventory.',
            'Properly using this allows for high-efficiency rounds and potential record scores.',
        ],
    },
    {
        icon: Brain, iconBg: 'oklch(76% 0.16 68 / 0.12)', iconColor: 'oklch(76% 0.16 68)',
        title: 'Master Time Management & Preparation',
        desc: 'There is no single meta strategy, but the strongest players focus on a few fundamentals:',
        bullets: [
            <><strong style={{ color: 'oklch(80% 0.009 255)', fontWeight: 600 }}>Time management:</strong> decide quickly whether it's worth pursuing an item or skipping it.</>,
            <><strong style={{ color: 'oklch(80% 0.009 255)', fontWeight: 600 }}>Smart base placement:</strong> build a compact, well-organised base near diverse biomes or cave systems.</>,
            <><strong style={{ color: 'oklch(80% 0.009 255)', fontWeight: 600 }}>Sorting systems:</strong> keep your inventory and backpack neatly arranged to reduce confusion mid-round.</>,
        ],
        note: 'A good setup often matters more than luck. Players who stay organised and adapt fast consistently outperform those wandering around aimlessly.',
    },
];

/* ─────────────────────────────────────
   Viz components — static snapshots
───────────────────────────────────── */
function FIBViz() {
    const players = [
        { name: 'Player 1', color: 'oklch(62% 0.22 25)',  item: 'diamond',    score: 9, pct: 1.00 },
        { name: 'Player 2', color: 'oklch(76% 0.16 68)',  item: 'iron_ingot', score: 7, pct: 0.78 },
        { name: 'Player 3', color: 'oklch(65% 0.16 255)', item: 'coal',       score: 4, pct: 0.44 },
    ];
    return (
        <div>
            <div className="fib-hdr">
                <span className="vz-lbl">Match in Progress</span>
                <span className="fib-clock">32:14</span>
            </div>
            <div className="fib-tbar-wrap">
                <div className="fib-tbar-fill" style={{ width: '36%' }} />
            </div>
            <div className="fib-stages">
                <span className="fib-stage">Early</span>
                <span className="fib-stage s-mid">Mid</span>
                <span className="fib-stage">Late</span>
            </div>
            <div className="fib-players">
                {players.map((p, i) => (
                    <div key={p.name} className="fib-player">
                        <span className="fib-rank">{i + 1}</span>
                        <span className="fib-dot" style={{ background: p.color }} />
                        <span className="fib-pname">{p.name}</span>
                        <div className="fib-item-cell">
                            <Sprite item={p.item} size={18} />
                            <span className="fib-iname">{itemLabel(p.item)}</span>
                        </div>
                        <div className="fib-ptrack">
                            <div className="fib-pbar" style={{ width: `${p.pct * 100}%`, background: p.color }} />
                        </div>
                        <span className="fib-pscore" style={{ color: p.color }}>{p.score}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function RunBattleViz() {
    const players = [
        { name: 'Player 1', color: 'oklch(62% 0.22 25)',  pct: 1.00, score: 3, claimed: true  },
        { name: 'Player 2', color: 'oklch(76% 0.16 68)',  pct: 0.73, score: 2, claimed: false },
        { name: 'Player 3', color: 'oklch(65% 0.16 255)', pct: 0.49, score: 1, claimed: false },
    ];
    return (
        <div>
            <div className="run-target">
                <span className="vz-lbl">Current Target</span>
                <div className="run-item-box">
                    <Sprite item="diamond_sword" size={42} />
                </div>
                <div className="run-target-name">Diamond Sword</div>
                <span className="run-claimed-badge">&#10003; Claimed</span>
            </div>
            <span className="vz-lbl" style={{ display: 'block', marginBottom: 10 }}>Race to collect</span>
            <div className="run-players">
                {players.map(p => (
                    <div key={p.name} className={`run-player${p.claimed ? ' winner' : ''}`}>
                        <span className="run-pdot" style={{ background: p.color }} />
                        <span className="run-pname">{p.name}</span>
                        <div className="run-track">
                            <div className="run-bar" style={{ width: `${p.pct * 100}%`, background: p.claimed ? 'oklch(64% 0.20 142)' : p.color }} />
                        </div>
                        <span className="run-check">{p.claimed ? '✓' : ''}</span>
                        <span className="run-pscore" style={{ color: p.color }}>{p.score}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ForceChainViz() {
    return (
        <div>
            <div className="chain-hdr">
                <span className="vz-lbl">Your Item Chain</span>
            </div>
            <div className="chain-list">
                {/* Current — active row with left bar + collecting badge */}
                <div className="chain-row chain-row-curr">
                    <div className="chain-spr-box">
                        <Sprite item="iron_ore" size={26} />
                    </div>
                    <div className="chain-row-info">
                        <span className="chain-row-lbl">Current</span>
                        <span className="chain-row-name">Iron Ore</span>
                    </div>
                    <span className="chain-row-status">Collecting</span>
                </div>
                {/* Next — revealed, dimmer */}
                <div className="chain-row chain-row-next">
                    <div className="chain-spr-box">
                        <Sprite item="bread" size={26} />
                    </div>
                    <div className="chain-row-info">
                        <span className="chain-row-lbl">Next</span>
                        <span className="chain-row-name">Bread</span>
                    </div>
                </div>
                {/* Future — not yet revealed */}
                <div className="chain-row chain-row-future">
                    <div className="chain-spr-box">
                        <span className="chain-future-q">?</span>
                    </div>
                    <div className="chain-row-info">
                        <span className="chain-row-lbl">Future</span>
                        <span className="chain-row-name">Not revealed</span>
                    </div>
                </div>
            </div>
            <div className="chain-hint">
                <strong>The edge:</strong> while still collecting Iron Ore, you already know Bread is next — plan your route now.
            </div>
        </div>
    );
}

/* ─────────────────────────────────────
   Pool tiers & tags — mirrors ForceItemPools state/tag system exactly
   Colors match ForceItemPools.jsx ItemCard stateColors/tagColors
───────────────────────────────────── */
const TIER = {
    EARLY: { color: 'oklch(62% 0.20 142)', bg: 'oklch(62% 0.20 142 / 0.10)', bd: 'oklch(62% 0.20 142 / 0.35)', label: 'Early', when: 'From the start (0%)',     desc: 'Common overworld items. Obtainable through basic gathering, farming, or crafting.' },
    MID:   { color: 'oklch(76% 0.16 68)',  bg: 'oklch(76% 0.16 68 / 0.10)',  bd: 'oklch(76% 0.16 68 / 0.35)',  label: 'Mid',   when: 'Unlocks at 11% of time', desc: 'Intermediate items. Require smelting, crafting chains, or moderate exploration.' },
    LATE:  { color: 'oklch(62% 0.22 25)',  bg: 'oklch(62% 0.22 25 / 0.10)',  bd: 'oklch(62% 0.22 25 / 0.35)',  label: 'Late',  when: 'Unlocks at 29% of time', desc: 'Rare or dangerous items. May demand Nether/End access or extensive preparation.' },
};
const TAG_COLOR = {
    NETHER:  'oklch(60% 0.20 15)',
    END:     'oklch(65% 0.15 290)',
    EXTREME: 'oklch(66% 0.20 45)',
};
const POOL_TAGS = [
    { key: 'NETHER',  desc: 'Requires Nether access' },
    { key: 'END',     desc: 'Requires the End dimension' },
    { key: 'EXTREME', desc: 'Rare or exceptionally hard' },
];

// Identical URL and regex to ForceItemPools.jsx
const FIB_JAVA_URL = 'https://raw.githubusercontent.com/McPlayHDnet/ForceItemBattle/main/src/main/java/forceitembattle/manager/ItemDifficultiesManager.java';
const REGISTER_REGEX = /register\(Material\.(\w+),\s*State\.(\w+)(?:,\s*ItemTag\.(\w+))?(?:,\s*ItemTag\.(\w+))?(?:,\s*ItemTag\.(\w+))?\)/g;

function parseJavaPool(content) {
    const items = [];
    REGISTER_REGEX.lastIndex = 0;
    let match;
    while ((match = REGISTER_REGEX.exec(content)) !== null) {
        const [, material, state, t1, t2, t3] = match;
        items.push({ material, state, tags: [t1, t2, t3].filter(Boolean) });
    }
    return items;
}

// Seeded shuffle so the preview is stable per session but not alphabetical
function stableShuffleN(arr, n, seed = 42) {
    const out = [...arr];
    let s = seed;
    for (let i = out.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        const j = Math.abs(s) % (i + 1);
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out.slice(0, n);
}

function PoolsSection() {
    const [tiers, setTiers]   = React.useState(null); // null = loading
    const [counts, setCounts] = React.useState({});
    const [error, setError]   = React.useState(false);

    React.useEffect(() => {
        fetch(FIB_JAVA_URL)
            .then(r => { if (!r.ok) throw new Error(); return r.text(); })
            .then(text => {
                const all = parseJavaPool(text);
                const grouped = { EARLY: [], MID: [], LATE: [] };
                all.forEach(item => { if (grouped[item.state]) grouped[item.state].push(item); });
                const cnt = {};
                const preview = {};
                ['EARLY', 'MID', 'LATE'].forEach(k => {
                    cnt[k] = grouped[k].length;
                    preview[k] = stableShuffleN(grouped[k], 10);
                });
                setCounts(cnt);
                setTiers(preview);
            })
            .catch(() => setError(true));
    }, []);

    return (
        <div className="gp-section-layout">
            <div className="gp-label">
                <div className="gp-tag green">Item Pools</div>
                <h2 className="gp-h2">Dynamic Pools</h2>
                <p className="gp-label-body">
                    Items aren't drawn from a flat list. They're split into three tiers that unlock at fixed points in the game clock — Early immediately, Mid at 11%, Late at 29% of total game time.
                </p>
            </div>
            <div>
                {/* Tier cards */}
                <div className="pools-tiers">
                    {['EARLY', 'MID', 'LATE'].map(key => {
                        const t = TIER[key];
                        const items = tiers ? tiers[key] : [];
                        const total = counts[key] ?? 0;
                        return (
                            <div key={key} className="pools-tier-card" style={{ '--tier-color': t.color, '--tier-bg': t.bg, '--tier-bd': t.bd }}>
                                <div className="pools-tier-head">
                                    <span className="pools-tier-badge">{t.label}</span>
                                    <span className="pools-tier-when">{t.when}</span>
                                </div>
                                <p className="pools-tier-desc">{t.desc}</p>

                                {/* Item preview grid */}
                                {error ? (
                                    <p className="pools-tier-desc" style={{ color: 'oklch(42% 0.012 255)', fontStyle: 'italic' }}>Could not load pool data.</p>
                                ) : !tiers ? (
                                    <div className="pools-skeleton">
                                        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="pools-skel-item" />)}
                                    </div>
                                ) : (
                                    <>
                                        <div className="pools-item-grid">
                                            {items.map(({ material, tags }) => (
                                                <div key={material} className="pools-item">
                                                    <Sprite item={material} size={14} />
                                                    <span className="pools-item-name">{itemLabel(material)}</span>
                                                    {tags.map(tag => (
                                                        <span key={tag} className="pools-item-tag" style={{ background: TAG_COLOR[tag] }} title={tag} />
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                        {total > 10 && (
                                            <span className="pools-tier-more">+{total - 10} more</span>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Tag legend + link row */}
                <div className="pools-footer">
                    <div className="pools-tags">
                        {POOL_TAGS.map(tag => (
                            <div key={tag.key} className="pools-tag-pill">
                                <span className="pools-tag-dot" style={{ background: TAG_COLOR[tag.key] }} />
                                <div className="pools-tag-info">
                                    <span className="pools-tag-name">{tag.key}</span>
                                    <span className="pools-tag-desc">{tag.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <a href="/pools" className="pools-link">
                        View full item pools &#8594;
                    </a>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────
   Page
───────────────────────────────────── */
export default function Gameplay() {
    const [activeMode, setActiveMode] = React.useState(0);
    const mode = MODES[activeMode];
    const mc   = mode.color;
    const mcBg = mc.replace(')', ' / 0.10)');
    const mcBd = mc.replace(')', ' / 0.25)');

    return (
        <div className="gp">
            <style>{CSS}</style>

            <div className="gp-shell">
                <div className="gp-header">
                    <p className="gp-eyebrow">Game Guide</p>
                    <h1 className="gp-h1">Gameplay</h1>
                    <p className="gp-sub">
                        Everything you need to understand ForceItemBattle — how the loop works,
                        which modes exist, and how the best players stay ahead.
                    </p>
                </div>
            </div>

            <div className="gp-rule" />

            {/* ══ How It Works ══ */}
            <div className="gp-shell" id="how-it-works" style={{ scrollMarginTop: 80 }}>
                <div className="gp-section">
                    <div className="gp-section-layout">
                        <div className="gp-label">
                            <div className="gp-tag amber">The Basics</div>
                            <h2 className="gp-h2">How It Works</h2>
                            <p className="gp-label-body">
                                ForceItemBattle is built around one simple loop: get the item, score the point, repeat.
                            </p>
                        </div>
                        <div>
                            <div className="gp-basics">
                                {BASICS.map((b, i) => (
                                    <div key={i} className="gp-basic-tile">
                                        <div className="gp-basic-icon" style={{ background: b.color + '18' }}>
                                            <b.icon size={16} style={{ color: b.color }} />
                                        </div>
                                        <div>
                                            <div className="gp-basic-title">{b.title}</div>
                                            <div className="gp-basic-desc">{b.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="gp-flow">
                                <strong>The goal:</strong> collect more items than everyone else before the timer runs out. Games typically run 45–120 minutes. Most items collected wins.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="gp-rule" />

            {/* ══ Item Pools ══ */}
            <div className="gp-shell" id="item-pools" style={{ scrollMarginTop: 80 }}>
                <div className="gp-section">
                    <PoolsSection />
                </div>
            </div>

            <div className="gp-rule" />

            {/* ══ Game Modes ══ */}
            <div className="gp-shell" id="game-modes" style={{ scrollMarginTop: 80 }}>
                <div className="gp-section">
                    <div className="gp-section-layout">
                        <div className="gp-label">
                            <div className="gp-tag blue">Modes</div>
                            <h2 className="gp-h2">Game Modes</h2>
                            <p className="gp-label-body">
                                Three distinct rulesets. Each one changes the core incentive — what it means to play well.
                            </p>
                        </div>

                        {/* Mode selector + panel as one connected unit */}
                        <div className="gp-mode-group">

                            {/* Selector cards */}
                            <div className="gp-msel">
                                {MODES.map((m, i) => {
                                    const isActive = activeMode === i;
                                    const mmc    = m.color;
                                    const mmcBg  = mmc.replace(')', ' / 0.10)');
                                    const mmcBd  = mmc.replace(')', ' / 0.25)');
                                    return (
                                        <button
                                            key={i}
                                            className={`gp-msel-item${isActive ? ' active' : ''}`}
                                            onClick={() => setActiveMode(i)}
                                            style={{ '--mc': mmc, '--mc-bg': mmcBg, '--mc-bd': mmcBd }}
                                        >
                                            <div className="gp-msel-hdr">
                                                <span className="gp-msel-num">{String(i + 1).padStart(2, '0')}</span>
                                                <span className="gp-msel-badge">{m.badge}</span>
                                            </div>
                                            <div className="gp-msel-identity">
                                                <m.icon size={13} className="gp-msel-icon" />
                                                <span className="gp-msel-name">{m.name}</span>
                                            </div>
                                            <p className="gp-msel-hook">{m.hook}</p>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Detail panel */}
                            <div className="gp-mpanel" style={{ '--mc': mc, '--mc-bg': mcBg, '--mc-bd': mcBd }}>
                                <div className="gp-mpanel-head">
                                    <h3 className="gp-mpanel-name">{mode.name}</h3>
                                    <span className="gp-mpanel-badge">{mode.badge}</span>
                                </div>
                                <div className="gp-mpanel-body">
                                    {activeMode === 0 && <FIBViz />}
                                    {activeMode === 1 && <RunBattleViz />}
                                    {activeMode === 2 && <ForceChainViz />}
                                </div>
                                <div className="gp-mpanel-foot">
                                    <span className="gp-mpanel-foot-lbl">Key rule</span>
                                    <span className="gp-mpanel-foot-sep" />
                                    <span className="gp-mpanel-foot-val">{mode.mechanic}</span>
                                </div>
                            </div>

                        </div>{/* /gp-mode-group */}
                    </div>{/* /gp-section-layout */}
                </div>{/* /gp-section */}
            </div>{/* /gp-shell */}

            <div className="gp-rule" />

            {/* ══ Tips & Strategy ══ */}
            <div className="gp-shell" id="tips" style={{ scrollMarginTop: 80 }}>
                <div className="gp-section">
                    <div className="gp-section-layout">
                        <div className="gp-label">
                            <div className="gp-tag purple">Advanced</div>
                            <h2 className="gp-h2">Tips & Strategy</h2>
                            <p className="gp-label-body">
                                FIB rewards both speed and strategy. The most consistent players master efficiency, coordination, and preparation.
                            </p>
                        </div>
                        <div className="gp-tips">
                            {TIPS.map((t, i) => (
                                <div key={i} className="gp-tip">
                                    <span className="gp-tip-num">{String(i + 1).padStart(2, '0')}</span>
                                    <div className="gp-tip-icon" style={{ background: t.iconBg }}>
                                        <t.icon size={16} style={{ color: t.iconColor }} />
                                    </div>
                                    <div className="gp-tip-content">
                                        <div className="gp-tip-title">{t.title}</div>
                                        <p className="gp-tip-desc">{t.desc}</p>
                                        {t.bullets && (
                                            <ul className="gp-tip-bullets">
                                                {t.bullets.map((b, bi) => (
                                                    <li key={bi} className="gp-tip-bullet">{b}</li>
                                                ))}
                                            </ul>
                                        )}
                                        {t.note && (
                                            <p className="gp-tip-desc" style={{ marginTop: 10, marginBottom: 0 }}>{t.note}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
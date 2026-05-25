import React, { useCallback } from 'react';
import Footer from "../components/common/Footer.jsx";
import Swords from 'lucide-react/dist/esm/icons/swords';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Link from 'lucide-react/dist/esm/icons/link';
import Layers from 'lucide-react/dist/esm/icons/layers';
import Puzzle from 'lucide-react/dist/esm/icons/puzzle';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Settings2 from 'lucide-react/dist/esm/icons/settings-2';
import Users from 'lucide-react/dist/esm/icons/users';
import Mountain from 'lucide-react/dist/esm/icons/mountain';
import ScanLine from 'lucide-react/dist/esm/icons/scan-line';

const MC_HEAD  = (u) => `https://mc-heads.net/avatar/${u}/100`;
const GH_AVT   = (u) => `https://github.com/${u}.png?size=100`;
const alpha    = (color, a) => color.replace(')', ` / ${a})`);

// ─── Data ─────────────────────────────────────────────────────────────────────

const MODES = [
    {
        icon: Swords,
        title: 'ForceItemBattle',
        tag: 'Classic',
        description: 'Race against the clock collecting randomly assigned items. Find yours, get the next one. Most collected before time runs out wins.',
        color: 'oklch(62% 0.22 25)',
    },
    {
        icon: Zap,
        title: 'RunBattle',
        tag: 'Speed',
        description: 'Only the first player to reach each item scores. No sharing, no second chances — route faster or lose the point.',
        color: 'oklch(76% 0.16 68)',
    },
    {
        icon: Link,
        title: 'ForceChain',
        tag: 'Strategy',
        description: "You see the current item and the next one in the chain. Plan your path before you score.",
        color: 'oklch(75% 0.12 200)',
    },
];

const FEATURES = [
    {
        icon: Layers,
        title: 'Dynamic Item Pools',
        description: 'Carefully tiered categories from Easy to Extreme, tuned so every match stays fair regardless of skill level.',
        href: 'pools',
    },
    {
        icon: Puzzle,
        title: 'Custom Structures',
        description: 'Hand-built locations and loot spawns designed specifically around FIB gameplay.',
        href: 'structures',
    },
    {
        icon: Settings2,
        title: 'Round Settings',
        description: 'Tune the round experience your way — time limits, item counts, difficulty and more.',
        href: 'settings',
    },
    {
        icon: Users,
        title: 'Team Mode',
        description: 'Compete in teams. Points pool together, strategy shifts from individual routing to coordinated coverage.',
    },
    {
        icon: Mountain,
        title: 'Custom End Generation',
        description: 'A purpose-built End dimension with faster traversal and sparser terrain, designed for the pace of competitive play.',
        href: 'structures',
    },
    {
        icon: ScanLine,
        title: 'Auto Item Detection',
        description: 'Already carrying the item? It registers automatically — inventory, bundle, or backpack. No fumbling required.',
    },
];

const TEAM = [
    { name: 'threeseconds', role: 'Core Development',                   color: 'oklch(62% 0.22 25)' },
    { name: 'eltobito',     role: 'Content, Datapacks & Resource Packs', color: 'oklch(75% 0.12 200)' },
    { name: 'stupxd',       role: 'Bug Fixing & Quality',                color: 'oklch(76% 0.16 68)' },
    { name: 'apppaa',       role: 'Item Descriptions',                   color: 'oklch(82% 0.16 90)' },
    { name: 'CH0RD',        role: 'Structure Design',                    color: 'oklch(68% 0.18 145)' },
];

const THANKS = [
    { name: '170yt',       role: 'Original project this forked from',   link: 'https://github.com/170yt/ForceItemBattle' },
    { name: 'McPlayHD',    role: 'Server infrastructure',                link: 'https://github.com/mcplayhd' },
    { name: 'Owen1212055', role: 'Item renders for the Resource Pack',   link: 'https://github.com/Owen1212055/mc-assets' },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');

  /* ─── Tokens ─────────────────────────────────── */
  .fib2 {
    --bg:        oklch(17% 0.025 255);
    --surface:   oklch(21% 0.023 255);
    --surf-hov:  oklch(25% 0.021 255);
    --border:    oklch(30% 0.019 255);
    --border-f:  oklch(24% 0.022 255);
    --text:      oklch(94% 0.007 255);
    --text-mid:  oklch(74% 0.012 255);
    --muted:     oklch(58% 0.012 255);
    --dim:       oklch(42% 0.013 255);
    --amber:     oklch(76% 0.16 68);
    font-family: 'Barlow', system-ui, sans-serif;
    background:  var(--bg);
    color:       var(--text);
    min-height:  100vh;
    -webkit-font-smoothing: antialiased;
  }

  /* ─── Entrance animations ────────────────────── */
  @keyframes fib-rise {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fib-r1 { animation: fib-rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.04s both; }
  .fib-r2 { animation: fib-rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.14s both; }
  .fib-r3 { animation: fib-rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.24s both; }
  .fib-r4 { animation: fib-rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.34s both; }

  /* ─── Scroll reveal ──────────────────────────── */
  @keyframes fib-reveal {
    from { opacity: 0; transform: translateY(36px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fib-hidden { opacity: 0; transform: translateY(36px); }
  .fib-visible { animation: fib-reveal 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }

  /* Staggered items — animate once the section (fib-visible) reveals */
  .fib-visible .fib-item {
    opacity: 0;
    animation: fib-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .fib-visible .fib-item:nth-child(1) { animation-delay:  60ms; }
  .fib-visible .fib-item:nth-child(2) { animation-delay: 120ms; }
  .fib-visible .fib-item:nth-child(3) { animation-delay: 180ms; }
  .fib-visible .fib-item:nth-child(4) { animation-delay: 240ms; }
  .fib-visible .fib-item:nth-child(5) { animation-delay: 300ms; }
  .fib-visible .fib-item:nth-child(6) { animation-delay: 360ms; }

  /* ─── Hero ───────────────────────────────────── */
  .fib2-hero {
    position: relative;
    overflow: hidden;
    padding: 96px 28px 100px;
    text-align: center;
  }

  .fib2-hero-glow {
    position: absolute;
    top: 0; left: 50%; transform: translateX(-50%);
    width: 900px; height: 600px;
    background: radial-gradient(ellipse at 50% 0%, oklch(76% 0.16 68 / 0.08) 0%, transparent 60%);
    pointer-events: none;
  }

  .fib2-hero-fade {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 140px;
    background: linear-gradient(transparent, oklch(17% 0.025 255));
    pointer-events: none;
  }

  .fib2-hero-inner {
    position: relative; z-index: 1;
    max-width: 820px; margin: 0 auto;
  }

  .fib2-banner {
    width: min(100%, 480px);
    height: auto;
    display: block;
    margin: 0 auto 40px;
    filter:
      drop-shadow(0 20px 48px oklch(6% 0.022 255 / 0.75))
      drop-shadow(0 6px 16px oklch(76% 0.16 68 / 0.14));
  }

  .fib2-hero-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(30px, 4.5vw, 52px);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: -0.5px;
    color: var(--text);
    margin: 0 0 22px;
    line-height: 1.0;
  }

  .fib2-hero-desc {
    font-size: clamp(15px, 1.9vw, 18px);
    line-height: 1.82;
    color: var(--muted);
    margin: 0 auto 32px;
    max-width: 52ch;
  }
  .fib2-hero-desc strong { color: var(--text-mid); font-weight: 600; }

  .fib2-hero-note {
    font-size: 12.5px;
    color: var(--dim);
    line-height: 1.7;
    max-width: 42ch;
    margin: 0 auto;
  }
  .fib2-hero-note a {
    color: oklch(60% 0.10 200);
    text-decoration: none;
    font-weight: 600;
    transition: color 0.12s ease-out;
  }
  .fib2-hero-note a:hover { color: oklch(74% 0.11 200); }

  @media (max-width: 600px) {
    .fib2-hero { padding: 72px 20px 80px; }
    .fib2-hero-stats { flex-wrap: wrap; }
  }

  /* ─── Layout shell ───────────────────────────── */
  .fib2-rule { height: 1px; background: var(--border); max-width: 1120px; margin: 0 auto; }
  .fib2-section { max-width: 1080px; margin: 0 auto; padding: 88px 28px; }

  .fib2-eyebrow {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 3px;
    color: var(--amber);
    margin: 0 0 14px;
  }

  .fib2-h2 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(40px, 5.5vw, 64px);
    font-weight: 800; line-height: 1.0;
    letter-spacing: -0.5px;
    text-transform: uppercase;
    color: var(--text);
    margin: 0 0 52px;
  }

  /* ─── Mode mosaic ────────────────────────────── */
  .fib2-modes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 1px;
    background: var(--border-f);
    border-radius: 12px;
    overflow: hidden;
    list-style: none; margin: 0; padding: 0;
  }
  /* ForceItemBattle spans full width */
  .fib2-mode:nth-child(1) { grid-column: 1 / -1; }

  @media (max-width: 640px) {
    .fib2-modes { grid-template-columns: 1fr; }
    .fib2-mode:nth-child(1) { grid-column: auto; }
    .fib2-section { padding: 64px 20px; }
    .fib2-hero { padding: 80px 20px 64px; }
  }

  .fib2-mode {
    position: relative; overflow: hidden;
    background: var(--surface);
    padding: 32px 30px 28px;
    display: flex; flex-direction: column; gap: 20px;
    transition: background 0.12s ease-out;
    cursor: default;
  }
  .fib2-mode:hover { background: var(--surf-hov); }

  /* Coloured top accent line per mode */
  .fib2-mode::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--mode-color, var(--border-f));
    opacity: 0.6;
    transition: opacity 0.12s ease-out;
  }
  .fib2-mode:hover::before { opacity: 1; }

  /* Large watermark number */
  .fib2-mode-num {
    position: absolute; top: 16px; right: 22px;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 72px; font-weight: 900;
    color: var(--mode-color, var(--border-f));
    opacity: 0.07;
    line-height: 1; pointer-events: none;
    letter-spacing: -2px;
    transition: opacity 0.12s ease-out;
  }
  .fib2-mode:hover .fib2-mode-num { opacity: 0.11; }

  /* Header row: icon + tag */
  .fib2-mode-header {
    display: flex; align-items: center; gap: 12px;
    position: relative; z-index: 1;
  }
  .fib2-mode-icon {
    width: 40px; height: 40px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .fib2-mode:hover .fib2-mode-icon { transform: scale(1.10); }

  .fib2-mode-tag {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 10.5px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 1px;
    padding: 3px 9px; border-radius: 4px;
    background: var(--mode-color-bg, transparent);
    border: 1px solid var(--mode-color-bd, var(--border-f));
    color: var(--mode-color, var(--muted));
  }

  /* Body: name + description */
  .fib2-mode-body { position: relative; z-index: 1; }
  .fib2-mode-name {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 26px; font-weight: 800;
    text-transform: uppercase; letter-spacing: -0.2px;
    color: var(--text);
    margin: 0 0 10px; line-height: 1.0;
  }
  /* Secondary modes: slightly smaller name */
  .fib2-mode:nth-child(n+2) .fib2-mode-name { font-size: 21px; }

  .fib2-mode-desc {
    font-size: 14px; color: var(--muted);
    line-height: 1.78; margin: 0;
    max-width: 56ch;
  }
  .fib2-mode:nth-child(n+2) .fib2-mode-desc { font-size: 13.5px; }

  /* ─── Features grid ──────────────────────────── */
  .fib2-features {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--border-f);
    border-radius: 10px;
    overflow: hidden;
  }
  @media (max-width: 560px) {
    .fib2-features { grid-template-columns: 1fr; }
  }

  .fib2-feat {
    background: var(--surface);
    padding: 28px 26px 26px;
    display: flex; flex-direction: column; gap: 12px;
    transition: background 0.12s ease-out;
    cursor: default;
    text-decoration: none; color: inherit;
    position: relative;
  }
  .fib2-feat:nth-child(1),
  .fib2-feat:nth-child(2) { padding: 36px 30px 32px; }
  .fib2-feat:hover { background: var(--surf-hov); }
  /* Linked tiles: title shifts amber and arrow appears */
  .fib2-feat[href]:hover .fib2-feat-name { color: var(--amber); }
  .fib2-feat-arrow {
    position: absolute; bottom: 18px; right: 20px;
    color: var(--dim); opacity: 0;
    transition: opacity 0.12s ease-out, transform 0.12s ease-out;
  }
  .fib2-feat[href]:hover .fib2-feat-arrow {
    opacity: 1;
    transform: translate(2px, -2px);
    color: var(--amber);
  }

  .fib2-feat-icon {
    width: 36px; height: 36px; border-radius: 8px;
    background: oklch(76% 0.16 68 / 0.10);
    border: 1px solid oklch(76% 0.16 68 / 0.18);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .fib2-feat:nth-child(n+3) .fib2-feat-icon {
    width: 30px; height: 30px; border-radius: 6px;
    background: oklch(30% 0.019 255 / 0.60);
    border: none;
  }

  .fib2-feat-name {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 18px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.3px;
    color: var(--text); margin: 0; line-height: 1.15;
    transition: color 0.12s ease-out;
  }
  .fib2-feat:nth-child(n+3) .fib2-feat-name { font-size: 15px; }

  .fib2-feat-desc {
    font-size: 13.5px; color: var(--muted);
    line-height: 1.72; margin: 0;
  }
  .fib2-feat:nth-child(n+3) .fib2-feat-desc { font-size: 13px; }

  /* ─── Team mosaic ────────────────────────────── */
  .fib2-mosaic {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1px;
    background: var(--border-f);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 56px;
  }
  @media (max-width: 640px) { .fib2-mosaic { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 400px) { .fib2-mosaic { grid-template-columns: repeat(2, 1fr); } }

  .fib2-creator {
    background: oklch(17.5% 0.025 255);
    display: flex; flex-direction: column; align-items: center;
    padding: 32px 16px 28px; gap: 16px;
    text-align: center;
    transition: background 0.12s ease-out;
    cursor: default;
    position: relative;
  }
  .fib2-creator:hover { background: oklch(21% 0.022 255); }

  .fib2-creator-head {
    width: 80px; height: 80px;
    border-radius: 10px; overflow: hidden;
    image-rendering: pixelated; flex-shrink: 0;
    /* Colored ring in their personal color */
    outline: 2px solid var(--member-color, transparent);
    outline-offset: 3px;
    opacity: 0.9;
    transition: opacity 0.12s ease-out, outline-color 0.12s ease-out;
  }
  .fib2-creator:hover .fib2-creator-head { opacity: 1; }
  .fib2-creator-head img { width: 100%; height: 100%; display: block; image-rendering: pixelated; }

  .fib2-creator-name {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 16px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.5px;
    margin: 0 0 4px; line-height: 1.1;
  }

  .fib2-creator-role {
    font-size: 12px;
    color: oklch(54% 0.010 255);
    line-height: 1.45; font-weight: 500;
  }

  /* ─── Special Thanks ─────────────────────────── */
  .fib2-st-divider {
    display: flex; align-items: center; gap: 16px;
    margin: 0 0 24px;
  }
  .fib2-st-divider-line {
    flex: 1; height: 1px; background: var(--border-f);
  }
  .fib2-st-divider-label {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 3px;
    color: var(--dim);
    white-space: nowrap;
  }

  .fib2-thanks-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  @media (max-width: 600px) {
    .fib2-thanks-grid { grid-template-columns: 1fr; }
  }

  .fib2-thanks-tile {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 18px;
    background: oklch(19% 0.024 255);
    border: 1px solid var(--border-f);
    border-radius: 8px;
    text-decoration: none; color: inherit;
    transition: background 0.12s ease-out, border-color 0.12s ease-out;
    position: relative; overflow: hidden;
  }
  .fib2-thanks-tile:hover {
    background: oklch(22% 0.022 255);
    border-color: var(--border);
  }

  .fib2-thanks-avatar {
    width: 48px; height: 48px;
    border-radius: 8px; overflow: hidden; flex-shrink: 0;
    border: 1px solid var(--border-f);
  }
  .fib2-thanks-avatar img { width: 100%; height: 100%; display: block; }

  .fib2-thanks-body { flex: 1; min-width: 0; }

  .fib2-thanks-name {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 15px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(90% 0.009 255);
    margin-bottom: 3px; line-height: 1.1;
  }
  .fib2-thanks-role {
    font-size: 11.5px; color: oklch(54% 0.011 255);
    line-height: 1.45; font-weight: 500;
  }

  .fib2-thanks-gh {
    flex-shrink: 0;
    color: oklch(35% 0.015 255);
    transition: color 0.12s ease-out, transform 0.12s ease-out;
  }
  .fib2-thanks-tile:hover .fib2-thanks-gh {
    color: var(--amber);
    transform: translate(2px, -2px);
  }

  /* ─── Reduced motion ─────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .fib-r1, .fib-r2, .fib-r3, .fib-r4 { animation: none !important; opacity: 1; transform: none; }
    .fib-hidden { opacity: 1 !important; transform: none !important; }
    .fib-visible { animation: none !important; }
    .fib-visible .fib-item { animation: none !important; opacity: 1; }
    .fib2-mode-icon,
    .fib2-feat-arrow,
    .fib2-creator-head,
    .fib2-thanks-gh { transition: none !important; }
  }
`;

// ─── Scroll reveal hook ───────────────────────────────────────────────────────

function useScrollReveal() {
    const observe = useCallback((el) => {
        if (!el) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    entry.target.classList.remove('fib-hidden');
                    entry.target.classList.add('fib-visible');
                    io.unobserve(entry.target);
                }
            },
            { threshold: 0, rootMargin: '0px 0px -18% 0px' }
        );
        io.observe(el);
    }, []);
    return observe;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
    const reveal = useScrollReveal();

    return (
        <div className="fib2">
            <style>{CSS}</style>

            {/* ── Hero ── */}
            <section className="fib2-hero">
                <div className="fib2-hero-glow" aria-hidden="true" />
                <div className="fib2-hero-fade" aria-hidden="true" />

                <div className="fib2-hero-inner">
                    <img
                        src="/banner.png"
                        alt="ForceItemBattle"
                        className="fib2-banner fib-r1"
                        width="480"
                        height="480"
                        loading="eager"
                        fetchPriority="high"
                    />

                    <h1 className="fib2-hero-title fib-r2">
                        What is ForceItemBattle?
                    </h1>

                    <p className="fib2-hero-desc fib-r3">
                        A competitive Minecraft gamemode where players race to collect randomly assigned items.
                        Find yours, get the next one. Whoever collects the most{' '}
                        <strong>before time runs out</strong> wins.
                    </p>

                    <p className="fib2-hero-note fib-r4">
                        Popularised by{' '}
                        <a href="https://www.youtube.com/@BastiGHG" target="_blank" rel="noopener noreferrer">
                            BastiGHG
                        </a>. This is the{' '}
                        <strong style={{ color: 'var(--text-mid)', fontWeight: 600 }}>McPlayHD.net</strong>{' '}
                        edition - with our own rules, balancing, and unique twists.
                    </p>
                </div>
            </section>

            <div className="fib2-rule" />

            {/* ── Game Modes ── */}
            <section className="fib2-section fib-hidden" ref={reveal}>
                <p className="fib2-eyebrow">Game Modes</p>
                <h2 className="fib2-h2">Choose how you play</h2>

                <ul className="fib2-modes fib-stagger">
                    {MODES.map((m, i) => {
                        const Icon = m.icon;
                        const colorBg = m.color.replace(')', ' / 0.10)');
                        const colorBd = m.color.replace(')', ' / 0.25)');
                        return (
                            <li
                                key={i}
                                className="fib2-mode fib-item"
                                style={{
                                    '--mode-color':    m.color,
                                    '--mode-color-bg': colorBg,
                                    '--mode-color-bd': colorBd,
                                }}
                            >
                                <span className="fib2-mode-num">{String(i + 1).padStart(2, '0')}</span>

                                <div className="fib2-mode-header">
                                    <div
                                        className="fib2-mode-icon"
                                        style={{ background: alpha(m.color, '0.12') }}
                                    >
                                        <Icon size={20} style={{ color: m.color }} />
                                    </div>
                                    <span className="fib2-mode-tag">{m.tag}</span>
                                </div>

                                <div className="fib2-mode-body">
                                    <div className="fib2-mode-name">{m.title}</div>
                                    <p className="fib2-mode-desc">{m.description}</p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </section>

            <div className="fib2-rule" />

            {/* ── Features ── */}
            <section className="fib2-section fib-hidden" ref={reveal}>
                <p className="fib2-eyebrow">Features</p>
                <h2 className="fib2-h2">What's included</h2>

                <div className="fib2-features fib-stagger">
                    {FEATURES.map((f, i) => {
                        const Icon = f.icon;
                        const isPrimary = i < 2;
                        const Tag = f.href ? 'a' : 'div';
                        const linkProps = f.href ? {
                            href: `#${f.href}`,
                            onClick: (e) => { e.preventDefault(); window.location.hash = f.href; },
                            style: { cursor: 'pointer' },
                        } : {};
                        return (
                            <Tag key={i} className="fib2-feat fib-item" {...linkProps}>
                                <div className="fib2-feat-icon">
                                    <Icon
                                        size={isPrimary ? 18 : 14}
                                        style={{ color: isPrimary ? 'oklch(76% 0.16 68)' : 'oklch(54% 0.011 255)' }}
                                    />
                                </div>
                                <div className="fib2-feat-name">{f.title}</div>
                                <p className="fib2-feat-desc">{f.description}</p>
                                {f.href && (
                                    <ArrowRight size={14} className="fib2-feat-arrow" />
                                )}
                            </Tag>
                        );
                    })}
                </div>
            </section>

            <div className="fib2-rule" />

            {/* ── Team ── */}
            <section className="fib2-section fib-hidden" ref={reveal}>
                <p className="fib2-eyebrow">The Team</p>
                <h2 className="fib2-h2">Built by this crew</h2>

                <div className="fib2-mosaic fib-stagger">
                    {TEAM.map((c, i) => (
                        <div
                            key={i}
                            className="fib2-creator fib-item"
                            style={{ '--member-color': c.color }}
                        >
                            <div className="fib2-creator-head">
                                <img src={MC_HEAD(c.name)} alt={c.name} />
                            </div>
                            <div>
                                <div className="fib2-creator-name" style={{ color: c.color }}>
                                    {c.name}
                                </div>
                                <div className="fib2-creator-role">{c.role}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="fib2-st-divider">
                    <div className="fib2-st-divider-line" />
                    <span className="fib2-st-divider-label">Special Thanks</span>
                    <div className="fib2-st-divider-line" />
                </div>

                <div className="fib2-thanks-grid">
                    {THANKS.map((t, i) => (
                        <a
                            key={i}
                            href={t.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="fib2-thanks-tile"
                        >
                            <div className="fib2-thanks-avatar">
                                <img src={GH_AVT(t.name)} alt={t.name} />
                            </div>
                            <div className="fib2-thanks-body">
                                <div className="fib2-thanks-name">{t.name}</div>
                                <div className="fib2-thanks-role">{t.role}</div>
                            </div>
                            <ArrowRight size={14} className="fib2-thanks-gh" />
                        </a>
                    ))}
                </div>
            </section>

            <Footer />
        </div>
    );
}
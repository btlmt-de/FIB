import React from 'react';
import Package      from 'lucide-react/dist/esm/icons/package';
import Download     from 'lucide-react/dist/esm/icons/download';
import FileText     from 'lucide-react/dist/esm/icons/file-text';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Users        from 'lucide-react/dist/esm/icons/users';
import Shield       from 'lucide-react/dist/esm/icons/shield';
import ArrowRight   from 'lucide-react/dist/esm/icons/arrow-right';
import Swords       from 'lucide-react/dist/esm/icons/swords';
import Clock        from 'lucide-react/dist/esm/icons/clock';
import Trophy       from 'lucide-react/dist/esm/icons/trophy';
import SkipForward  from 'lucide-react/dist/esm/icons/skip-forward';
import Split        from 'lucide-react/dist/esm/icons/split';
import ScanSearch   from 'lucide-react/dist/esm/icons/scan-search';
import Brain        from 'lucide-react/dist/esm/icons/brain';
import Footer from "../components/common/Footer.jsx";

// ── Data ──────────────────────────────────────────────────────────────────────

const DOWNLOADS = [
    {
        num:       '01',
        required:  true,
        href:      'https://github.com/McPlayHDnet/ForceItemBattle',
        icon:      Package,
        title:     'ForceItemBattle Plugin',
        desc:      'The core plugin. Runs on any Paper 1.21+ server.',
        tag:       'Required',
    },
    {
        num:       '02',
        required:  false,
        href:      'https://github.com/btlmt-de/FIB/blob/main/FIB_Worldgen.zip',
        icon:      Download,
        title:     'Worldgen Datapack',
        desc:      'Custom structures built around FIB gameplay.',
        tag:       'Optional',
    },
    {
        num:       '03',
        required:  false,
        href:      'https://github.com/btlmt-de/FIB/blob/main/ForceItemBattle.zip',
        icon:      Download,
        title:     'Resource Pack',
        desc:      'Items shown in tab, bossbar, and chat.',
        tag:       'Optional',
    },
    {
        num:       '04',
        required:  false,
        href:      'https://github.com/btlmt-de/FIB/blob/main/unicodeItems.json',
        icon:      FileText,
        title:     'unicodeItems.json',
        desc:      'Unicode-to-texture mapping for the resource pack.',
        tag:       'Optional',
    },
    {
        num:       '05',
        required:  false,
        href:      'https://github.com/btlmt-de/FIB/blob/main/config.yml',
        icon:      FileText,
        title:     'config.yml',
        desc:      'Item descriptions surfaced by /info.',
        tag:       'Optional',
        extra:     { label: 'Browse item pools', href: '/pools' },
    },
];

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');

  .htp {
    font-family: 'Barlow', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: oklch(17% 0.025 255);
    color: oklch(94% 0.007 255);
    min-height: 100vh; display: flex; flex-direction: column;
  }

  /* ── Rule + section shared ── */
  .htp-rule  { height: 1px; background: oklch(19% 0.019 255); }
  .htp-shell { max-width: 1080px; margin: 0 auto; padding: 0 28px; width: 100%; box-sizing: border-box; }

  /* ── Page header ── */
  .htp-header { padding: 80px 0 72px; }
  .htp-eyebrow {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 3px;
    color: oklch(76% 0.16 68); margin: 0 0 14px;
  }
  .htp-h1 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(44px, 6.5vw, 76px);
    font-weight: 800; line-height: 0.95;
    letter-spacing: -0.5px; text-transform: uppercase;
    color: oklch(94% 0.007 255); margin: 0 0 22px;
  }
  .htp-sub {
    font-size: 16px; color: oklch(58% 0.012 255);
    max-width: 440px; line-height: 1.72; margin: 0;
  }

  /* ══ GAMEPLAY SECTION ════════════════════════════════════════════════════ */

  .htp-gameplay { padding: 72px 0 0; }

  /* Two-col layout matching the rest of the page */
  .htp-gameplay-layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 0 64px;
    align-items: start;
    padding-bottom: 72px;
  }
  @media (max-width: 760px) {
    .htp-gameplay-layout { grid-template-columns: 1fr; gap: 28px 0; padding-bottom: 56px; }
  }

  .htp-gameplay-label { position: sticky; top: 32px; }
  .htp-gameplay-tag {
    display: inline-flex; align-items: center;
    padding: 4px 10px; border-radius: 4px; margin-bottom: 18px;
    background: oklch(76% 0.16 68 / 0.12);
    border: 1px solid oklch(76% 0.16 68 / 0.30);
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 10.5px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 1px;
    color: oklch(76% 0.16 68);
  }
  .htp-gameplay-h2 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(28px, 3.5vw, 40px); font-weight: 800;
    text-transform: uppercase; letter-spacing: -0.2px;
    color: oklch(94% 0.007 255); margin: 0 0 14px; line-height: 1.05;
  }
  .htp-gameplay-body {
    font-size: 13.5px; color: oklch(52% 0.013 255);
    line-height: 1.72; margin: 0;
  }

  /* Basics grid — 4 fact tiles */
  .htp-basics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: oklch(24% 0.022 255);
    border-radius: 9px; overflow: hidden;
    margin-bottom: 20px;
  }
  @media (max-width: 480px) { .htp-basics { grid-template-columns: 1fr; } }

  .htp-basic-tile {
    background: oklch(20% 0.023 255);
    padding: 18px 20px;
    display: flex; align-items: flex-start; gap: 13px;
  }
  .htp-basic-icon {
    width: 32px; height: 32px; border-radius: 7px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .htp-basic-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px;
    color: oklch(90% 0.009 255); margin: 0 0 4px; line-height: 1.1;
  }
  .htp-basic-desc {
    font-size: 12.5px; color: oklch(52% 0.013 255); line-height: 1.55;
  }

  /* Flow note — the win condition */
  .htp-flow {
    padding: 14px 18px;
    background: oklch(76% 0.16 68 / 0.07);
    border: 1px solid oklch(76% 0.16 68 / 0.22);
    border-radius: 8px;
    font-size: 14px; line-height: 1.72;
    color: oklch(70% 0.12 68);
  }
  .htp-flow strong { color: oklch(82% 0.14 68); }

  /* ── Tips section ── */
  .htp-tips { padding: 72px 0; }
  .htp-tips-layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 0 64px;
    align-items: start;
  }
  @media (max-width: 760px) {
    .htp-tips-layout { grid-template-columns: 1fr; gap: 28px 0; }
  }

  .htp-tips-label { position: sticky; top: 32px; }
  .htp-tips-tag {
    display: inline-flex; align-items: center;
    padding: 4px 10px; border-radius: 4px; margin-bottom: 18px;
    background: oklch(65% 0.18 300 / 0.12);
    border: 1px solid oklch(65% 0.18 300 / 0.28);
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 10.5px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 1px;
    color: oklch(65% 0.18 300);
  }
  .htp-tips-h2 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(28px, 3.5vw, 40px); font-weight: 800;
    text-transform: uppercase; letter-spacing: -0.2px;
    color: oklch(94% 0.007 255); margin: 0 0 14px; line-height: 1.05;
  }
  .htp-tips-body {
    font-size: 13.5px; color: oklch(52% 0.013 255);
    line-height: 1.72; margin: 0;
  }

  /* Tip rows — editorial numbered list */
  .htp-tip-list { display: flex; flex-direction: column; }
  .htp-tip {
    display: flex; gap: 20px; align-items: flex-start;
    padding: 22px 0;
    border-top: 1px solid oklch(22% 0.022 255);
  }
  .htp-tip:last-child { border-bottom: 1px solid oklch(22% 0.022 255); }

  .htp-tip-num {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 13px; font-weight: 700;
    color: oklch(36% 0.015 255);
    letter-spacing: 1px; font-variant-numeric: tabular-nums;
    flex-shrink: 0; margin-top: 3px; width: 24px; text-align: right;
  }
  .htp-tip-icon {
    width: 34px; height: 34px; border-radius: 7px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .htp-tip-content { flex: 1; min-width: 0; }
  .htp-tip-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 17px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px;
    color: oklch(90% 0.009 255); margin: 0 0 8px; line-height: 1.1;
  }
  .htp-tip-desc {
    font-size: 13.5px; color: oklch(54% 0.012 255); line-height: 1.75; margin: 0 0 10px;
  }
  .htp-tip-bullets {
    display: flex; flex-direction: column; gap: 7px;
    list-style: none; margin: 0; padding: 0;
  }
  .htp-tip-bullet {
    display: flex; align-items: baseline; gap: 10px;
    font-size: 13px; color: oklch(58% 0.012 255); line-height: 1.65;
  }
  .htp-tip-bullet::before {
    content: '—';
    color: oklch(36% 0.015 255); font-size: 11px; flex-shrink: 0;
  }

  /* ══ PRIMARY SECTION: Host Your Own ══════════════════════════════════════ */

  .htp-primary { padding: 72px 0 80px; }

  /* Two-col: left label, right content */
  .htp-primary-layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 0 64px;
    align-items: start;
  }
  @media (max-width: 760px) {
    .htp-primary-layout { grid-template-columns: 1fr; gap: 36px 0; }
  }

  /* Left: sticky label column */
  .htp-primary-label { position: sticky; top: 32px; }
  .htp-primary-tag {
    display: inline-flex; align-items: center;
    padding: 4px 10px; border-radius: 4px; margin-bottom: 18px;
    background: oklch(64% 0.20 142 / 0.12);
    border: 1px solid oklch(64% 0.20 142 / 0.30);
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 10.5px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 1px;
    color: oklch(64% 0.20 142);
  }
  .htp-primary-h2 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(28px, 3.5vw, 40px); font-weight: 800;
    text-transform: uppercase; letter-spacing: -0.2px;
    color: oklch(94% 0.007 255); margin: 0 0 14px; line-height: 1.05;
  }
  .htp-primary-body {
    font-size: 13.5px; color: oklch(52% 0.013 255);
    line-height: 1.72; margin: 0;
  }

  /* Right: download list — editorial rows matching Game Modes pattern */
  .htp-dl-list { list-style: none; margin: 0; padding: 0; }
  .htp-dl-item {
    display: grid;
    grid-template-columns: 40px 36px 1fr auto 16px;
    gap: 0 22px;
    align-items: center;
    padding: 20px 10px;
    margin: 0 -10px;
    border-top: 1px solid oklch(19% 0.019 255);
    border-radius: 6px;
    text-decoration: none; color: inherit;
    transition: background 0.12s ease-out;
  }
  .htp-dl-item:last-child { border-bottom: 1px solid oklch(19% 0.019 255); }
  /* Required item — slightly elevated so it reads as the primary action */
  .htp-dl-item.required {
    background: oklch(64% 0.20 142 / 0.04);
    border-top-color: oklch(64% 0.20 142 / 0.18);
  }
  .htp-dl-item.required + .htp-dl-item { border-top-color: oklch(64% 0.20 142 / 0.18); }
  .htp-dl-item:hover { background: oklch(22% 0.022 255); }
  .htp-dl-item.required:hover { background: oklch(64% 0.20 142 / 0.08); }
  /* Title shifts to amber on hover — makes linkiness obvious */
  .htp-dl-item:hover .htp-dl-name { color: oklch(76% 0.16 68); }
  /* Ext icon: dim at rest, visible on hover */
  .htp-dl-ext {
    color: oklch(30% 0.015 255);
    flex-shrink: 0;
    transition: color 0.12s ease-out, transform 0.12s ease-out;
  }
  .htp-dl-item:hover .htp-dl-ext {
    color: oklch(76% 0.16 68);
    transform: translate(2px, -2px);
  }

  .htp-dl-num {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 13px; font-weight: 700;
    color: oklch(34% 0.015 255);
    letter-spacing: 1px; font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .htp-dl-icon {
    width: 36px; height: 36px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .htp-dl-name {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 17px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.3px;
    color: oklch(94% 0.007 255);
    margin: 0 0 4px; line-height: 1.1;
  }
  .htp-dl-desc {
    font-size: 13px; color: oklch(52% 0.013 255); line-height: 1.5;
    display: flex; align-items: center; gap: 8px;
  }
  .htp-dl-extra {
    font-size: 11px; color: oklch(68% 0.12 200); text-decoration: none; font-weight: 600;
  }
  .htp-dl-extra:hover { color: oklch(78% 0.10 200); }
  .htp-dl-tag {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.8px;
    padding: 2px 8px; border-radius: 3px;
    white-space: nowrap;
  }
  .htp-dl-tag.req {
    color: oklch(64% 0.20 142);
    background: oklch(64% 0.20 142 / 0.10);
    border: 1px solid oklch(64% 0.20 142 / 0.30);
  }
  .htp-dl-tag.opt {
    color: oklch(42% 0.013 255);
    background: transparent;
    border: 1px solid oklch(23% 0.018 255);
  }

  /* ══ SECONDARY SECTION: Join Server ══════════════════════════════════════ */

  .htp-secondary { padding: 64px 0 80px; }

  .htp-secondary-layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 0 64px;
    align-items: start;
  }
  @media (max-width: 760px) {
    .htp-secondary-layout { grid-template-columns: 1fr; gap: 28px 0; }
  }

  .htp-secondary-label { position: sticky; top: 32px; }
  .htp-secondary-tag {
    display: inline-flex; align-items: center;
    padding: 4px 10px; border-radius: 4px; margin-bottom: 18px;
    background: oklch(40% 0.011 255 / 0.15);
    border: 1px solid oklch(40% 0.011 255 / 0.30);
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 10.5px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 1px;
    color: oklch(50% 0.011 255);
  }
  .htp-secondary-h2 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(24px, 3vw, 34px); font-weight: 800;
    text-transform: uppercase; letter-spacing: -0.2px;
    color: oklch(68% 0.01 255); margin: 0 0 14px; line-height: 1.05;
  }
  .htp-secondary-body {
    font-size: 13px; color: oklch(44% 0.011 255);
    line-height: 1.72; margin: 0;
  }

  /* Right side of secondary */
  .htp-secondary-content { display: flex; flex-direction: column; gap: 20px; }

  /* Soon notice */
  .htp-soon-strip {
    padding: 14px 18px;
    background: oklch(76% 0.16 68 / 0.06);
    border: 1px solid oklch(76% 0.16 68 / 0.20);
    border-radius: 8px;
    font-size: 13px; line-height: 1.68;
    color: oklch(65% 0.10 68);
  }
  .htp-soon-strip strong { color: oklch(76% 0.14 68); }

  /* Steps */
  .htp-steps { display: flex; flex-direction: column; gap: 14px; }
  .htp-step  { display: flex; gap: 14px; align-items: flex-start; }
  .htp-step-n {
    width: 22px; height: 22px; border-radius: 5px;
    background: oklch(40% 0.011 255 / 0.20);
    border: 1px solid oklch(40% 0.011 255 / 0.30);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 11px; font-weight: 800; color: oklch(48% 0.011 255);
    flex-shrink: 0; margin-top: 2px;
  }
  .htp-step-text { font-size: 13.5px; color: oklch(62% 0.011 255); line-height: 1.5; font-weight: 500; }
  .htp-step-link { color: oklch(68% 0.12 200); text-decoration: none; font-weight: 600; font-size: 13px; display: block; margin-top: 2px; }
  .htp-step-link:hover { color: oklch(78% 0.10 200); }

  /* Rules + warn row */
  .htp-meta-row { display: flex; gap: 12px; flex-wrap: wrap; }
  .htp-rules-link {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 14px; text-decoration: none;
    background: oklch(20% 0.023 255);
    border: 1px solid oklch(21% 0.018 255);
    border-radius: 7px; flex: 1; min-width: 200px;
    transition: background 0.12s ease-out, border-color 0.12s ease-out;
  }
  .htp-rules-link:hover { background: oklch(19% 0.019 255); border-color: oklch(35% 0.018 255); }
  .htp-rules-title { font-size: 13px; font-weight: 600; color: oklch(72% 0.011 255); }
  .htp-rules-sub   { font-size: 11px; color: oklch(42% 0.013 255); margin-top: 1px; }
  .htp-rules-arr   { margin-left: auto; color: oklch(36% 0.011 255); flex-shrink: 0; transition: color 0.12s, transform 0.12s; }
  .htp-rules-link:hover .htp-rules-arr { color: oklch(58% 0.012 255); transform: translateX(2px); }

  .htp-warn-note {
    padding: 11px 14px; border-radius: 7px;
    font-size: 12px; line-height: 1.65;
    background: oklch(62% 0.22 25 / 0.06);
    border: 1px solid oklch(62% 0.22 25 / 0.18);
    color: oklch(58% 0.12 25);
    flex: 1; min-width: 200px;
  }
  .htp-warn-note strong { color: oklch(66% 0.14 25); }

  /* ── Jump nav ── */
  .htp-jumpnav {
    display: flex; flex-wrap: wrap; gap: 8px;
    margin-top: 28px;
  }
  .htp-jump {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 8px 16px; border-radius: 7px; cursor: pointer;
    background: none; border: 1px solid oklch(28% 0.019 255);
    font-family: 'Barlow', system-ui, sans-serif;
    font-size: 13px; font-weight: 600;
    color: oklch(52% 0.012 255);
    text-decoration: none;
    transition: color 0.12s ease-out, border-color 0.12s ease-out, background 0.12s ease-out;
  }
  .htp-jump:hover { color: oklch(88% 0.009 255); border-color: oklch(40% 0.013 255); background: oklch(21% 0.023 255); }
  .htp-jump.primary {
    color: oklch(64% 0.20 142);
    border-color: oklch(64% 0.20 142 / 0.40);
    background: oklch(64% 0.20 142 / 0.07);
  }
  .htp-jump.primary:hover {
    color: oklch(72% 0.20 142);
    border-color: oklch(64% 0.20 142 / 0.65);
    background: oklch(64% 0.20 142 / 0.13);
  }
  .htp-jump-dot {
    width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  }
    .htp-shell { padding: 0 20px; }
    .htp-header { padding: 60px 0 52px; }
    .htp-primary   { padding: 56px 0 64px; }
    .htp-secondary { padding: 48px 0 64px; }
  }
`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function HowToPlay() {
    return (
        <div className="htp">
            <style>{CSS}</style>

            {/* ── Header ── */}
            <div className="htp-shell">
                <div className="htp-header">
                    <p className="htp-eyebrow">Setup</p>
                    <h1 className="htp-h1">How to Play</h1>
                    <p className="htp-sub">
                        Get a server running or join an existing round.
                    </p>
                </div>
            </div>

            <div className="htp-rule" />

            {/* ══ Primary: Host Your Own ══ */}
            <div className="htp-shell" id="host" style={{ scrollMarginTop: 80 }}>
                <div className="htp-primary">
                    <div className="htp-primary-layout">

                        {/* Left — sticky label */}
                        <div className="htp-primary-label">
                            <div className="htp-primary-tag">Recommended</div>
                            <h2 className="htp-primary-h2">Host Your Own</h2>
                            <p className="htp-primary-body">
                                Run ForceItemBattle on your own server.
                                Full control over who plays and how the round is configured.
                            </p>
                        </div>

                        {/* Right — editorial download list */}
                        <ul className="htp-dl-list">
                            {DOWNLOADS.map((d) => {
                                const Icon = d.icon;
                                const iconBg = d.required
                                    ? 'oklch(64% 0.20 142 / 0.13)'
                                    : 'oklch(76% 0.16 68 / 0.10)';
                                const iconColor = d.required
                                    ? 'oklch(64% 0.20 142)'
                                    : 'oklch(76% 0.16 68)';
                                return (
                                    <li key={d.num}>
                                        <a
                                            href={d.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`htp-dl-item${d.required ? ' required' : ''}`}
                                        >
                                            <span className="htp-dl-num">{d.num}</span>
                                            <div className="htp-dl-icon" style={{ background: iconBg }}>
                                                <Icon size={17} style={{ color: iconColor }} />
                                            </div>
                                            <div>
                                                <div className="htp-dl-name">{d.title}</div>
                                                <div className="htp-dl-desc">
                                                    {d.desc}
                                                    {d.extra && (
                                                        <a
                                                            href={d.extra.href}
                                                            className="htp-dl-extra"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            {d.extra.label} →
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`htp-dl-tag ${d.required ? 'req' : 'opt'}`}>
                                                {d.tag}
                                            </span>
                                            <ExternalLink size={13} className="htp-dl-ext" />
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="htp-rule" />

            {/* ══ Secondary: Join Server ══ */}
            <div className="htp-shell" id="join" style={{ scrollMarginTop: 80 }}>
                <div className="htp-secondary">
                    <div className="htp-secondary-layout">

                        {/* Left — sticky label, visually quieter */}
                        <div className="htp-secondary-label">
                            <div className="htp-secondary-tag">Coming Soon</div>
                            <h2 className="htp-secondary-h2">Join Our Server</h2>
                            <p className="htp-secondary-body">
                                Official hosted rounds with the community.
                                Not widely available yet.
                            </p>
                        </div>

                        {/* Right — content */}
                        <div className="htp-secondary-content">
                            <div className="htp-soon-strip">
                                <strong>Not ready for wide access yet.</strong> We're planning regularly
                                hosted games in the future. For now, hosting your own game is the
                                way to go. <span style={{ opacity: 0.5 }}>soon™</span>
                            </div>

                            <div className="htp-steps">
                                <div className="htp-step">
                                    <span className="htp-step-n">1</span>
                                    <div>
                                        <div className="htp-step-text">Join our Discord community</div>
                                        <a href="http://mcplayhd.net/discord" target="_blank"
                                           rel="noopener noreferrer" className="htp-step-link">
                                            discord.gg/mcplayhd
                                        </a>
                                    </div>
                                </div>
                                <div className="htp-step">
                                    <span className="htp-step-n">2</span>
                                    <div className="htp-step-text">Link your Minecraft account to Discord</div>
                                </div>
                                <div className="htp-step">
                                    <span className="htp-step-n">3</span>
                                    <div className="htp-step-text">Open a support ticket and ask about FIB</div>
                                </div>
                            </div>

                            <div className="htp-meta-row">
                                <a href="/rules" className="htp-rules-link">
                                    <Shield size={16} style={{ color: 'oklch(52% 0.013 255)', flexShrink: 0 }} />
                                    <div>
                                        <div className="htp-rules-title">Game Rules</div>
                                        <div className="htp-rules-sub">Review before your first round</div>
                                    </div>
                                    <ArrowRight size={13} className="htp-rules-arr" />
                                </a>
                                <div className="htp-warn-note">
                                    <strong>Note:</strong> Rounds are spontaneous and may be
                                    limited. We reserve the right to only invite players we
                                    trust to follow the rules.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
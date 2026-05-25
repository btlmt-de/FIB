import React, { useState, useEffect, useCallback, useMemo } from 'react';
import BarChart3    from 'lucide-react/dist/esm/icons/bar-chart-3';
import Crown        from 'lucide-react/dist/esm/icons/crown';
import History      from 'lucide-react/dist/esm/icons/history';
import FlaskConical from 'lucide-react/dist/esm/icons/flask-conical';

import { generateMockStats } from './statsUtils.js';
import { TabNavigation, EntitySelector } from './StatsComponents.jsx';
import { StatsView }        from './StatsView.jsx';
import { StatsLeaderboard } from './StatsLeaderboard.jsx';
import { StatsMatchHistory } from './StatsMatchHistory.jsx';
import { StatsComparison }  from './StatsComparison.jsx';
import Footer from "../../components/common/Footer.jsx";

// ── Shared CSS ─────────────────────────────────────────────────────────────────
export const STATS_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');

  @keyframes st-in { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
  .st-in { animation: st-in 0.35s cubic-bezier(0.16,1,0.3,1) both; }

  .st { font-family: 'Barlow', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .st-shell { max-width: 1100px; margin: 0 auto; padding: 0 24px; width: 100%; box-sizing: border-box; }
  .st-rule  { height: 1px; background: oklch(24% 0.022 255); }

  /* ── Page header ── */
  .st-header { padding: 64px 0 40px; }
  .st-eyebrow {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;
    color: oklch(76% 0.16 68); margin: 0 0 14px;
  }
  .st-h1 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(38px, 5.5vw, 60px); font-weight: 800;
    line-height: 0.95; letter-spacing: -0.5px; text-transform: uppercase;
    color: oklch(94% 0.007 255); margin: 0 0 16px;
  }
  .st-sub { font-size: 14.5px; color: oklch(52% 0.012 255); max-width: 420px; line-height: 1.7; margin: 0 0 20px; }

  /* Preview notice */
  .st-notice {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 10px 14px; border-radius: 7px;
    background: oklch(72% 0.18 55 / 0.08);
    border: 1px solid oklch(72% 0.18 55 / 0.25);
    font-size: 13px; max-width: 540px;
  }
  .st-notice-label { color: oklch(72% 0.18 55); font-weight: 600; }
  .st-notice-text  { color: oklch(52% 0.012 255); }

  /* ── Tabs ── */
  .st-tabs {
    display: flex; border-bottom: 1px solid oklch(24% 0.022 255);
    margin-bottom: 24px;
  }
  .st-tab {
    display: flex; align-items: center; gap: 7px;
    padding: 11px 18px;
    background: none; border: none; border-bottom: 2px solid transparent;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(42% 0.013 255); cursor: pointer;
    transition: color 0.12s ease-out;
  }
  .st-tab.active { color: oklch(94% 0.007 255); border-bottom-color: oklch(76% 0.16 68); }
  .st-tab:not(.active):hover { color: oklch(68% 0.011 255); }

  /* ── Entity selector ── */
  .st-selector {
    padding: 16px 18px; margin-bottom: 24px;
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(28% 0.020 255);
    border-radius: 9px;
  }
  .st-selector.selecting { border-color: oklch(76% 0.16 68 / 0.40); }
  .st-selector-banner {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; border-radius: 6px; margin-bottom: 12px;
    background: oklch(76% 0.16 68 / 0.08);
    border: 1px solid oklch(76% 0.16 68 / 0.25);
    font-size: 13px; color: oklch(76% 0.16 68);
  }
  .st-selector-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .st-search-wrap { position: relative; flex: 1 1 280px; min-width: 200px; }
  .st-search {
    width: 100%; box-sizing: border-box;
    background: oklch(17% 0.025 255); border: 1px solid oklch(28% 0.020 255);
    border-radius: 7px; padding: 9px 12px 9px 36px;
    color: oklch(94% 0.007 255); font-size: 13.5px; outline: none;
    transition: border-color 0.12s; font-family: 'Barlow', system-ui, sans-serif;
  }
  .st-search:focus { border-color: oklch(44% 0.014 255); }
  .st-search::placeholder { color: oklch(40% 0.013 255); }
  .st-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); pointer-events: none; color: oklch(40% 0.013 255); }
  .st-search-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: oklch(40% 0.013 255); padding: 3px; border-radius: 3px; display: flex; }
  .st-search-clear:hover { color: oklch(72% 0.011 255); }

  /* Search dropdown */
  .st-dropdown {
    position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 100;
    background: oklch(21% 0.023 255); border: 1px solid oklch(30% 0.019 255);
    border-radius: 8px; max-height: 280px; overflow-y: auto;
    box-shadow: 0 8px 28px oklch(6% 0.022 255 / 0.55);
  }
  .st-dropdown-empty { padding: 18px; text-align: center; color: oklch(42% 0.013 255); font-size: 13px; }
  .st-dropdown-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; cursor: pointer;
    border-bottom: 1px solid oklch(24% 0.022 255);
    transition: background 0.1s ease-out;
  }
  .st-dropdown-item:last-child { border-bottom: none; }
  .st-dropdown-item:hover { background: oklch(25% 0.021 255); }
  .st-dropdown-avatar { width: 34px; height: 34px; border-radius: 6px; image-rendering: pixelated; flex-shrink: 0; border: 1px solid oklch(30% 0.019 255); }
  .st-dropdown-name { font-size: 13.5px; font-weight: 500; color: oklch(88% 0.009 255); }
  .st-dropdown-meta { font-size: 11px; color: oklch(48% 0.013 255); margin-top: 1px; display: flex; align-items: center; gap: 3px; }

  /* Filter toggles */
  .st-filter-row { display: flex; gap: 4px; background: oklch(17% 0.025 255); border-radius: 6px; padding: 3px; }
  .st-filter-btn {
    display: flex; align-items: center; gap: 4px; padding: 5px 11px;
    background: none; border: none; border-radius: 4px; cursor: pointer;
    font-family: 'Barlow', system-ui, sans-serif;
    font-size: 12px; font-weight: 600; color: oklch(48% 0.013 255);
    transition: background 0.1s, color 0.1s;
  }
  .st-filter-btn.active { background: oklch(30% 0.019 255); color: oklch(88% 0.009 255); }
  .st-filter-btn:not(.active):hover { color: oklch(72% 0.011 255); }

  /* Compare toggle */
  .st-compare-btn {
    display: flex; align-items: center; gap: 6px; padding: 9px 14px;
    background: none; border: 1px solid oklch(30% 0.019 255); border-radius: 7px;
    font-family: 'Barlow', system-ui, sans-serif;
    font-size: 13px; font-weight: 600; color: oklch(52% 0.012 255); cursor: pointer;
    transition: color 0.12s, border-color 0.12s, background 0.12s;
  }
  .st-compare-btn:hover { color: oklch(88% 0.009 255); border-color: oklch(44% 0.014 255); }
  .st-compare-btn.active { color: oklch(76% 0.16 68); border-color: oklch(76% 0.16 68 / 0.40); background: oklch(76% 0.16 68 / 0.08); }

  /* Selected entity pill */
  .st-selected {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border-radius: 7px;
    background: oklch(76% 0.16 68 / 0.07);
    border: 1px solid oklch(76% 0.16 68 / 0.22);
    margin-top: 10px;
  }
  .st-selected-name { font-size: 15px; font-weight: 600; color: oklch(90% 0.009 255); flex: 1; }
  .st-selected-meta { font-size: 11.5px; color: oklch(76% 0.16 68); display: flex; align-items: center; gap: 4px; }
  .st-selected-clear { background: none; border: none; cursor: pointer; color: oklch(42% 0.013 255); padding: 4px; border-radius: 4px; display: flex; transition: color 0.12s; }
  .st-selected-clear:hover { color: oklch(72% 0.011 255); }

  /* ── Stat card ── */
  .st-card {
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(28% 0.020 255);
    border-radius: 9px; padding: 18px;
    display: flex; align-items: flex-start; gap: 14px;
    transition: border-color 0.12s ease-out;
  }
  .st-card:hover { border-color: oklch(36% 0.016 255); }
  .st-card-icon {
    width: 44px; height: 44px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .st-card-label {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    color: oklch(44% 0.013 255); margin-bottom: 5px;
  }
  .st-card-value {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 26px; font-weight: 800; color: oklch(94% 0.007 255); line-height: 1;
    letter-spacing: -0.3px; margin-bottom: 4px;
  }
  .st-card-sub { font-size: 11px; color: oklch(44% 0.013 255); }

  /* ── Profile header ── */
  .st-profile {
    display: flex; align-items: center; gap: 20px; padding: 24px;
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(28% 0.020 255);
    border-radius: 10px; flex-wrap: wrap; margin-bottom: 24px;
  }
  .st-profile-name {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 32px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.3px;
    color: oklch(94% 0.007 255); margin: 0 0 4px;
  }
  .st-profile-meta { font-size: 13px; color: oklch(52% 0.012 255); display: flex; align-items: center; gap: 5px; }

  /* ── Section panel ── */
  .st-panel {
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(28% 0.020 255);
    border-radius: 9px; padding: 20px;
  }
  .st-panel-title {
    display: flex; align-items: center; gap: 9px; margin-bottom: 16px;
    padding-bottom: 14px; border-bottom: 1px solid oklch(25% 0.021 255);
  }
  .st-panel-label {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px;
    color: oklch(90% 0.009 255); margin: 0;
  }
  .st-panel-sub { font-size: 11.5px; color: oklch(44% 0.013 255); }

  /* ── Leaderboard ── */
  .st-lb-cats { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; }
  .st-lb-cat {
    display: flex; align-items: center; gap: 6px; padding: 7px 14px;
    background: oklch(21% 0.023 255); border: 1px solid oklch(28% 0.020 255);
    border-radius: 6px; cursor: pointer;
    font-family: 'Barlow', system-ui, sans-serif;
    font-size: 12.5px; font-weight: 600; color: oklch(52% 0.012 255);
    transition: background 0.1s, color 0.1s, border-color 0.1s;
  }
  .st-lb-cat:hover:not(.active) { color: oklch(80% 0.009 255); border-color: oklch(38% 0.016 255); }
  .st-lb-cat.active { color: oklch(94% 0.007 255); }

  .st-lb-header {
    display: grid; grid-template-columns: 52px 1fr 120px;
    gap: 12px; padding: 11px 16px;
    border-bottom: 1px solid oklch(24% 0.022 255);
    background: oklch(19% 0.024 255); border-radius: 7px 7px 0 0;
  }
  .st-lb-col-head { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: oklch(40% 0.013 255); }
  .st-lb-col-head.right { text-align: right; }

  .st-lb-rows { max-height: 440px; overflow-y: auto; border: 1px solid oklch(28% 0.020 255); border-top: none; border-radius: 0 0 7px 7px; }
  .st-lb-row {
    display: grid; grid-template-columns: 52px 1fr 120px;
    gap: 12px; padding: 12px 16px; align-items: center;
    border-bottom: 1px solid oklch(22% 0.022 255);
    cursor: pointer; transition: background 0.1s;
  }
  .st-lb-row:last-child { border-bottom: none; }
  .st-lb-row:hover { background: oklch(25% 0.021 255); }
  .st-lb-row.top { background: oklch(23% 0.022 255); }
  .st-lb-row.top:hover { background: oklch(26% 0.021 255); }

  .st-rank-badge {
    width: 30px; height: 30px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 13px; font-weight: 800;
  }
  .st-rank-n { color: oklch(48% 0.013 255); font-family: 'Barlow Condensed', system-ui, sans-serif; font-size: 13.5px; font-weight: 700; padding-left: 4px; }

  .st-lb-player { display: flex; align-items: center; gap: 10px; }
  .st-lb-avatar { width: 34px; height: 34px; border-radius: 6px; image-rendering: pixelated; flex-shrink: 0; }
  .st-lb-name { font-size: 13.5px; font-weight: 500; color: oklch(86% 0.009 255); }
  .st-lb-games { font-size: 11px; color: oklch(42% 0.013 255); margin-top: 1px; }
  .st-lb-value { text-align: right; font-family: 'Barlow Condensed', system-ui, sans-serif; font-size: 16px; font-weight: 700; }

  /* ── Comparison ── */
  .st-cmp-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: stretch; margin-bottom: 20px; }
  .st-cmp-slot {
    background: oklch(21% 0.023 255); border: 1px solid oklch(28% 0.020 255);
    border-radius: 9px; padding: 22px; text-align: center;
  }
  .st-cmp-slot.empty { cursor: pointer; border-style: dashed; }
  .st-cmp-slot.empty:hover { background: oklch(24% 0.022 255); border-color: oklch(40% 0.013 255); }
  .st-cmp-vs {
    display: flex; align-items: center; justify-content: center;
  }
  .st-cmp-vs-badge {
    width: 44px; height: 44px; border-radius: 50%;
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 13px; font-weight: 800; color: oklch(48% 0.013 255);
    text-transform: uppercase;
  }
  .st-cmp-entity-name { font-family: 'Barlow Condensed', system-ui, sans-serif; font-size: 20px; font-weight: 800; text-transform: uppercase; color: oklch(94% 0.007 255); margin: 10px 0 3px; }
  .st-cmp-rank { font-size: 12px; color: oklch(48% 0.013 255); margin-bottom: 10px; }
  .st-cmp-change-btn {
    display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px;
    background: none; border: 1px solid oklch(28% 0.020 255); border-radius: 5px;
    font-family: 'Barlow', system-ui, sans-serif;
    font-size: 12px; font-weight: 600; color: oklch(52% 0.012 255); cursor: pointer;
    transition: color 0.12s, border-color 0.12s;
  }
  .st-cmp-change-btn:hover { color: oklch(86% 0.009 255); border-color: oklch(42% 0.013 255); }

  .st-cmp-row {
    display: grid; grid-template-columns: 1fr 160px 1fr;
    align-items: center; padding: 12px 0;
    border-bottom: 1px solid oklch(24% 0.022 255 / 0.5);
  }
  .st-cmp-row:last-child { border-bottom: none; }
  .st-cmp-val-left  { text-align: right; padding-right: 20px; display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
  .st-cmp-val-right { text-align: left;  padding-left: 20px;  display: flex; align-items: center; gap: 8px; }
  .st-cmp-val { font-family: 'Barlow Condensed', system-ui, sans-serif; font-size: 17px; font-weight: 700; color: oklch(80% 0.009 255); }
  .st-cmp-val.winner { color: oklch(64% 0.20 142); }
  .st-cmp-meta {
    text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px;
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(42% 0.013 255); padding: 0 12px;
    font-family: 'Barlow', system-ui, sans-serif;
  }

  /* ── Match history ── */
  .st-match-row {
    display: flex; align-items: center; gap: 14px; padding: 14px 18px;
    background: oklch(21% 0.023 255); border: 1px solid oklch(28% 0.020 255);
    border-radius: 8px; cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
    margin-bottom: 8px;
  }
  .st-match-row:hover { background: oklch(24% 0.022 255); border-color: oklch(36% 0.016 255); }
  .st-match-date { font-size: 12.5px; font-weight: 600; color: oklch(72% 0.011 255); min-width: 72px; }
  .st-match-duration { font-size: 11px; color: oklch(42% 0.013 255); display: flex; align-items: center; gap: 3px; }
  .st-match-sep { width: 1px; height: 32px; background: oklch(28% 0.020 255); flex-shrink: 0; }
  .st-match-winner { font-size: 14px; font-weight: 600; color: oklch(76% 0.16 68); }
  .st-match-winner-sub { font-size: 11px; color: oklch(48% 0.013 255); }
  .st-match-stat { text-align: center; }
  .st-match-stat-val { font-family: 'Barlow Condensed', system-ui, sans-serif; font-size: 17px; font-weight: 700; color: oklch(86% 0.009 255); }
  .st-match-stat-label { font-size: 10px; color: oklch(42% 0.013 255); }

  /* ── Inventory grid ── */
  .st-inv-slot {
    background: oklch(19% 0.024 255);
    border: 1px solid oklch(26% 0.020 255);
    border-radius: 5px; cursor: default; position: relative;
    transition: background 0.1s, border-color 0.1s;
  }
  .st-inv-slot.has-item { cursor: pointer; }
  .st-inv-slot.has-item:hover { background: oklch(24% 0.022 255); border-color: oklch(36% 0.016 255); }
  .st-inv-tooltip {
    position: fixed; z-index: 1000; pointer-events: none;
    background: oklch(22% 0.023 255); border: 1px solid oklch(30% 0.019 255);
    border-radius: 7px; padding: 10px 13px;
    box-shadow: 0 8px 24px oklch(6% 0.022 255 / 0.55);
    min-width: 140px;
  }

  /* ── Empty state ── */
  .st-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 72px 24px; text-align: center;
  }
  .st-empty-icon {
    width: 60px; height: 60px; border-radius: 10px;
    background: oklch(21% 0.023 255); border: 1px solid oklch(28% 0.020 255);
    display: flex; align-items: center; justify-content: center; margin-bottom: 18px;
  }
  .st-empty-title { font-family: 'Barlow Condensed', system-ui, sans-serif; font-size: 20px; font-weight: 800; text-transform: uppercase; color: oklch(90% 0.009 255); margin: 0 0 8px; }
  .st-empty-sub { font-size: 13.5px; color: oklch(48% 0.013 255); max-width: 300px; line-height: 1.6; margin: 0; }

  /* ── Back button ── */
  .st-back {
    display: inline-flex; align-items: center; gap: 6px; margin-bottom: 24px;
    background: none; border: none; cursor: pointer; padding: 0;
    font-family: 'Barlow', system-ui, sans-serif;
    font-size: 13px; font-weight: 600; color: oklch(48% 0.013 255);
    text-transform: uppercase; letter-spacing: 0.5px;
    transition: color 0.12s;
  }
  .st-back:hover { color: oklch(82% 0.009 255); }

  /* ── Pagination ── */
  .st-page-btn {
    display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px;
    background: none; border: 1px solid oklch(28% 0.020 255); border-radius: 5px;
    font-family: 'Barlow', system-ui, sans-serif;
    font-size: 12px; font-weight: 600; color: oklch(52% 0.012 255); cursor: pointer;
    transition: color 0.12s, border-color 0.12s;
  }
  .st-page-btn:hover:not(:disabled) { color: oklch(88% 0.009 255); border-color: oklch(40% 0.013 255); }
  .st-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .st-page-btn.active { color: oklch(76% 0.16 68); border-color: oklch(76% 0.16 68 / 0.40); background: oklch(76% 0.16 68 / 0.08); }

  /* ── Top items ── */
  .st-top-items { display: flex; gap: 10px; justify-content: center; }
  .st-top-item {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    flex: 1 1 0; min-width: 76px; max-width: 110px;
    padding: 16px 8px; border-radius: 8px;
    background: oklch(19% 0.024 255); border: 1px solid oklch(26% 0.020 255);
    position: relative;
  }
  .st-top-medal {
    position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
    width: 24px; height: 24px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 11px; font-weight: 800; border: 2px solid oklch(21% 0.023 255);
  }
  .st-top-item-name { font-size: 11px; font-weight: 500; color: oklch(70% 0.011 255); text-align: center; line-height: 1.3; word-break: break-word; }
  .st-top-item-count { font-family: 'Barlow Condensed', system-ui, sans-serif; font-size: 16px; font-weight: 700; }

  /* ── Distance strip ── */
  .st-distance {
    display: flex; align-items: center; gap: 18px; padding: 20px;
    background: oklch(21% 0.023 255); border: 1px solid oklch(28% 0.020 255);
    border-radius: 9px;
  }
  .st-distance-icon { width: 52px; height: 52px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .st-distance-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: oklch(44% 0.013 255); margin-bottom: 5px; }
  .st-distance-value { font-family: 'Barlow Condensed', system-ui, sans-serif; font-size: 30px; font-weight: 800; color: oklch(94% 0.007 255); letter-spacing: -0.3px; }

  /* ── Pool colors ── */
  .pool-early { color: oklch(64% 0.20 142); }
  .pool-mid   { color: oklch(76% 0.16 68); }
  .pool-late  { color: oklch(62% 0.22 25); }

  @media (max-width: 640px) {
    .st-shell { padding: 0 16px; }
    .st-header { padding: 48px 0 32px; }
    .st-cmp-grid { grid-template-columns: 1fr; }
    .st-cmp-vs { display: none; }
  }
`;

const TAB_CONFIG = [
    { id: 'overview',     label: 'Overview',      Icon: BarChart3 },
    { id: 'leaderboards', label: 'Leaderboards',   Icon: Crown     },
    { id: 'history',      label: 'Match History',  Icon: History   },
];

export default function Stats() {
    const [activeTab,       setActiveTab]       = useState('overview');
    const [selectedEntity,  setSelectedEntity]  = useState(null);
    const [selectedStats,   setSelectedStats]   = useState(null);
    const [compareMode,     setCompareMode]     = useState(false);
    const [compareEntity1,  setCompareEntity1]  = useState(null);
    const [compareStats1,   setCompareStats1]   = useState(null);
    const [compareEntity2,  setCompareEntity2]  = useState(null);
    const [compareStats2,   setCompareStats2]   = useState(null);
    const [selectingFor,    setSelectingFor]    = useState(null);

    const tabs = useMemo(() => TAB_CONFIG.map(t => ({
        id: t.id, label: t.label, icon: <t.Icon size={15} />,
    })), []);

    useEffect(() => {
        if (selectedEntity) {
            setSelectedStats(generateMockStats(selectedEntity.id, selectedEntity.type === 'team'));
        } else setSelectedStats(null);
    }, [selectedEntity]);

    useEffect(() => {
        if (compareEntity1) setCompareStats1(generateMockStats(compareEntity1.id, compareEntity1.type === 'team'));
        else setCompareStats1(null);
    }, [compareEntity1]);

    useEffect(() => {
        if (compareEntity2) setCompareStats2(generateMockStats(compareEntity2.id, compareEntity2.type === 'team'));
        else setCompareStats2(null);
    }, [compareEntity2]);

    const handleEntitySelect = useCallback((entity) => {
        if (compareMode && selectingFor) {
            if (selectingFor === 'left') setCompareEntity1(entity);
            else setCompareEntity2(entity);
            setSelectingFor(null);
        } else if (compareMode) {
            if (!compareEntity1) setCompareEntity1(entity);
            else if (!compareEntity2) setCompareEntity2(entity);
            else setCompareEntity1(entity);
        } else {
            setSelectedEntity(entity);
        }
    }, [compareMode, selectingFor, compareEntity1, compareEntity2]);

    const handleToggleCompare = useCallback(() => {
        setCompareMode(prev => {
            if (!prev) { setCompareEntity1(null); setCompareEntity2(null); setSelectingFor(null); }
            return !prev;
        });
    }, []);

    const renderContent = () => {
        if (activeTab === 'leaderboards') return <StatsLeaderboard />;
        if (activeTab === 'history')      return <StatsMatchHistory entity={selectedEntity} />;
        return compareMode ? (
            <StatsComparison
                entity1={compareEntity1} stats1={compareStats1}
                entity2={compareEntity2} stats2={compareStats2}
                onSelectEntity={(side) => setSelectingFor(side)}
            />
        ) : (
            <StatsView entity={selectedEntity} stats={selectedStats} />
        );
    };

    return (
        <div className="st" style={{ background: 'oklch(17% 0.025 255)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <style>{STATS_CSS}</style>

            <div className="st-shell" style={{ flex: 1 }}>
                {/* Header */}
                <div className="st-header">
                    <p className="st-eyebrow">Data</p>
                    <h1 className="st-h1">Statistics</h1>
                    <p className="st-sub">Player stats, leaderboards, and match history.</p>
                    <div className="st-notice">
                        <FlaskConical size={16} style={{ color: 'oklch(72% 0.18 55)', flexShrink: 0 }} />
                        <span className="st-notice-label">Preview: </span>
                        <span className="st-notice-text">Displaying mock data. Live stats available once the API is ready.</span>
                    </div>
                </div>

                <div className="st-rule" style={{ marginBottom: 32 }} />

                {/* Tabs */}
                <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

                {/* Entity selector */}
                {activeTab === 'overview' && (
                    <EntitySelector
                        selectedEntity={compareMode ? null : selectedEntity}
                        onSelect={handleEntitySelect}
                        compareMode={compareMode}
                        onToggleCompare={handleToggleCompare}
                        selectingFor={selectingFor}
                    />
                )}

                {renderContent()}
            </div>

            <Footer />
        </div>
    );
}
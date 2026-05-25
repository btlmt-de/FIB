import React, { useState, useCallback, useEffect } from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import Copy from 'lucide-react/dist/esm/icons/copy';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import Clipboard from 'lucide-react/dist/esm/icons/clipboard';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Save from 'lucide-react/dist/esm/icons/save';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import GitBranch from 'lucide-react/dist/esm/icons/git-branch';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import X from 'lucide-react/dist/esm/icons/x';

// Minecraft color codes mapping
const MC_COLORS = {
    '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
    '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
    '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
    'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF'
};

const COLOR_NAMES = {
    '0': 'Black', '1': 'Dark Blue', '2': 'Dark Green', '3': 'Dark Aqua',
    '4': 'Dark Red', '5': 'Dark Purple', '6': 'Gold', '7': 'Gray',
    '8': 'Dark Gray', '9': 'Blue', 'a': 'Green', 'b': 'Aqua',
    'c': 'Red', 'd': 'Light Purple', 'e': 'Yellow', 'f': 'White'
};

const FORMAT_CODES = {
    'l': { name: 'Bold', style: 'fontWeight: 700' },
    'o': { name: 'Italic', style: 'fontStyle: italic' },
    'n': { name: 'Underline', style: 'textDecoration: underline' },
    'm': { name: 'Strikethrough', style: 'textDecoration: line-through' },
    'r': { name: 'Reset', style: '' }
};

import { COLORS as C } from '../../config/constants';

// For parseMinecraftFormatting baseline
const MC_BASE_COLOR = C.text;

const EDITOR_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');
  @keyframes ed-in { from { opacity:0; transform:scale(0.97) translateY(8px); } to { opacity:1; transform:none; } }
  @keyframes ed-spin { to { transform: rotate(360deg); } }

  .ed { font-family: 'Barlow', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .ed-overlay {
    position: fixed; inset: 0;
    background: oklch(6% 0.022 255 / 0.88);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 20px; box-sizing: border-box;
  }
  .ed-panel {
    background: oklch(17% 0.025 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 10px;
    width: 100%; max-height: 90vh;
    overflow: auto;
    transition: max-width 0.2s cubic-bezier(0.16,1,0.3,1);
    animation: ed-in 0.2s cubic-bezier(0.16,1,0.3,1) both;
  }
  .ed-panel.narrow { max-width: 1020px; }
  .ed-panel.wide   { max-width: 1420px; }

  /* ── Header ── */
  .ed-header {
    padding: 13px 22px;
    border-bottom: 1px solid oklch(24% 0.022 255);
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 10;
    background: oklch(17% 0.025 255);
  }
  .ed-header-left { display: flex; flex-direction: column; gap: 3px; }
  .ed-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 17px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(94% 0.007 255);
    display: flex; align-items: center; gap: 10px; margin: 0;
  }
  .ed-wiki-link {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px;
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 4px;
    color: oklch(50% 0.013 255);
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    font-family: 'Barlow', system-ui, sans-serif;
    text-decoration: none;
    transition: color 0.12s, border-color 0.12s, background 0.12s;
  }
  .ed-wiki-link:hover { color: oklch(94% 0.007 255); border-color: oklch(44% 0.014 255); background: oklch(25% 0.021 255); }
  .ed-subtitle { font-size: 11.5px; color: oklch(42% 0.013 255); display: flex; align-items: center; gap: 8px; }
  .ed-draft-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 2px 8px;
    background: oklch(76% 0.16 68 / 0.10);
    border: 1px solid oklch(76% 0.16 68 / 0.30);
    border-radius: 4px;
    color: oklch(76% 0.16 68);
    font-size: 10.5px;
  }
  .ed-draft-discard {
    background: none; border: none; padding: 0;
    color: oklch(62% 0.22 25); font-size: 10.5px; cursor: pointer;
    text-decoration: underline; font-family: 'Barlow', system-ui, sans-serif;
  }

  /* ── Body layout ── */
  .ed-body { padding: 20px 22px; display: flex; gap: 20px; flex-wrap: wrap; }
  .ed-col-editor  { flex: 1 1 460px; min-width: 300px; }
  .ed-col-preview { flex: 1 1 280px; min-width: 260px; }
  .ed-col-ref     { flex: 1 1 280px; min-width: 260px; max-width: 340px; }

  /* ── Section labels ── */
  .ed-label {
    font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;
    color: oklch(42% 0.013 255); margin-bottom: 7px;
  }

  /* ── Color / format buttons ── */
  .ed-toolbar { display: flex; gap: 3px; flex-wrap: wrap; margin-bottom: 7px; }
  .ed-color-btn {
    width: 22px; height: 22px; border: none; border-radius: 3px; cursor: pointer;
    transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
    flex-shrink: 0;
  }
  .ed-color-btn:hover { transform: scale(1.2); box-shadow: 0 0 0 1px oklch(94% 0.007 255 / 0.3); }

  .ed-fmt-btns { display: flex; gap: 5px; flex-wrap: wrap; }
  .ed-fmt-btn {
    padding: 3px 9px;
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 4px;
    color: oklch(58% 0.012 255);
    font-size: 11px; font-weight: 600; cursor: pointer;
    font-family: 'Barlow', system-ui, sans-serif;
    transition: color 0.1s, border-color 0.1s;
  }
  .ed-fmt-btn:hover { color: oklch(94% 0.007 255); border-color: oklch(44% 0.014 255); }

  /* ── Template field buttons ── */
  .ed-templates { display: flex; gap: 5px; flex-wrap: wrap; }
  .ed-tpl-btn {
    padding: 4px 10px;
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 4px;
    color: oklch(58% 0.012 255);
    font-size: 11.5px; font-weight: 600; cursor: pointer;
    white-space: nowrap; font-family: 'Barlow', system-ui, sans-serif;
    transition: color 0.1s, border-color 0.1s, background 0.1s;
  }
  .ed-tpl-btn:hover { color: oklch(94% 0.007 255); border-color: oklch(44% 0.014 255); background: oklch(25% 0.021 255); }

  /* ── Reference toggle ── */
  .ed-ref-toggle {
    width: 100%; padding: 7px 12px; cursor: pointer;
    background: transparent;
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 5px;
    color: oklch(50% 0.013 255);
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    font-family: 'Barlow', system-ui, sans-serif;
    transition: color 0.12s, border-color 0.12s, background 0.12s;
  }
  .ed-ref-toggle:hover { color: oklch(94% 0.007 255); border-color: oklch(44% 0.014 255); }
  .ed-ref-toggle.active { color: oklch(76% 0.16 68); border-color: oklch(76% 0.16 68 / 0.40); background: oklch(76% 0.16 68 / 0.08); }

  /* ── Line editors ── */
  .ed-lines { display: flex; flex-direction: column; gap: 5px; }
  .ed-line-row { display: flex; gap: 6px; align-items: center; }
  .ed-line-num { color: oklch(34% 0.015 255); font-size: 11px; width: 18px; text-align: right; font-family: monospace; flex-shrink: 0; }
  .ed-line-dash { color: oklch(30% 0.019 255); font-size: 12px; font-family: monospace; flex-shrink: 0; }
  .ed-line-input {
    flex: 1; padding: 7px 10px;
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 5px;
    color: oklch(94% 0.007 255);
    font-size: 12px; font-family: 'Courier New', monospace; outline: none;
    transition: border-color 0.1s, background 0.1s;
  }
  .ed-line-input:focus, .ed-line-input.active { border-color: oklch(76% 0.16 68 / 0.6); background: oklch(22.5% 0.022 255); }
  .ed-line-input::placeholder { color: oklch(34% 0.015 255); }
  .ed-line-btns { display: flex; gap: 2px; flex-shrink: 0; }
  .ed-line-btn {
    padding: 4px 6px; cursor: pointer;
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 4px;
    color: oklch(50% 0.013 255);
    transition: color 0.1s, border-color 0.1s;
    display: flex; align-items: center;
  }
  .ed-line-btn:hover:not(:disabled) { color: oklch(94% 0.007 255); border-color: oklch(44% 0.014 255); }
  .ed-line-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .ed-line-btn.copied { border-color: oklch(62% 0.20 142 / 0.5); color: oklch(62% 0.20 142); background: oklch(62% 0.20 142 / 0.08); }
  .ed-line-btn.delete:hover:not(:disabled) { color: oklch(62% 0.22 25); border-color: oklch(62% 0.22 25 / 0.5); }
  .ed-add-line-btn {
    margin-top: 8px; width: 100%; padding: 7px 12px; cursor: pointer;
    background: transparent;
    border: 1px dashed oklch(30% 0.019 255);
    border-radius: 5px;
    color: oklch(42% 0.013 255);
    font-size: 12px; font-family: 'Barlow', system-ui, sans-serif;
    transition: color 0.1s, border-color 0.1s;
  }
  .ed-add-line-btn:hover { color: oklch(74% 0.012 255); border-color: oklch(44% 0.014 255); }

  /* ── Preview box ── */
  .ed-preview-box {
    background: oklch(5% 0.025 300);
    border: 1px solid oklch(18% 0.015 290);
    border-radius: 5px;
    padding: 12px 14px;
    font-family: 'Courier New', monospace;
    font-size: 13px; line-height: 1.6;
    min-height: 200px;
  }
  .ed-preview-empty { color: oklch(35% 0.016 255); font-style: italic; }

  /* ── Code block ── */
  .ed-code-block {
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 5px;
    padding: 10px 12px;
    font-family: 'Courier New', monospace;
    font-size: 11px; line-height: 1.5;
    color: oklch(58% 0.012 255);
    max-height: 120px; overflow: auto;
  }
  .ed-code-key { color: oklch(76% 0.16 68); }

  /* ── Quick ref ── */
  .ed-qref { font-size: 10.5px; color: oklch(42% 0.013 255); margin-top: 14px; }
  .ed-qref-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 14px; margin-top: 5px; }

  /* ── Reference panel ── */
  .ed-ref-panel {
    background: oklch(18.5% 0.024 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 7px;
    padding: 12px;
    display: flex; flex-direction: column;
  }
  .ed-ref-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .ed-ref-search {
    width: 100%; box-sizing: border-box; padding: 7px 10px; margin-bottom: 8px;
    background: oklch(17% 0.025 255);
    border: 1px solid oklch(30% 0.019 255); border-radius: 5px;
    color: oklch(94% 0.007 255); font-size: 12.5px; outline: none;
    font-family: 'Barlow', system-ui, sans-serif;
    transition: border-color 0.12s;
  }
  .ed-ref-search:focus { border-color: oklch(44% 0.014 255); }
  .ed-ref-search::placeholder { color: oklch(42% 0.013 255); }
  .ed-ref-list { background: oklch(17% 0.025 255); border-radius: 4px; padding: 4px; overflow-y: auto; }
  .ed-ref-item {
    padding: 6px 8px; border-radius: 4px; cursor: pointer;
    display: flex; align-items: center; gap: 8px;
    transition: background 0.1s;
    font-size: 12.5px; color: oklch(74% 0.012 255);
  }
  .ed-ref-item:hover { background: oklch(21% 0.023 255); }
  .ed-ref-item.selected { background: oklch(76% 0.16 68 / 0.10); color: oklch(94% 0.007 255); }
  .ed-ref-preview {
    background: oklch(17% 0.025 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 5px;
    padding: 10px 12px; margin-top: 8px;
  }
  .ed-ref-preview-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .ed-ref-preview-name { font-size: 11.5px; font-weight: 600; color: oklch(74% 0.012 255); }
  .ed-ref-lines { font-family: 'Courier New', monospace; font-size: 11.5px; line-height: 1.6; }
  .ed-ref-line-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .ed-ref-line-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ed-ref-copy-btn {
    padding: 2px 6px; cursor: pointer; flex-shrink: 0;
    background: none; border: 1px solid oklch(30% 0.019 255); border-radius: 3px;
    color: oklch(42% 0.013 255); font-size: 10px;
    font-family: 'Barlow', system-ui, sans-serif;
    transition: color 0.1s, border-color 0.1s;
  }
  .ed-ref-copy-btn:hover { color: oklch(76% 0.16 68); border-color: oklch(76% 0.16 68 / 0.4); }
  .ed-ref-copy-btn.done { color: oklch(62% 0.20 142); border-color: oklch(62% 0.20 142 / 0.4); }

  /* ── Auth / GitHub section ── */
  .ed-auth { padding: 16px 22px; border-bottom: 1px solid oklch(24% 0.022 255); }
  .ed-auth-desc { font-size: 13px; color: oklch(58% 0.012 255); margin-bottom: 12px; line-height: 1.6; }
  .ed-auth-desc a { color: oklch(60% 0.09 200); text-decoration: none; }
  .ed-auth-desc code { background: oklch(23% 0.022 255); border: 1px solid oklch(30% 0.019 255); padding: 1px 5px; border-radius: 3px; font-size: 11px; }
  .ed-auth-row { display: flex; gap: 8px; margin-bottom: 10px; }
  .ed-auth-user { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .ed-auth-user-info { display: flex; align-items: center; gap: 10px; }
  .ed-auth-avatar { width: 28px; height: 28px; border-radius: 50%; }
  .ed-auth-name { font-size: 13px; font-weight: 600; color: oklch(62% 0.20 142); display: flex; align-items: center; gap: 4px; }
  .ed-auth-sub { font-size: 11px; color: oklch(42% 0.013 255); }
  .ed-branch-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .ed-branch-label { font-size: 11.5px; color: oklch(42% 0.013 255); white-space: nowrap; }
  .ed-warn-pill {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; color: oklch(82% 0.16 90);
    background: oklch(82% 0.16 90 / 0.08);
    border: 1px solid oklch(82% 0.16 90 / 0.25);
    border-radius: 4px; padding: 2px 8px;
  }

  /* ── Generic inputs / selects / buttons ── */
  .ed-input {
    padding: 8px 11px;
    background: oklch(21% 0.023 255); border: 1px solid oklch(30% 0.019 255);
    border-radius: 6px; color: oklch(94% 0.007 255);
    font-size: 13px; outline: none; font-family: 'Barlow', system-ui, sans-serif;
    transition: border-color 0.12s;
  }
  .ed-input:focus { border-color: oklch(44% 0.014 255); }
  .ed-input::placeholder { color: oklch(42% 0.013 255); }
  .ed-input.flex1 { flex: 1; }
  .ed-select {
    appearance: none; padding: 7px 10px; min-width: 150px;
    background: oklch(21% 0.023 255); border: 1px solid oklch(30% 0.019 255);
    border-radius: 5px; color: oklch(74% 0.012 255);
    font-size: 12.5px; cursor: pointer; outline: none;
    font-family: 'Barlow', system-ui, sans-serif;
  }
  .ed-btn {
    display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;
    background: none; border: 1px solid oklch(30% 0.019 255); border-radius: 6px;
    font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(50% 0.013 255); cursor: pointer; white-space: nowrap;
    font-family: 'Barlow', system-ui, sans-serif;
    transition: color 0.12s, border-color 0.12s, background 0.12s;
  }
  .ed-btn:hover:not(:disabled) { color: oklch(94% 0.007 255); border-color: oklch(44% 0.014 255); }
  .ed-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .ed-btn-primary {
    background: oklch(76% 0.16 68); border-color: oklch(76% 0.16 68);
    color: oklch(14% 0.01 50); font-weight: 700;
  }
  .ed-btn-primary:hover:not(:disabled) { background: oklch(80% 0.16 68); color: oklch(10% 0.01 50); border-color: oklch(80% 0.16 68); }
  .ed-btn-primary:disabled { background: oklch(30% 0.019 255); border-color: oklch(30% 0.019 255); color: oklch(42% 0.013 255); opacity: 1; }
  .ed-btn-icon { padding: 6px; gap: 0; border-radius: 5px; }
  .ed-btn-ghost { background: none; border: none; color: oklch(42% 0.013 255); cursor: pointer; padding: 0; font-size: 12px; font-family: 'Barlow', system-ui, sans-serif; }
  .ed-btn-ghost:hover { color: oklch(94% 0.007 255); }
  .ed-btn-delete { border-color: oklch(62% 0.22 25 / 0.35); color: oklch(62% 0.22 25); }
  .ed-btn-delete:hover:not(:disabled) { background: oklch(62% 0.22 25 / 0.10); border-color: oklch(62% 0.22 25 / 0.6); color: oklch(62% 0.22 25); }
  .ed-btn-delete.confirming { background: oklch(62% 0.22 25); border-color: oklch(62% 0.22 25); color: oklch(94% 0.007 255); font-weight: 700; }
  .ed-btn-lg { padding: 10px 22px; font-size: 13px; }
  .ed-remember { display: flex; align-items: center; gap: 6px; font-size: 12px; color: oklch(58% 0.012 255); cursor: pointer; user-select: none; }

  /* ── Status banner ── */
  .ed-status {
    padding: 9px 13px; border-radius: 5px; margin-bottom: 14px; font-size: 13px;
    border: 1px solid;
  }
  .ed-status.info    { background: oklch(60% 0.09 200 / 0.08); border-color: oklch(60% 0.09 200 / 0.3); color: oklch(60% 0.09 200); }
  .ed-status.success { background: oklch(62% 0.20 142 / 0.08); border-color: oklch(62% 0.20 142 / 0.3); color: oklch(62% 0.20 142); }
  .ed-status.warning { background: oklch(82% 0.16 90 / 0.08);  border-color: oklch(82% 0.16 90 / 0.3);  color: oklch(82% 0.16 90);  }
  .ed-status.error   { background: oklch(62% 0.22 25 / 0.10);  border-color: oklch(62% 0.22 25 / 0.30);  color: oklch(72% 0.18 25);  }

  /* ── Footer ── */
  .ed-footer {
    padding: 14px 22px; border-top: 1px solid oklch(24% 0.022 255);
    background: oklch(18.5% 0.024 255);
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    flex-wrap: wrap;
  }
  .ed-footer-right { display: flex; gap: 8px; align-items: center; }
`;


// Common field templates based on config.yml patterns
const FIELD_TEMPLATES = [
    {
        name: 'Structure',
        template: '&7Structure: &a',
        placeholder: 'Village, Desert Pyramid...'
    },
    {
        name: 'Biomes',
        template: '&7Biomes: &a',
        placeholder: 'Desert, Plains...'
    },
    {
        name: 'Tool',
        template: '&7Tool: &a',
        placeholder: 'Pickaxe, any (Silk Touch required)...'
    },
    {
        name: 'Chance',
        template: '&7Chance: &a',
        placeholder: '25%, 6.7%...'
    },
    {
        name: 'Mob Drop',
        template: '&7Mob-Drop: &a',
        placeholder: 'Zombie, Ender Dragon...'
    },
    {
        name: 'Trading',
        template: '&7Trading: &a',
        placeholder: 'Armorer - Level 2 (Apprentice)...'
    },
    {
        name: 'Workstation',
        template: '&7Workstation: &a',
        placeholder: 'Blast Furnace, Brewing Stand...'
    },
    {
        name: 'Characteristics',
        template: '&7Characteristics: &a',
        placeholder: 'pink, blue...'
    },
    {
        name: 'Empty Line',
        template: '&7',
        placeholder: null
    },
    {
        name: 'Custom Text',
        template: '&7',
        placeholder: 'Custom description text...'
    }
];

// GitHub API configuration
const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'btlmt-de';
const REPO_NAME = 'FIB';
const FILE_PATH = 'config.yml';
const DEFAULT_BRANCH = 'main';

// Optional: Allowlist of GitHub usernames that can edit (leave empty to allow anyone with repo write access)
// If empty, GitHub's own permission system handles access control
const ALLOWED_USERS = []; // e.g., ['username1', 'username2']

// Draft auto-save key prefix
const DRAFT_KEY_PREFIX = 'fib_draft_';

// Draft storage functions
function getDraftKey(material) {
    return `${DRAFT_KEY_PREFIX}${material}`;
}

function getStoredDraft(material) {
    try {
        const draft = localStorage.getItem(getDraftKey(material));
        if (draft) {
            const { lines, timestamp } = JSON.parse(draft);
            return { lines, timestamp };
        }
    } catch (e) {
        console.error('Draft read error:', e);
    }
    return null;
}

function storeDraft(material, lines) {
    try {
        localStorage.setItem(getDraftKey(material), JSON.stringify({
            lines,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.error('Draft write error:', e);
    }
}

function clearDraft(material) {
    try {
        localStorage.removeItem(getDraftKey(material));
    } catch (e) {
        console.error('Draft clear error:', e);
    }
}

// Parse Minecraft formatting codes into styled spans
function parseMinecraftFormatting(text) {
    if (!text) return null;

    const parts = [];
    let currentColor = MC_BASE_COLOR;
    let isBold = false;
    let isItalic = false;
    let isUnderline = false;
    let isStrike = false;
    let currentText = '';

    let i = 0;
    while (i < text.length) {
        if (text[i] === '&' && i + 1 < text.length) {
            if (currentText) {
                parts.push({ text: currentText, color: currentColor, bold: isBold, italic: isItalic, underline: isUnderline, strike: isStrike });
                currentText = '';
            }

            const code = text[i + 1].toLowerCase();
            if (MC_COLORS[code]) {
                currentColor = MC_COLORS[code];
            } else if (code === 'l') {
                isBold = true;
            } else if (code === 'o') {
                isItalic = true;
            } else if (code === 'n') {
                isUnderline = true;
            } else if (code === 'm') {
                isStrike = true;
            } else if (code === 'r') {
                currentColor = MC_BASE_COLOR;
                isBold = false;
                isItalic = false;
                isUnderline = false;
                isStrike = false;
            }
            i += 2;
        } else {
            currentText += text[i];
            i++;
        }
    }

    if (currentText) {
        parts.push({ text: currentText, color: currentColor, bold: isBold, italic: isItalic, underline: isUnderline, strike: isStrike });
    }

    return parts;
}

function FormattedLine({ text }) {
    const parts = parseMinecraftFormatting(text);
    if (!parts || parts.length === 0) return <span style={{ minHeight: '20px', display: 'inline-block' }}>&nbsp;</span>;

    return (
        <>
            {parts.map((part, idx) => (
                <span
                    key={idx}
                    style={{
                        color: part.color,
                        fontWeight: part.bold ? '700' : '400',
                        fontStyle: part.italic ? 'italic' : 'normal',
                        textDecoration: [
                            part.underline ? 'underline' : '',
                            part.strike ? 'line-through' : ''
                        ].filter(Boolean).join(' ') || 'none'
                    }}
                >
                    {part.text}
                </span>
            ))}
        </>
    );
}

// Decode base64 to UTF-8 properly (atob alone corrupts non-ASCII characters)
function decodeBase64UTF8(base64String) {
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
}

// GitHub API helper functions
async function getAuthenticatedUser(token) {
    const response = await fetch(`${GITHUB_API}/user`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        throw new Error('Invalid token or authentication failed');
    }

    return response.json();
}

async function checkRepoAccess(token) {
    const response = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        throw new Error('Cannot access repository');
    }

    const repo = await response.json();
    // Check if user has push permission
    return repo.permissions?.push === true;
}

async function fetchBranches(token) {
    const response = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/branches?per_page=100`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        console.error('Failed to fetch branches');
        return [DEFAULT_BRANCH];
    }

    const branches = await response.json();
    return branches.map(b => b.name);
}

async function getFileContent(token, branch) {
    const response = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${branch}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch file');
    }

    return response.json();
}

async function updateFile(token, content, sha, message, branch) {
    const response = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message,
            content: btoa(unescape(encodeURIComponent(content))),
            sha,
            branch
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update file');
    }

    return response.json();
}

// Token storage
const TOKEN_KEY = 'fib_github_token';
const USER_KEY = 'fib_github_user';
const BRANCH_KEY = 'fib_github_branch';

function getStoredToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

function getStoredUser() {
    try {
        const user = localStorage.getItem(USER_KEY);
        return user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
}

function getStoredBranch() {
    try {
        return localStorage.getItem(BRANCH_KEY) || DEFAULT_BRANCH;
    } catch {
        return DEFAULT_BRANCH;
    }
}

function storeAuth(token, user) {
    try {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }
    } catch {
        // Ignore storage errors
    }
}

function storeBranch(branch) {
    try {
        localStorage.setItem(BRANCH_KEY, branch);
    } catch {
        // Ignore storage errors
    }
}

// Generate default header for an item
function generateDefaultHeader(displayName) {
    return `&b&l${displayName} &7| &6Item Information`;
}

// Color picker button component
function ColorButton({ code, onClick }) {
    return (
        <button
            className="ed-color-btn"
            onClick={() => onClick(`&${code}`)}
            title={COLOR_NAMES[code]}
            style={{
                background: MC_COLORS[code],
                border: code === '0' ? '1px solid oklch(34% 0.015 255)' : 'none',
            }}
        />
    );
}

function FormatButton({ code, name, onClick }) {
    return (
        <button
            className="ed-fmt-btn"
            onClick={() => onClick(`&${code}`)}
            style={{
                fontWeight:     code === 'l' ? '700' : undefined,
                fontStyle:      code === 'o' ? 'italic' : undefined,
                textDecoration: code === 'n' ? 'underline' : code === 'm' ? 'line-through' : undefined,
            }}
        >
            {name}
        </button>
    );
}

function TemplateButton({ template, onClick }) {
    return (
        <button className="ed-tpl-btn" onClick={() => onClick(template)}>
            {template.name}
        </button>
    );
}


export default function DescriptionEditor({ item, allItems = [], onClose, onSave }) {
    // Check for existing draft
    const existingDraft = getStoredDraft(item.material);

    // Initialize with draft, existing description, or default template
    const getInitialLines = () => {
        // Check for saved draft first
        if (existingDraft) {
            return [...existingDraft.lines];
        }
        if (item.description && item.description.length > 0) {
            return [...item.description];
        }
        // Default template for new descriptions
        return [
            generateDefaultHeader(item.displayName),
            '&7',  // Empty line
        ];
    };

    const [lines, setLines] = useState(getInitialLines);
    const [githubToken, setGithubToken] = useState(() => getStoredToken() || '');
    const [githubUser, setGithubUser] = useState(() => getStoredUser());
    const [showTokenInput, setShowTokenInput] = useState(() => !getStoredToken());
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [activeLineIndex, setActiveLineIndex] = useState(lines.length - 1);
    const [verifyingToken, setVerifyingToken] = useState(false);
    const [hasAccess, setHasAccess] = useState(null);
    const [branches, setBranches] = useState([DEFAULT_BRANCH]);
    const [selectedBranch, setSelectedBranch] = useState(() => getStoredBranch());
    const [hasDraft, setHasDraft] = useState(!!existingDraft);
    const [draftTimestamp, setDraftTimestamp] = useState(existingDraft?.timestamp || null);

    // Reference panel state
    const [showReference, setShowReference] = useState(false);
    const [referenceSearch, setReferenceSearch] = useState('');
    const [selectedReference, setSelectedReference] = useState(null);
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Filter items for reference search (only items with descriptions, excluding current item)
    const referenceItems = allItems.filter(i =>
        i.material !== item.material &&
        i.description &&
        i.description.length > 0 &&
        (referenceSearch === '' ||
            i.displayName.toLowerCase().includes(referenceSearch.toLowerCase()) ||
            i.material.toLowerCase().includes(referenceSearch.toLowerCase()))
    ).slice(0, 20); // Limit to 20 results

    // Check if item has an existing description (not just default template)
    const hasExistingDescription = item.description && item.description.length > 0;

    // Auto-save draft when lines change (debounced)
    useEffect(() => {
        // Don't save if lines match the original description exactly
        const originalLines = item.description || [];
        const linesMatch = lines.length === originalLines.length &&
            lines.every((line, i) => line === originalLines[i]);

        if (linesMatch) {
            // Clear draft if we're back to original
            clearDraft(item.material);
            setHasDraft(false);
            return;
        }

        // Debounce the save
        const timeoutId = setTimeout(() => {
            storeDraft(item.material, lines);
            setHasDraft(true);
            setDraftTimestamp(Date.now());
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [lines, item.material, item.description]);

    // Verify token on mount if we have one stored
    useEffect(() => {
        if (githubToken && !githubUser) {
            verifyToken(githubToken);
        } else if (githubUser) {
            setHasAccess(true);
            // Fetch branches if we have a stored user
            fetchBranches(githubToken).then(branchList => {
                setBranches(branchList);
                // Validate that selected branch exists, fall back to default if not
                if (!branchList.includes(selectedBranch)) {
                    console.warn(`Branch "${selectedBranch}" not found, falling back to ${DEFAULT_BRANCH}`);
                    setSelectedBranch(DEFAULT_BRANCH);
                }
            });
        }

        // Show notification if draft was restored
        if (existingDraft) {
            setSaveStatus({
                type: 'info',
                message: `Draft restored from ${new Date(existingDraft.timestamp).toLocaleString()}`
            });
            // Auto-clear after 3 seconds
            setTimeout(() => setSaveStatus(null), 3000);
        }
    }, []);

    // Store selected branch when it changes
    useEffect(() => {
        storeBranch(selectedBranch);
    }, [selectedBranch]);

    const verifyToken = async (token) => {
        setVerifyingToken(true);
        setSaveStatus({ type: 'info', message: 'Verifying GitHub access...' });

        try {
            // Parallelize independent API calls (react-best-practices rule 1.4)
            const [user, canPush, branchList] = await Promise.all([
                getAuthenticatedUser(token),
                checkRepoAccess(token),
                fetchBranches(token),
            ]);

            // Check allowlist if configured
            if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(user.login)) {
                throw new Error(`User @${user.login} is not in the allowed editors list`);
            }

            // Check repo write access
            if (!canPush) {
                throw new Error(`User @${user.login} does not have write access to ${REPO_OWNER}/${REPO_NAME}`);
            }

            // Set branches
            setBranches(branchList);

            // Validate that selected branch exists, fall back to default if not
            if (!branchList.includes(selectedBranch)) {
                console.warn(`Branch "${selectedBranch}" not found, falling back to ${DEFAULT_BRANCH}`);
                setSelectedBranch(DEFAULT_BRANCH);
            }

            setGithubUser(user);
            setHasAccess(true);
            storeAuth(token, user);
            setShowTokenInput(false);
            setSaveStatus({ type: 'success', message: `Authenticated as @${user.login}` });
            setTimeout(() => setSaveStatus(null), 3000);

        } catch (error) {
            setHasAccess(false);
            storeAuth(null, null);
            setSaveStatus({ type: 'error', message: error.message });
        } finally {
            setVerifyingToken(false);
        }
    };

    // Refresh branches handler
    const handleRefreshBranches = async () => {
        if (!githubToken) return;
        setSaveStatus({ type: 'info', message: 'Refreshing branches...' });
        try {
            const branchList = await fetchBranches(githubToken);
            setBranches(branchList);
            // Re-validate selected branch exists
            if (!branchList.includes(selectedBranch)) {
                setSelectedBranch(DEFAULT_BRANCH);
            }
            setSaveStatus({ type: 'success', message: `Found ${branchList.length} branches` });
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (error) {
            setSaveStatus({ type: 'error', message: 'Failed to refresh branches: ' + error.message });
        }
    };

    const insertCode = useCallback((code) => {
        const textarea = document.getElementById(`line-editor-${activeLineIndex}`);
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentLine = lines[activeLineIndex] || '';
        const newLine = currentLine.slice(0, start) + code + currentLine.slice(end);

        const newLines = [...lines];
        newLines[activeLineIndex] = newLine;
        setLines(newLines);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + code.length, start + code.length);
        }, 0);
    }, [lines, activeLineIndex]);

    const updateLine = (index, value) => {
        const newLines = [...lines];
        newLines[index] = value;
        setLines(newLines);
    };

    const addLine = (template = null) => {
        const newLine = template ? template.template : '';
        setLines([...lines, newLine]);
        setActiveLineIndex(lines.length);

        // Focus the new input after render
        setTimeout(() => {
            const input = document.getElementById(`line-editor-${lines.length}`);
            if (input) {
                input.focus();
                // Position cursor at end of template
                input.setSelectionRange(newLine.length, newLine.length);
            }
        }, 50);
    };

    const removeLine = (index) => {
        if (lines.length <= 1) return;
        const newLines = lines.filter((_, i) => i !== index);
        setLines(newLines);
        if (activeLineIndex >= newLines.length) {
            setActiveLineIndex(Math.max(0, newLines.length - 1));
        }
    };

    const moveLine = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= lines.length) return;

        const newLines = [...lines];
        [newLines[index], newLines[newIndex]] = [newLines[newIndex], newLines[index]];
        setLines(newLines);
        setActiveLineIndex(newIndex);
    };

    const handleSave = async () => {
        if (!githubToken || !hasAccess) {
            setShowTokenInput(true);
            setSaveStatus({ type: 'error', message: 'Please authenticate with GitHub first' });
            return;
        }

        // Filter out completely empty lines at the end, but keep &7 spacers
        const cleanedLines = [...lines];
        while (cleanedLines.length > 1 && cleanedLines[cleanedLines.length - 1] === '') {
            cleanedLines.pop();
        }

        setSaving(true);
        setSaveStatus({ type: 'info', message: `Fetching current config from ${selectedBranch}...` });

        try {
            const fileData = await getFileContent(githubToken, selectedBranch);
            const currentContent = decodeBase64UTF8(fileData.content);

            setSaveStatus({ type: 'info', message: 'Updating description...' });
            const newContent = updateDescriptionInConfig(currentContent, item.material, cleanedLines);

            setSaveStatus({ type: 'info', message: `Pushing to ${selectedBranch}...` });
            await updateFile(
                githubToken,
                newContent,
                fileData.sha,
                `Update description for ${item.material}`,
                selectedBranch
            );

            setSaveStatus({ type: 'success', message: `Successfully saved to ${selectedBranch}!` });

            // Clear draft since we've saved successfully
            clearDraft(item.material);
            setHasDraft(false);

            // Invalidate cache - clear both old and new cache keys and set edit timestamp
            try {
                localStorage.removeItem('forceitem_pools_cache_v2');
                localStorage.removeItem('forceitem_pools_cache_v3');
                localStorage.setItem('forceitem_last_edit', Date.now().toString());
            } catch {}

            setTimeout(() => {
                onSave && onSave(item.material, cleanedLines);
                onClose();
            }, 1500);

        } catch (error) {
            console.error('Save error:', error);
            setSaveStatus({ type: 'error', message: `Error: ${error.message}` });
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        storeAuth(null, null);
        setGithubToken('');
        setGithubUser(null);
        setHasAccess(null);
        setShowTokenInput(true);
        setSaveStatus(null);
    };

    const handleDiscardDraft = () => {
        clearDraft(item.material);
        setHasDraft(false);
        // Reset to original description or default template
        if (item.description && item.description.length > 0) {
            setLines([...item.description]);
        } else {
            setLines([
                generateDefaultHeader(item.displayName),
                '&7',
            ]);
        }
        setSaveStatus({ type: 'info', message: 'Draft discarded' });
        setTimeout(() => setSaveStatus(null), 2000);
    };

    const handleDelete = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            setSaveStatus({ type: 'warning', message: 'Click "Delete" again to confirm deletion' });
            return;
        }

        if (!githubToken || !hasAccess) {
            setShowTokenInput(true);
            setSaveStatus({ type: 'error', message: 'Please authenticate with GitHub first' });
            return;
        }

        setDeleting(true);
        setSaveStatus({ type: 'info', message: `Fetching current config from ${selectedBranch}...` });

        try {
            const fileData = await getFileContent(githubToken, selectedBranch);
            const currentContent = decodeBase64UTF8(fileData.content);

            setSaveStatus({ type: 'info', message: 'Removing description...' });
            const newContent = deleteDescriptionFromConfig(currentContent, item.material);

            setSaveStatus({ type: 'info', message: `Pushing to ${selectedBranch}...` });
            await updateFile(
                githubToken,
                newContent,
                fileData.sha,
                `Delete description for ${item.material}`,
                selectedBranch
            );

            setSaveStatus({ type: 'success', message: `Description deleted from ${selectedBranch}!` });

            // Clear draft since we've deleted successfully
            clearDraft(item.material);
            setHasDraft(false);

            // Invalidate cache
            try {
                localStorage.removeItem('forceitem_pools_cache_v2');
                localStorage.removeItem('forceitem_pools_cache_v3');
                localStorage.setItem('forceitem_last_edit', Date.now().toString());
            } catch {}

            setTimeout(() => {
                onSave && onSave(item.material, null);
                onClose();
            }, 1500);

        } catch (error) {
            console.error('Delete error:', error);
            setSaveStatus({ type: 'error', message: `Error: ${error.message}` });
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    // Delete description from config.yml
    function deleteDescriptionFromConfig(content, materialName) {
        const configLines = content.split('\n');
        const result = [];
        let inDescriptions = false;
        let inTargetItem = false;

        for (let i = 0; i < configLines.length; i++) {
            const line = configLines[i];

            if (line.trim() === 'descriptions:') {
                inDescriptions = true;
                result.push(line);
                continue;
            }

            if (inDescriptions) {
                // Check if we've exited the descriptions section
                if (line.match(/^[a-zA-Z]/) && !line.startsWith(' ')) {
                    inDescriptions = false;
                    inTargetItem = false;
                    result.push(line);
                    continue;
                }

                // Check for item name
                const itemMatch = line.match(/^\s{2}([A-Z_0-9]+):\s*$/);
                if (itemMatch) {
                    if (itemMatch[1] === materialName) {
                        // This is our target item - skip it entirely
                        inTargetItem = true;
                        continue;
                    } else {
                        inTargetItem = false;
                        result.push(line);
                        continue;
                    }
                }

                // Skip all lines belonging to target item
                if (inTargetItem) {
                    continue;
                }

                // Skip empty lines in descriptions section
                if (line.trim() === '' || line.match(/^\s+$/)) {
                    continue;
                }

                result.push(line);
            } else {
                result.push(line);
            }
        }

        return result.join('\n');
    }

    // Update description in config.yml content with proper YAML formatting
    function updateDescriptionInConfig(content, materialName, descriptionLines) {
        const configLines = content.split('\n');
        const result = [];
        let inDescriptions = false;
        let inTargetItem = false;
        let targetFound = false;

        for (let i = 0; i < configLines.length; i++) {
            const line = configLines[i];

            if (line.trim() === 'descriptions:') {
                inDescriptions = true;
                result.push(line);
                continue;
            }

            if (inDescriptions) {
                // Check if we've exited the descriptions section (new top-level key)
                if (line.match(/^[a-zA-Z]/) && !line.startsWith(' ')) {
                    // If we were in target item, we're done with it
                    if (inTargetItem) {
                        inTargetItem = false;
                    }
                    // Add new item at end if not found yet
                    if (!targetFound) {
                        result.push(`  ${materialName}:`);
                        descriptionLines.forEach(descLine => {
                            result.push(`    - "${descLine}"`);
                        });
                        targetFound = true;
                    }
                    inDescriptions = false;
                    result.push(line);
                    continue;
                }

                // Check for item name (e.g., "  ITEM_NAME:")
                const itemMatch = line.match(/^\s{2}([A-Z_0-9]+):\s*$/);
                if (itemMatch) {
                    // If we were in target item, we're now leaving it
                    if (inTargetItem) {
                        inTargetItem = false;
                    }

                    if (itemMatch[1] === materialName) {
                        // This is our target item - replace it
                        result.push(`  ${materialName}:`);
                        descriptionLines.forEach(descLine => {
                            result.push(`    - "${descLine}"`);
                        });
                        inTargetItem = true;
                        targetFound = true;
                        continue;
                    } else {
                        // Different item - keep it
                        result.push(line);
                        continue;
                    }
                }

                // Check for description line (e.g., '    - "text"')
                if (line.match(/^\s{4}-\s*"/)) {
                    if (inTargetItem) {
                        // Skip description lines of target item (we already added new ones)
                        continue;
                    } else {
                        // Keep description lines of other items
                        result.push(line);
                        continue;
                    }
                }

                // Handle empty lines or other content within descriptions section
                if (line.trim() === '' || line.match(/^\s+$/)) {
                    if (inTargetItem) {
                        // Skip empty lines that were part of target item
                        continue;
                    }
                    // Skip empty lines in descriptions section entirely to keep it clean
                    continue;
                }

                // Any other indented content - keep it unless we're in target item
                if (!inTargetItem) {
                    result.push(line);
                }
            } else {
                result.push(line);
            }
        }

        // Handle case where descriptions section ends at EOF
        if (inDescriptions && !targetFound) {
            result.push(`  ${materialName}:`);
            descriptionLines.forEach(descLine => {
                result.push(`    - "${descLine}"`);
            });
        }

        return result.join('\n');
    }


    return (
        <div className="ed ed-overlay" onClick={onClose}>
            <style>{EDITOR_CSS}</style>
            <div
                className={`ed-panel ${showReference ? 'wide' : 'narrow'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className="ed-header">
                    <div className="ed-header-left">
                        <h2 className="ed-title">
                            Edit Description: {item.displayName}
                            <a
                                href={`https://minecraft.wiki/w/${item.displayName.replace(/ /g, '_')}`}
                                target="_blank" rel="noopener noreferrer"
                                title="Open Minecraft Wiki"
                                className="ed-wiki-link"
                            >
                                <BookOpen size={12} /> Wiki
                            </a>
                        </h2>
                        <div className="ed-subtitle">
                            <span>{item.material}</span>
                            {hasDraft && (
                                <span className="ed-draft-pill">
                                    <Save size={11} />
                                    Draft{draftTimestamp && ` · ${new Date(draftTimestamp).toLocaleTimeString()}`}
                                    <button className="ed-draft-discard" onClick={handleDiscardDraft}>
                                        Discard
                                    </button>
                                </span>
                            )}
                        </div>
                    </div>
                    <button className="ed-btn ed-btn-icon" onClick={onClose} style={{ border: 'none', color: C.dim }}>
                        <X size={18} />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="ed-body">

                    {/* ── Editor column ── */}
                    <div className="ed-col-editor">

                        {/* Colors */}
                        <div style={{ marginBottom: 14 }}>
                            <div className="ed-label">Colors & Formatting</div>
                            <div className="ed-toolbar">
                                {Object.keys(MC_COLORS).map(code => (
                                    <ColorButton key={code} code={code} onClick={insertCode} />
                                ))}
                            </div>
                            <div className="ed-fmt-btns">
                                {Object.entries(FORMAT_CODES).map(([code, { name }]) => (
                                    <FormatButton key={code} code={code} name={name} onClick={insertCode} />
                                ))}
                            </div>
                        </div>

                        {/* Templates */}
                        <div style={{ marginBottom: 14 }}>
                            <div className="ed-label">Add Field</div>
                            <div className="ed-templates">
                                {FIELD_TEMPLATES.map((tpl, idx) => (
                                    <TemplateButton key={idx} template={tpl} onClick={() => addLine(tpl)} />
                                ))}
                            </div>
                        </div>

                        {/* Reference toggle */}
                        <div style={{ marginBottom: 14 }}>
                            <button
                                className={`ed-ref-toggle${showReference ? ' active' : ''}`}
                                onClick={() => setShowReference(!showReference)}
                            >
                                <Clipboard size={13} />
                                {showReference ? 'Hide Reference Panel' : 'Show Reference Panel'}
                            </button>
                        </div>

                        {/* Line editors */}
                        <div className="ed-label">Description Lines</div>
                        <div className="ed-lines">
                            {lines.map((line, index) => (
                                <div key={index} className="ed-line-row">
                                    <span className="ed-line-num">{index + 1}</span>
                                    <span className="ed-line-dash">—</span>
                                    <input
                                        id={`line-editor-${index}`}
                                        type="text"
                                        className={`ed-line-input${activeLineIndex === index ? ' active' : ''}`}
                                        value={line}
                                        onChange={e => updateLine(index, e.target.value)}
                                        onFocus={() => setActiveLineIndex(index)}
                                        placeholder={index === 0 ? 'Header line...' : 'Description line...'}
                                    />
                                    <div className="ed-line-btns">
                                        <button className="ed-line-btn" onClick={() => moveLine(index, -1)} disabled={index === 0} title="Move up">
                                            <ArrowUp size={13} />
                                        </button>
                                        <button className="ed-line-btn" onClick={() => moveLine(index, 1)} disabled={index === lines.length - 1} title="Move down">
                                            <ArrowDown size={13} />
                                        </button>
                                        <button
                                            className={`ed-line-btn${copiedIndex === index ? ' copied' : ''}`}
                                            onClick={() => {
                                                navigator.clipboard.writeText(line).then(() => {
                                                    setCopiedIndex(index);
                                                    setTimeout(() => setCopiedIndex(null), 1500);
                                                }).catch(() => {});
                                            }}
                                            title="Copy line"
                                        >
                                            {copiedIndex === index ? <Check size={13} /> : <Copy size={13} />}
                                        </button>
                                        <button
                                            className="ed-line-btn delete"
                                            onClick={() => removeLine(index)}
                                            disabled={lines.length <= 1}
                                            title="Delete line"
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="ed-add-line-btn" onClick={() => addLine()}>+ Add Empty Line</button>
                    </div>

                    {/* ── Preview column ── */}
                    <div className="ed-col-preview">
                        <div className="ed-label">Preview</div>
                        <div className="ed-preview-box">
                            {lines.length === 0 || (lines.length === 1 && !lines[0]) ? (
                                <div className="ed-preview-empty">Preview will appear here...</div>
                            ) : (
                                lines.map((line, idx) => (
                                    <div key={idx} style={{ minHeight: 20 }}>
                                        <FormattedLine text={line} />
                                    </div>
                                ))
                            )}
                        </div>

                        {/* YAML output */}
                        <div style={{ marginTop: 14 }}>
                            <div className="ed-label">YAML Output</div>
                            <div className="ed-code-block">
                                <div className="ed-code-key">{item.material}:</div>
                                {lines.map((line, idx) => (
                                    <div key={idx} style={{ paddingLeft: 12 }}>- "{line}"</div>
                                ))}
                            </div>
                        </div>

                        {/* Quick ref */}
                        <div className="ed-qref">
                            <div style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Quick Reference</div>
                            <div className="ed-qref-grid">
                                <div>&amp;7 = <span style={{ color: MC_COLORS['7'] }}>Gray</span> (labels)</div>
                                <div>&amp;a = <span style={{ color: MC_COLORS.a }}>Green</span> (values)</div>
                                <div>&amp;6 = <span style={{ color: MC_COLORS['6'] }}>Gold</span> (mid %)</div>
                                <div>&amp;c = <span style={{ color: MC_COLORS.c }}>Red</span> (low %)</div>
                                <div>&amp;b = <span style={{ color: MC_COLORS.b }}>Aqua</span> (title)</div>
                                <div>&amp;r = Reset all</div>
                            </div>
                        </div>
                    </div>

                    {/* ── Reference panel ── */}
                    {showReference && (
                        <div className="ed-col-ref">
                            <div className="ed-ref-panel">
                                <div className="ed-ref-header">
                                    <div className="ed-label" style={{ marginBottom: 0 }}>
                                        <Clipboard size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                        Reference
                                    </div>
                                    <button className="ed-btn-ghost" onClick={() => setShowReference(false)}>
                                        <X size={16} />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    className="ed-ref-search"
                                    placeholder="Search items..."
                                    value={referenceSearch}
                                    onChange={e => { setReferenceSearch(e.target.value); setSelectedReference(null); }}
                                />
                                <div className="ed-ref-list" style={{ maxHeight: selectedReference ? 120 : 200 }}>
                                    {referenceItems.length === 0 ? (
                                        <div style={{ color: C.dim, fontSize: 11.5, padding: '12px', textAlign: 'center' }}>
                                            {referenceSearch ? 'No matches' : 'Type to search'}
                                        </div>
                                    ) : referenceItems.map(refItem => (
                                        <div
                                            key={refItem.material}
                                            className={`ed-ref-item${selectedReference?.material === refItem.material ? ' selected' : ''}`}
                                            onClick={() => setSelectedReference(
                                                selectedReference?.material === refItem.material ? null : refItem
                                            )}
                                        >
                                            <img
                                                src={`https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib/${refItem.material.toLowerCase()}.png`}
                                                alt="" style={{ width: 18, height: 18, imageRendering: 'pixelated', flexShrink: 0 }}
                                                onError={e => { e.target.style.display = 'none'; }}
                                            />
                                            {refItem.displayName}
                                        </div>
                                    ))}
                                </div>

                                {selectedReference && (
                                    <div className="ed-ref-preview">
                                        <div className="ed-ref-preview-header">
                                            <span className="ed-ref-preview-name">{selectedReference.displayName}</span>
                                            <button
                                                className="ed-btn-ghost"
                                                style={{ fontSize: 11 }}
                                                onClick={() => {
                                                    const allText = selectedReference.description.join('\n');
                                                    navigator.clipboard.writeText(allText).catch(() => {});
                                                }}
                                            >
                                                Copy all
                                            </button>
                                        </div>
                                        <div className="ed-ref-lines">
                                            {selectedReference.description.map((line, idx) => (
                                                <div key={idx} className="ed-ref-line-row">
                                                    <span className="ed-ref-line-text">
                                                        <FormattedLine text={line} />
                                                    </span>
                                                    <button
                                                        className={`ed-ref-copy-btn${copiedIndex === `ref-${idx}` ? ' done' : ''}`}
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(line).then(() => {
                                                                setCopiedIndex(`ref-${idx}`);
                                                                setTimeout(() => setCopiedIndex(null), 1500);
                                                            }).catch(() => {});
                                                        }}
                                                    >
                                                        {copiedIndex === `ref-${idx}` ? '✓' : 'Copy'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── GitHub auth section ── */}
                <div className="ed-auth">
                    {showTokenInput ? (
                        <div>
                            <p className="ed-auth-desc">
                                Enter a GitHub Personal Access Token with <code>repo</code> scope to save.{' '}
                                <a href="https://github.com/settings/tokens/new?description=FIB+Description+Editor&scopes=repo" target="_blank" rel="noopener noreferrer">
                                    Create one <ExternalLink size={11} style={{ verticalAlign: 'middle' }} />
                                </a>
                            </p>
                            <div className="ed-auth-row">
                                <input
                                    type="password"
                                    placeholder="ghp_xxxxxxxxxxxx"
                                    value={githubToken}
                                    onChange={e => setGithubToken(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && verifyToken(githubToken)}
                                    className="ed-input ed-input flex1"
                                />
                                <button
                                    className={`ed-btn ed-btn-primary`}
                                    onClick={() => verifyToken(githubToken)}
                                    disabled={verifyingToken || !githubToken.trim()}
                                >
                                    {verifyingToken
                                        ? <><RefreshCw size={13} style={{ animation: 'ed-spin 1s linear infinite' }} /> Verifying...</>
                                        : 'Connect'
                                    }
                                </button>
                            </div>
                        </div>
                    ) : githubUser && (
                        <div>
                            <div className="ed-auth-user">
                                <div className="ed-auth-user-info">
                                    {githubUser.avatar_url && (
                                        <img src={githubUser.avatar_url} alt="" className="ed-auth-avatar" />
                                    )}
                                    <div>
                                        <div className="ed-auth-name">
                                            <Check size={13} /> @{githubUser.login}
                                        </div>
                                        <div className="ed-auth-sub">
                                            Write access to {REPO_OWNER}/{REPO_NAME}
                                        </div>
                                    </div>
                                </div>
                                <button className="ed-btn-ghost" onClick={handleLogout}>Sign out</button>
                            </div>
                            <div className="ed-branch-row">
                                <span className="ed-branch-label">Push to branch:</span>
                                <select
                                    className="ed-select"
                                    value={selectedBranch}
                                    onChange={e => setSelectedBranch(e.target.value)}
                                >
                                    {branches.map(branch => (
                                        <option key={branch} value={branch}>{branch}</option>
                                    ))}
                                </select>
                                <button className="ed-btn ed-btn-icon" onClick={handleRefreshBranches} title="Refresh branches">
                                    <RefreshCw size={13} />
                                </button>
                                {selectedBranch === DEFAULT_BRANCH && (
                                    <span className="ed-warn-pill">
                                        <AlertTriangle size={12} /> Pushing directly to {DEFAULT_BRANCH}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {saveStatus && (
                        <div className={`ed-status ${saveStatus.type}`} style={{ marginTop: 12, marginBottom: 0 }}>
                            {saveStatus.message}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="ed-footer">
                    <div>
                        {hasExistingDescription && (
                            <button
                                className={`ed-btn ed-btn-lg ed-btn-delete${confirmDelete ? ' confirming' : ''}`}
                                onClick={handleDelete}
                                disabled={deleting || saving || !hasAccess}
                            >
                                {deleting ? 'Deleting...' : confirmDelete ? 'Confirm Delete' : <><Trash2 size={14} /> Delete</>}
                            </button>
                        )}
                    </div>
                    <div className="ed-footer-right">
                        <button className="ed-btn ed-btn-lg" onClick={onClose}>Cancel</button>
                        <button
                            className="ed-btn ed-btn-lg ed-btn-primary"
                            onClick={handleSave}
                            disabled={saving || deleting || !hasAccess}
                        >
                            {saving ? 'Saving...' : 'Save to GitHub'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
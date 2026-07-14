import React, { useState, useCallback } from 'react';
import Swords        from 'lucide-react/dist/esm/icons/swords';
import Utensils      from 'lucide-react/dist/esm/icons/utensils';
import Sprout        from 'lucide-react/dist/esm/icons/sprout';
import Users         from 'lucide-react/dist/esm/icons/users';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Heart         from 'lucide-react/dist/esm/icons/heart';
import Package       from 'lucide-react/dist/esm/icons/package';
import BarChart3     from 'lucide-react/dist/esm/icons/bar-chart-3';
import Flame         from 'lucide-react/dist/esm/icons/flame';
import Gem           from 'lucide-react/dist/esm/icons/gem';
import Settings      from 'lucide-react/dist/esm/icons/settings';
import Shield        from 'lucide-react/dist/esm/icons/shield';
import Gamepad2      from 'lucide-react/dist/esm/icons/gamepad-2';
import TrendingUp    from 'lucide-react/dist/esm/icons/trending-up';
import Skull         from 'lucide-react/dist/esm/icons/skull';
import Star          from 'lucide-react/dist/esm/icons/star';
import MapPin        from 'lucide-react/dist/esm/icons/map-pin';
import Wind          from 'lucide-react/dist/esm/icons/wind';
import Link          from 'lucide-react/dist/esm/icons/link';
import Trophy        from 'lucide-react/dist/esm/icons/trophy';
import Eye           from 'lucide-react/dist/esm/icons/eye';
import Compass       from 'lucide-react/dist/esm/icons/compass';
import ExternalLink  from 'lucide-react/dist/esm/icons/external-link';
import Layers        from 'lucide-react/dist/esm/icons/layers';
import Lock          from 'lucide-react/dist/esm/icons/lock';
import Unlock        from 'lucide-react/dist/esm/icons/unlock';
import ChevronLeft   from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight  from 'lucide-react/dist/esm/icons/chevron-right';
import Award         from 'lucide-react/dist/esm/icons/award';
import Cake          from 'lucide-react/dist/esm/icons/cake';
import Zap           from 'lucide-react/dist/esm/icons/zap';
import Repeat        from 'lucide-react/dist/esm/icons/repeat';
import Timer         from 'lucide-react/dist/esm/icons/timer';
import Feather       from 'lucide-react/dist/esm/icons/feather';
import Footer        from "../components/common/Footer.jsx";
import { COLORS as C } from '../config/constants';

// ── Colour map ────────────────────────────────────────────────────────────────
const CAT_COLORS = {
    gamemode:    C.blue,
    combat:      C.red,
    survival:    C.orange,
    gameplay:    C.cyan,
    itempool:    C.purple,
    progression: C.amber,
};

// ── Data ──────────────────────────────────────────────────────────────────────
const SETTINGS = [
    { id:'run_battle',      name:'RunBattle',       category:'gamemode',    icon:Trophy,        enabledText:'Only the first player to get the item scores',   disabledText:'All players can score from the same item',     default:false },
    { id:'force_chain',     name:'ForceChain',      category:'gamemode',    icon:Link,          enabledText:'Shows current item + next item',                  disabledText:'Only shows current item',                      default:false },
    { id:'teams',           name:'Teams',           category:'gamemode',    icon:Users,         enabledText:'Players compete in teams',                        disabledText:'Free-for-all — everyone plays solo',           default:false, unlocks:['team_chat'] },
    { id:'team_chat',       name:'Team Chat',       category:'gamemode',    icon:MessageSquare, enabledText:'Chat messages only visible to teammates',         disabledText:'All chat is global',                           default:true,  requires:'teams' },
    { id:'pvp',             name:'PvP',             category:'combat',      icon:Swords,        enabledText:'Players can attack each other',                   disabledText:'Players cannot damage each other',             default:true  },
    { id:'food',            name:'Food',            category:'survival',    icon:Utensils,      enabledText:'Normal hunger — need to eat to survive',          disabledText:'No hunger drain — never need to eat',          default:true  },
    { id:'keep_inventory',  name:'KeepInventory',   category:'survival',    icon:Heart,         enabledText:'Keep all items when you die',                     disabledText:'Drop items on death (vanilla)',                 default:false },
    { id:'faster_plants',   name:'Faster Plants',   category:'gameplay',    icon:Sprout,        enabledText:'Crops, trees & leaves grow/decay faster',         disabledText:'Normal vanilla growth speeds',                 default:false },
    { id:'backpack',        name:'Backpack',        category:'gameplay',    icon:Package,       enabledText:'Extra inventory slots (size varies by preset)',   disabledText:'Standard 36-slot inventory only',              default:false },
    { id:'position_system', name:'Position System', category:'gameplay',    icon:MapPin,        enabledText:'Players can save and share positions',            disabledText:'/pos command is disabled',                     default:true  },
    { id:'elytra_gliding',  name:'Elytra Gliding',  category:'gameplay',    icon:Wind,          enabledText:'Elytra gliding is allowed',                       disabledText:'Elytra gliding is disabled',                   default:true  },
    { id:'harder_trackers', name:'Harder Trackers', category:'gameplay',    icon:Compass,       enabledText:'Trackers require harder crafting recipes',        disabledText:'Standard tracker recipes',                     default:false, link:{ text:'View tracker recipes', href:'structures' } },
    { id:'hard',            name:'Hard',            category:'itempool',    icon:Skull,         enabledText:'Items tagged "Late" are included',                disabledText:'Late-game items are excluded',                 default:false, requires:'nether', unlocks:['extreme'], link:{ text:'View Late items', href:'pools?state=LATE' } },
    { id:'nether',          name:'Nether',          category:'itempool',    icon:Flame,         enabledText:'Nether portal works, nether items included',      disabledText:'Nether disabled, nether items excluded',       default:true,  unlocks:['hard','end'], link:{ text:'View Nether items', href:'pools?tag=NETHER' } },
    { id:'end',             name:'End',             category:'itempool',    icon:Star,          enabledText:'End portal works, end items included',            disabledText:'End disabled, end items excluded',             default:true,  requires:'nether', unlocks:['extreme'], link:{ text:'View End items', href:'pools?tag=END' } },
    { id:'extreme',         name:'Extreme',         category:'itempool',    icon:Gem,           enabledText:'All obtainable items included',                   disabledText:'Only reasonably obtainable items',             default:false, requires:['nether','end','hard'], link:{ text:'View Extreme items', href:'pools?tag=EXTREME' } },
    { id:'stats',           name:'Stats',           category:'progression', icon:BarChart3,     enabledText:'Stats count towards leaderboards',               disabledText:"Stats won't be recorded",                      default:true  },
    { id:'score',           name:'Score',           category:'progression', icon:Eye,           enabledText:'Score is visible to all players',                 disabledText:'Score is hidden until round ends',             default:true  },
    { id:'achievements',    name:'Achievements',    category:'progression', icon:Award,         enabledText:'Achievements can be earned this round',           disabledText:"Achievements won't be tracked",                default:true  },
    { id:'trading',         name:'Player Trading',  category:'gameplay',    icon:Repeat,        enabledText:'Players can trade items with each other',        disabledText:'Player-to-player trading is disabled',         default:false, unlocks:['trading_cooldown'] },
    { id:'random_events',   name:'Random Events',   category:'gameplay',    icon:Zap,           enabledText:'Events fire 3-4 times per hour',                 disabledText:'No random events this round',                  default:true,  link:{ text:'View random events', href:'structures#random-events' } },
    { id:'event_modifiers', name:'Event Modifiers', category:'gameplay',    icon:Cake,          enabledText:'Tournament rules: some commands become OP-only, keep-inventory forced on for 5 minutes', disabledText:'Standard rules', default:false },
    { id:'backpack_rows',   name:'Backpack Rows',   category:'gameplay',    icon:Package,       type:'value', valueLabel:'3 rows',  valueText:'How many rows the backpack has.',                requires:'backpack' },
    { id:'trading_cooldown',name:'Trading Cooldown',category:'gameplay',    icon:Timer,         type:'value', valueLabel:'3 min',   valueText:'Cooldown between player trades.',                requires:'trading' },
    { id:'quickie',         name:'Quickie',         category:'itempool',    icon:Feather,       type:'value', valueLabel:'Disabled', valueText:'Restricts the item pool. Cycles: Disabled → Early → Early + Mid.' },
];

const CATEGORIES = {
    gamemode:    { name:'Game Mode',   desc:'How the round is played',                icon:Gamepad2   },
    combat:      { name:'Combat',      desc:'Player vs player interaction',            icon:Shield     },
    survival:    { name:'Survival',    desc:'Hunger, death, and survival mechanics',   icon:Heart      },
    gameplay:    { name:'Gameplay',    desc:'Features and utilities during the round', icon:Settings   },
    itempool:    { name:'Item Pool',   desc:'Which items can be assigned',             icon:Layers     },
    progression: { name:'Progression', desc:'Stats, scoring, and tracking',            icon:TrendingUp },
};

const CAT_ORDER = ['gamemode','combat','survival','gameplay','itempool','progression'];
const SETTINGS_MAP = new Map(SETTINGS.map(s => [s.id, s]));
const SETTINGS_BY_CAT = SETTINGS.reduce((acc, s) => {
    (acc[s.category] || (acc[s.category] = [])).push(s);
    return acc;
}, {});
function getSettingName(id) { return SETTINGS_MAP.get(id)?.name ?? id; }

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');

  .gs {
    font-family: 'Barlow', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: oklch(17% 0.025 255);
    color: oklch(94% 0.007 255);
    min-height: 100vh; display: flex; flex-direction: column;
  }
  .gs-rule  { height: 1px; background: oklch(22% 0.022 255); }
  .gs-shell { max-width: 1120px; margin: 0 auto; padding: 0 28px; width: 100%; box-sizing: border-box; }

  /* ── Header ── */
  .gs-header { padding: 80px 0 56px; }
  .gs-eyebrow {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;
    color: oklch(76% 0.16 68); margin: 0 0 14px;
  }
  .gs-h1 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(44px, 6.5vw, 72px); font-weight: 800;
    line-height: 0.95; letter-spacing: -0.5px; text-transform: uppercase;
    color: oklch(94% 0.007 255); margin: 0 0 18px;
  }
  .gs-sub { font-size: 15.5px; color: oklch(52% 0.013 255); max-width: 520px; line-height: 1.72; margin: 0; }
  .gs-code {
    font-family: 'Courier New', monospace; font-size: 13px;
    color: oklch(70% 0.14 200);
    background: oklch(68% 0.12 200 / 0.09);
    border: 1px solid oklch(68% 0.12 200 / 0.18);
    border-radius: 4px; padding: 2px 7px;
  }

  /* ── Body: sidebar + panel ── */
  .gs-body {
    display: grid;
    grid-template-columns: 216px 1fr;
    gap: 0 48px;
    padding: 48px 0 80px;
    align-items: start;
  }
  @media (max-width: 760px) {
    .gs-body { grid-template-columns: 1fr; gap: 0; padding: 32px 0 64px; }
  }

  /* ── Sidebar ── */
  .gs-sidebar {
    display: flex; flex-direction: column; gap: 2px;
  }
  @media (max-width: 760px) {
    .gs-sidebar {
      flex-direction: row; flex-wrap: wrap; gap: 4px;
      padding-bottom: 28px;
      border-bottom: 1px solid oklch(22% 0.022 255);
      margin-bottom: 32px;
    }
  }

  .gs-sidebar-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: 7px; cursor: pointer;
    background: none; border: none; text-align: left; width: 100%;
    font-family: 'Barlow', system-ui, sans-serif;
    transition: background 0.1s ease-out;
    position: relative;
  }
  .gs-sidebar-item:hover { background: oklch(22% 0.022 255); }
  .gs-sidebar-item.active { background: oklch(24% 0.022 255); }

  /* Colored left edge on active */
  .gs-sidebar-item.active::before {
    content: '';
    position: absolute; left: 0; top: 6px; bottom: 6px;
    width: 2px; border-radius: 1px;
    background: var(--cat-color, oklch(76% 0.16 68));
  }

  .gs-sidebar-icon {
    width: 28px; height: 28px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    transition: background 0.1s ease-out;
  }

  .gs-sidebar-name {
    font-size: 13px; font-weight: 500;
    color: oklch(56% 0.012 255); flex: 1;
    transition: color 0.1s ease-out;
  }
  .gs-sidebar-item.active .gs-sidebar-name { color: oklch(88% 0.009 255); font-weight: 600; }
  .gs-sidebar-item:hover  .gs-sidebar-name { color: oklch(78% 0.010 255); }

  .gs-sidebar-count {
    font-size: 11px; font-weight: 700;
    font-variant-numeric: tabular-nums;
    padding: 1px 6px; border-radius: 4px;
    font-family: 'Barlow', system-ui, sans-serif;
    flex-shrink: 0;
  }
  .gs-sidebar-divider { height: 1px; background: oklch(22% 0.022 255); margin: 6px 4px; }

  @media (max-width: 760px) {
    .gs-sidebar-item { width: auto; padding: 6px 11px; }
    .gs-sidebar-item.active::before { display: none; }
    .gs-sidebar-item.active { background: oklch(76% 0.16 68 / 0.10); }
    .gs-sidebar-icon { display: none; }
    .gs-sidebar-name { font-size: 12px; }
    .gs-sidebar-count { display: none; }
    .gs-sidebar-divider { display: none; }
  }

  /* ── Settings panel ── */
  .gs-panel { min-width: 0; }

  /* Category header */
  .gs-cat-head {
    display: flex; align-items: center; gap: 13px;
    padding-bottom: 28px;
    border-bottom: 1px solid oklch(22% 0.022 255);
    margin-bottom: 4px;
  }
  .gs-cat-icon {
    width: 42px; height: 42px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .gs-cat-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(22px, 3vw, 30px); font-weight: 800;
    text-transform: uppercase; letter-spacing: -0.2px;
    color: oklch(94% 0.007 255); margin: 0 0 3px;
  }
  .gs-cat-desc { font-size: 13px; color: oklch(48% 0.013 255); }

  /* Panel prev/next footer */
  .gs-panel-nav {
    display: flex; align-items: center; justify-content: space-between;
    padding-top: 28px;
    border-top: 1px solid oklch(22% 0.022 255);
    margin-top: 8px;
  }
  .gs-panel-nav-btn {
    display: flex; align-items: center; gap: 7px;
    background: none; border: none; cursor: pointer;
    font-family: 'Barlow', system-ui, sans-serif;
    font-size: 13px; font-weight: 500;
    color: oklch(48% 0.013 255); padding: 6px 10px; border-radius: 6px;
    transition: background 0.1s ease-out, color 0.1s ease-out;
  }
  .gs-panel-nav-btn:hover { background: oklch(22% 0.022 255); color: oklch(80% 0.010 255); }
  .gs-panel-nav-btn:disabled { opacity: 0; pointer-events: none; }

  /* ── Setting row ── */
  .gs-row {
    padding: 16px 0;
    border-top: 1px solid oklch(22% 0.022 255);
    display: grid;
    grid-template-columns: 36px 1fr auto;
    gap: 0 14px;
    align-items: start;
    transition: opacity 0.15s ease-out;
  }
  .gs-row:last-of-type { border-bottom: 1px solid oklch(22% 0.022 255); }
  .gs-row.locked { opacity: 0.4; }

  .gs-row-icon {
    width: 36px; height: 36px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; position: relative;
    background: oklch(22% 0.022 255);
    border: 1px solid oklch(28% 0.019 255);
    margin-top: 1px;
  }
  .gs-lock-pip {
    position: absolute; bottom: -4px; right: -4px;
    width: 14px; height: 14px; border-radius: 50%;
    background: oklch(20% 0.023 255);
    border: 1px solid oklch(28% 0.019 255);
    display: flex; align-items: center; justify-content: center;
  }

  .gs-row-body { min-width: 0; }
  .gs-row-top  { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
  .gs-row-name {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 15.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px;
    color: oklch(92% 0.007 255);
  }
  .gs-requires-pill {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 3px;
    color: oklch(62% 0.22 25 / 0.9);
    background: oklch(62% 0.22 25 / 0.10);
    border: 1px solid oklch(62% 0.22 25 / 0.22);
  }
  .gs-row-desc { font-size: 13px; line-height: 1.6; margin-bottom: 6px; }
  .gs-row-desc.on  { color: oklch(72% 0.010 255); }
  .gs-row-desc.off { color: oklch(50% 0.013 255); }

  .gs-row-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .gs-unlock-note {
    font-size: 11px; color: oklch(40% 0.013 255);
    display: inline-flex; align-items: center; gap: 4px;
  }
  .gs-unlock-note.active { color: oklch(64% 0.20 142); }
  .gs-ext-link {
    font-size: 11px; color: oklch(58% 0.09 200); text-decoration: none; font-weight: 600;
    display: inline-flex; align-items: center; gap: 3px;
    background: none; border: none; cursor: pointer; padding: 0;
    font-family: 'Barlow', system-ui, sans-serif;
  }
  .gs-ext-link:hover { color: oklch(72% 0.09 200); }

  .gs-value-pill {
    font-family: 'Courier New', monospace;
    font-size: 11.5px; font-weight: 600;
    color: oklch(70% 0.14 200);
    background: oklch(68% 0.12 200 / 0.09);
    border: 1px solid oklch(68% 0.12 200 / 0.18);
    border-radius: 5px; padding: 5px 10px; white-space: nowrap;
  }
  .gs-row.locked .gs-value-pill { color: oklch(40% 0.013 255); background: none; border-color: oklch(28% 0.019 255); }

  /* ── Toggle ── */
  .gs-toggle-col { padding-top: 4px; flex-shrink: 0; }
  .gs-toggle {
    width: 40px; height: 22px; border-radius: 11px;
    border: none; cursor: pointer; position: relative;
    transition: background 0.15s ease-out;
  }
  .gs-toggle:disabled { cursor: not-allowed; }
  .gs-toggle-knob {
    width: 16px; height: 16px; border-radius: 50%;
    background: oklch(94% 0.007 255);
    position: absolute; top: 3px;
    transition: left 0.15s ease-out;
    pointer-events: none;
  }

  /* Panel enter animation */
  @keyframes gs-panel-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .gs-panel-in { animation: gs-panel-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both; }

  @media (prefers-reduced-motion: reduce) {
    .gs-toggle, .gs-toggle-knob, .gs-sidebar-item,
    .gs-panel-nav-btn, .gs-row { transition: none !important; }
    .gs-panel-in { animation: none !important; }
  }

  @media (max-width: 600px) {
    .gs-shell { padding: 0 20px; }
    .gs-header { padding: 60px 0 48px; }
  }
`;

// ── SettingRow ────────────────────────────────────────────────────────────────

function SettingRow({ setting, isEnabled, onToggle, enabledSettings }) {
    const Icon     = setting.icon;
    const requires = setting.requires
        ? (Array.isArray(setting.requires) ? setting.requires : [setting.requires])
        : [];
    const isLocked    = requires.length > 0 && !requires.every(r => enabledSettings.has(r));
    const unmetDeps   = requires.filter(r => !enabledSettings.has(r)).map(getSettingName);
    const unlockNames = (setting.unlocks || []).map(getSettingName);
    const toggleBg    = isEnabled && !isLocked ? C.green : 'oklch(28% 0.019 255)';
    const active      = isEnabled && !isLocked;
    const isValue     = setting.type === 'value';

    return (
        <div className={`gs-row${isLocked ? ' locked' : ''}`}>
            <div className="gs-row-icon">
                <Icon size={16} color={isLocked ? 'oklch(32% 0.015 255)' : 'oklch(56% 0.012 255)'} />
                {isLocked && (
                    <div className="gs-lock-pip">
                        <Lock size={8} color="oklch(44% 0.013 255)" />
                    </div>
                )}
            </div>

            <div className="gs-row-body">
                <div className="gs-row-top">
                    <span className="gs-row-name">{setting.name}</span>
                    {isLocked && (
                        <span className="gs-requires-pill">
                            <Lock size={8} /> Requires {unmetDeps.join(', ')}
                        </span>
                    )}
                </div>
                <p className={`gs-row-desc${!isValue && active ? ' on' : ' off'}`}>
                    {isValue ? setting.valueText : (active ? setting.enabledText : setting.disabledText)}
                </p>
                {(unlockNames.length > 0 || setting.link) && (
                    <div className="gs-row-meta">
                        {unlockNames.length > 0 && (
                            <span className={`gs-unlock-note${active ? ' active' : ''}`}>
                                <Unlock size={10} />
                                {active ? 'Unlocks' : 'Will unlock'}: {unlockNames.join(', ')}
                            </span>
                        )}
                        {setting.link && (
                            <a href={`/${setting.link.href}`} className="gs-ext-link">
                                <ExternalLink size={9} />
                                {setting.link.text}
                            </a>
                        )}
                    </div>
                )}
            </div>

            <div className="gs-toggle-col">
                {isValue ? (
                    <span className="gs-value-pill" title="Default value">{setting.valueLabel}</span>
                ) : (
                    <button
                        className="gs-toggle"
                        onClick={() => !isLocked && onToggle(setting.id)}
                        disabled={isLocked}
                        style={{ background: toggleBg }}
                        role="switch"
                        aria-checked={active}
                        aria-label={setting.name}
                        title={isLocked ? `Requires: ${unmetDeps.join(', ')}` : undefined}
                    >
                        <div className="gs-toggle-knob" style={{ left: active ? '21px' : '3px' }} />
                    </button>
                )}
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GameSettings() {
    const [activeCat, setActiveCat] = useState('gamemode');

    const [enabledSettings, setEnabledSettings] = useState(() => {
        const d = new Set();
        const add = (id) => {
            if (d.has(id)) return;
            d.add(id);
            const s = SETTINGS_MAP.get(id);
            if (s?.requires) (Array.isArray(s.requires) ? s.requires : [s.requires]).forEach(add);
        };
        SETTINGS.forEach(s => { if (s.default) add(s.id); });
        return d;
    });

    const toggleSetting = useCallback((id) => {
        setEnabledSettings(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                if (id === 'teams')               { next.delete('team_chat'); }
                if (id === 'nether')              { next.delete('hard'); next.delete('end'); next.delete('extreme'); }
                if (id === 'end' || id === 'hard'){ next.delete('extreme'); }
            } else {
                next.add(id);
                if (id === 'team_chat')            { next.add('teams'); }
                if (id === 'hard' || id === 'end') { next.add('nether'); }
                if (id === 'extreme')              { next.add('nether'); next.add('end'); next.add('hard'); }
            }
            return next;
        });
    }, []);

    const currentIdx  = CAT_ORDER.indexOf(activeCat);
    const prevCat     = currentIdx > 0                    ? CAT_ORDER[currentIdx - 1] : null;
    const nextCat     = currentIdx < CAT_ORDER.length - 1 ? CAT_ORDER[currentIdx + 1] : null;

    const cat      = CATEGORIES[activeCat];
    const CatIcon  = cat.icon;
    const catColor = CAT_COLORS[activeCat];
    const settings = SETTINGS_BY_CAT[activeCat] || [];

    return (
        <div className="gs">
            <style>{CSS}</style>

            <div className="gs-shell">
                <div className="gs-header">
                    <p className="gs-eyebrow">Configuration</p>
                    <h1 className="gs-h1">Game Settings</h1>
                    <p className="gs-sub">
                        Configuration options for ForceItemBattle rounds.
                        Controlled by the Game Master using{' '}
                        <code className="gs-code">/settings</code>
                    </p>
                </div>
            </div>

            <div className="gs-rule" />

            <div className="gs-shell" style={{ flex: 1 }}>
                <div className="gs-body">

                    {/* ── Sidebar ── */}
                    <aside className="gs-sidebar" aria-label="Setting categories">
                        {CAT_ORDER.map((id, idx) => {
                            const c        = CATEGORIES[id];
                            const Icon     = c.icon;
                            const color    = CAT_COLORS[id];
                            const catItems = SETTINGS_BY_CAT[id] || [];
                            const enabled  = catItems.filter(s => enabledSettings.has(s.id)).length;
                            const isActive = activeCat === id;

                            return (
                                <React.Fragment key={id}>
                                    {idx === 4 && <div className="gs-sidebar-divider" />}
                                    <button
                                        className={`gs-sidebar-item${isActive ? ' active' : ''}`}
                                        onClick={() => setActiveCat(id)}
                                        aria-current={isActive ? 'true' : undefined}
                                        style={{ '--cat-color': color }}
                                    >
                                        <div
                                            className="gs-sidebar-icon"
                                            style={{ background: isActive ? color + '18' : 'transparent' }}
                                        >
                                            <Icon size={15} color={isActive ? color : 'oklch(42% 0.013 255)'} />
                                        </div>
                                        <span className="gs-sidebar-name">{c.name}</span>
                                        <span
                                            className="gs-sidebar-count"
                                            style={{
                                                background: enabled > 0 ? color + '15' : 'oklch(22% 0.022 255)',
                                                color:      enabled > 0 ? color        : 'oklch(40% 0.013 255)',
                                                border:     `1px solid ${enabled > 0 ? color + '30' : 'oklch(27% 0.019 255)'}`,
                                            }}
                                        >
                                            {enabled}/{catItems.length}
                                        </span>
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    </aside>

                    {/* ── Settings panel ── */}
                    <div className="gs-panel">

                        {/* Category header */}
                        <div className="gs-cat-head">
                            <div
                                className="gs-cat-icon"
                                style={{ background: catColor + '15' }}
                            >
                                <CatIcon size={22} color={catColor} />
                            </div>
                            <div>
                                <div className="gs-cat-title">{cat.name}</div>
                                <div className="gs-cat-desc">{cat.desc}</div>
                            </div>
                        </div>

                        {/* Setting rows — re-keyed on activeCat so animation fires on switch */}
                        <div key={activeCat} className="gs-panel-in">
                            {settings.map(s => (
                                <SettingRow
                                    key={s.id}
                                    setting={s}
                                    isEnabled={enabledSettings.has(s.id)}
                                    onToggle={toggleSetting}
                                    enabledSettings={enabledSettings}
                                />
                            ))}
                        </div>

                        {/* Prev / next navigation */}
                        <div className="gs-panel-nav">
                            <button
                                className="gs-panel-nav-btn"
                                onClick={() => prevCat && setActiveCat(prevCat)}
                                disabled={!prevCat}
                            >
                                <ChevronLeft size={14} />
                                {prevCat ? CATEGORIES[prevCat].name : ''}
                            </button>
                            <button
                                className="gs-panel-nav-btn"
                                onClick={() => nextCat && setActiveCat(nextCat)}
                                disabled={!nextCat}
                            >
                                {nextCat ? CATEGORIES[nextCat].name : ''}
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            <Footer />
        </div>
    );
}

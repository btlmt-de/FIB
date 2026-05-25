import React from 'react';
import { COLORS as C } from '../config/constants';
import Shield       from 'lucide-react/dist/esm/icons/shield';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Ban          from 'lucide-react/dist/esm/icons/ban';
import Footer from "../components/common/Footer.jsx";

const BANNED_MODS = [
    { name: 'Minimap Modifications',  desc: 'Any mod that shows a map, player positions, or entity locations.' },
    { name: 'Freecam',                desc: 'Mods that allow camera movement independent of your player.' },
    { name: 'X-Ray',                  desc: 'Any texture pack or mod that reveals hidden blocks.' },
    { name: 'BundlesBeyond',          desc: 'Removes the 12-item limit for viewing and extracting items from bundles.' },
    { name: 'BoatItemView',           desc: 'Allows seeing items held in hand while riding a boat.' },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');

  .rul {
    font-family: 'Barlow', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: oklch(17% 0.025 255);
    color: oklch(94% 0.007 255);
    min-height: 100vh; display: flex; flex-direction: column;
  }
  .rul-shell {
    max-width: 760px; margin: 0 auto;
    padding: 0 28px; width: 100%; box-sizing: border-box;
    flex: 1;
  }
  .rul-rule { height: 1px; background: oklch(24% 0.022 255); }

  /* ── Header ── */
  .rul-header { padding: 80px 0 64px; }
  .rul-eyebrow {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;
    color: oklch(76% 0.16 68); margin: 0 0 14px;
  }
  .rul-h1 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(44px, 6.5vw, 72px); font-weight: 800;
    line-height: 0.95; letter-spacing: -0.5px; text-transform: uppercase;
    color: oklch(94% 0.007 255); margin: 0 0 18px;
  }
  .rul-sub {
    font-size: 15.5px; color: oklch(52% 0.012 255);
    max-width: 480px; line-height: 1.72; margin: 0;
  }

  /* ── Body ── */
  .rul-body { padding: 56px 0 80px; }

  /* ── Two-col section layout ── */
  .rul-section {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 0 56px;
    padding: 48px 0;
    border-top: 1px solid oklch(22% 0.022 255);
  }
  .rul-section:last-child { border-bottom: 1px solid oklch(22% 0.022 255); }
  @media (max-width: 620px) {
    .rul-section { grid-template-columns: 1fr; gap: 24px 0; }
  }

  .rul-section-label { padding-top: 2px; }
  .rul-section-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(18px, 2.5vw, 22px); font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.2px;
    color: oklch(90% 0.009 255); margin: 0 0 6px;
  }
  .rul-section-desc {
    font-size: 12.5px; color: oklch(48% 0.013 255); line-height: 1.6;
  }

  /* ── General Rules ── */
  .rul-prose {
    font-size: 14.5px; color: oklch(54% 0.012 255);
    line-height: 1.78; margin: 0 0 20px;
  }
  .rul-ext-link {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px;
    background: oklch(76% 0.16 68 / 0.09);
    border: 1px solid oklch(76% 0.16 68 / 0.30);
    border-radius: 6px;
    color: oklch(76% 0.16 68);
    text-decoration: none; font-size: 13.5px; font-weight: 600;
    transition: background 0.12s ease-out, border-color 0.12s ease-out;
  }
  .rul-ext-link:hover {
    background: oklch(76% 0.16 68 / 0.16);
    border-color: oklch(76% 0.16 68 / 0.55);
  }

  /* ── Banned mod rows ── */
  .rul-mod-list { display: flex; flex-direction: column; }
  .rul-mod-row {
    display: flex; align-items: flex-start; gap: 13px;
    padding: 13px 0;
    border-bottom: 1px solid oklch(22% 0.022 255);
  }
  .rul-mod-row:first-child { border-top: 1px solid oklch(22% 0.022 255); }
  .rul-mod-icon {
    width: 30px; height: 30px; border-radius: 6px; flex-shrink: 0;
    background: oklch(62% 0.22 25 / 0.10);
    border: 1px solid oklch(62% 0.22 25 / 0.25);
    display: flex; align-items: center; justify-content: center;
    margin-top: 1px;
  }
  .rul-mod-name {
    font-size: 14px; font-weight: 600; color: oklch(88% 0.009 255);
    margin-bottom: 3px; line-height: 1.2;
  }
  .rul-mod-desc { font-size: 13px; color: oklch(52% 0.012 255); line-height: 1.55; }

  /* ── Policy note ── */
  .rul-policy {
    padding: 16px 20px;
    background: oklch(76% 0.16 68 / 0.07);
    border: 1px solid oklch(76% 0.16 68 / 0.22);
    border-radius: 8px;
  }
  .rul-policy-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 13.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(76% 0.16 68);
    display: flex; align-items: center; gap: 7px; margin: 0 0 9px;
  }
  .rul-policy-text {
    font-size: 13.5px; color: oklch(70% 0.011 255); line-height: 1.7; margin: 0;
  }
  .rul-policy-text strong { color: oklch(88% 0.009 255); }

  @media (max-width: 520px) {
    .rul-shell { padding: 0 20px; }
    .rul-header { padding: 60px 0 52px; }
    .rul-body   { padding: 40px 0 64px; }
  }
`;

export default function Rules() {
    return (
        <div className="rul">
            <style>{CSS}</style>

            <div className="rul-shell">
                {/* Header */}
                <div className="rul-header">
                    <p className="rul-eyebrow">Server</p>
                    <h1 className="rul-h1">Game Rules</h1>
                    <p className="rul-sub">
                        Guidelines for participating in ForceItemBattle games on our server.
                        Please read before joining a round.
                    </p>
                </div>
            </div>

            <div className="rul-rule" />

            <div className="rul-shell">
                <div className="rul-body">

                    {/* General Rules */}
                    <div className="rul-section">
                        <div className="rul-section-label">
                            <h2 className="rul-section-title">General Rules</h2>
                            <div className="rul-section-desc">McPlayHD network-wide rules apply.</div>
                        </div>
                        <div>
                            <p className="rul-prose">
                                All rules from the McPlayHD network apply to ForceItemBattle games.
                                Please familiarize yourself with them before joining.
                            </p>
                            <a
                                href="https://mcplayhd.net/rules"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rul-ext-link"
                            >
                                mcplayhd.net/rules <ExternalLink size={13} />
                            </a>
                        </div>
                    </div>

                    {/* Banned mods */}
                    <div className="rul-section">
                        <div className="rul-section-label">
                            <h2 className="rul-section-title" style={{ color: 'oklch(72% 0.18 25)' }}>
                                Prohibited Mods
                            </h2>
                            <div className="rul-section-desc">Using these will result in disqualification.</div>
                        </div>
                        <div className="rul-mod-list">
                            {BANNED_MODS.map((mod, i) => (
                                <div key={i} className="rul-mod-row">
                                    <div className="rul-mod-icon">
                                        <Ban size={15} style={{ color: 'oklch(62% 0.22 25)' }} />
                                    </div>
                                    <div>
                                        <div className="rul-mod-name">{mod.name}</div>
                                        <div className="rul-mod-desc">{mod.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Policy note */}
                    <div className="rul-section">
                        <div className="rul-section-label">
                            <h2 className="rul-section-title">General Policy</h2>
                        </div>
                        <div className="rul-policy">
                            <div className="rul-policy-title">
                                <AlertTriangle size={14} />
                                When in doubt, ask first
                            </div>
                            <p className="rul-policy-text">
                                Any modification that gives a clear advantage over vanilla Minecraft
                                behaviour is not allowed. If you're unsure whether a specific mod is
                                permitted, <strong>ask before using it</strong>.
                            </p>
                        </div>
                    </div>

                </div>
            </div>

            <Footer />
        </div>
    );
}
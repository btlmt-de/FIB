import React, { useEffect, useRef } from 'react';
import { COLORS, SURFACE_NOISE, Z } from '../config/constants';

/**
 * Everything the phone's topbar cannot hold, in one sheet.
 *
 * ── THE COUNT THAT FORCED THIS ───────────────────────────────────────────────
 *
 * The topbar carried, on every breakpoint: Back, the wordmark, Collection,
 * History, Achievements, Live activity, a leaderboard pill, the user chip with
 * name and approval badge, Edit name, Sound, Notifications, Admin and Log out.
 * That is eleven controls and a name on a bar 390px wide. It did not wrap and it
 * did not scroll — it simply ran off the right edge, so Settings and Log out were
 * unreachable on any phone. Nothing was hidden on purpose; the row was written
 * for a desktop and never measured on anything else.
 *
 * The fix is a three-way split rather than a smaller icon:
 *
 *   bottom bar   Collection, Board, Chat, You     — the four destinations
 *   topbar       Back, wordmark, Notifications, ⋯ — context and what is urgent
 *   this sheet   everything else                  — reached, not scanned
 *
 * Collection and the leaderboard pill leave the topbar entirely on a phone: the
 * bottom bar has them, and two entry points to one view is the duplication this
 * page has already undone twice (the Trophy button, then the standalone
 * leaderboard). Notifications stays on the bar because it is the only control
 * carrying a count that changes while you are looking at something else.
 *
 * ── IT IS A SHEET, NOT A MENU ────────────────────────────────────────────────
 *
 * Full width, rising from the bottom edge, in the deck's own material with the
 * lit rail along its top — the same plinth the bottom bar and the status console
 * are made of. Rows are 52px and full-bleed so the whole row is the target;
 * nothing here is a 24px menu item you have to aim at.
 */
export function MobileMoreSheet({ open, onClose, items = [] }) {
    const panelRef = useRef(null);

    // Escape closes it, and focus moves into the sheet when it opens so the
    // keyboard and a screen reader land inside rather than behind it.
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKey);
        panelRef.current?.focus();
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="More"
            onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: Z.modal,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                background: 'rgba(5,6,10,0.62)',
                animation: 'fibSheetScrim 0.18s cubic-bezier(0.22,1,0.36,1) both',
            }}
        >
            <div
                ref={panelRef}
                tabIndex={-1}
                style={{
                    outline: 'none',
                    backgroundImage: `${SURFACE_NOISE}, linear-gradient(180deg, #0d1322 0%, #080b14 100%)`,
                    boxShadow: 'inset 0 1px 0 rgba(190,198,220,0.14)',
                    borderRadius: 0,
                    paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
                    animation: 'fibSheetRise 0.26s cubic-bezier(0.22,1,0.36,1) both',
                }}
            >
                {items.filter(Boolean).map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        // A row carrying a value is a toggle, and a screen
                        // reader has to hear the state, not just the label —
                        // "Battery saver, off" rather than "Battery saver".
                        aria-pressed={item.value ? Boolean(item.valueActive) : undefined}
                        onClick={() => { onClose?.(); item.onSelect?.(); }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            width: '100%',
                            minHeight: '52px',
                            padding: '0 20px',
                            border: 'none',
                            borderRadius: 0,
                            background: 'transparent',
                            // The row separator is the deck's hairline, top-weighted
                            // out of the light the way every seam on this surface is.
                            boxShadow: 'inset 0 1px 0 rgba(190,198,220,0.05)',
                            color: item.tone === 'danger' ? COLORS.red : COLORS.text,
                            font: 'inherit',
                            // 15px: this is a destination label read at arm's
                            // length on a phone, not chrome. The surface's 11px
                            // label step is for things sitting inside a 68px row
                            // beside an icon; a full-width sheet row is a sentence
                            // you tap, and 15 is the step SpinResult already uses
                            // for its own read-me-first text.
                            fontSize: '15px',
                            fontWeight: 600,
                            textAlign: 'left',
                            cursor: 'pointer',
                            WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        <item.Icon size={19} />
                        <span style={{ flex: 1 }}>{item.label}</span>

                        {/* A row that reports a setting rather than opening a
                            view. The sheet was written for destinations only —
                            every row a place you go — and a toggle among them
                            has to say what it currently is or the player taps it
                            to find out, which for this particular setting means
                            watching the surface go still and wondering what they
                            broke. Right-aligned in the label step, in the
                            surface's muted ink, with the on state lifted to
                            amber: the value is the only thing on the row that is
                            allowed to be a colour. */}
                        {item.value ? (
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: item.valueActive ? COLORS.gold : COLORS.textMuted,
                            }}>
                                {item.value}
                            </span>
                        ) : null}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default MobileMoreSheet;

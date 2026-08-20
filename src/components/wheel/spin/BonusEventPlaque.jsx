import React from 'react';
import { Crown, Layers, Zap } from 'lucide-react';
import { COLORS, SURFACE_NOISE, BONUS_IDENTITY, BONUS_IDENTITY_FALLBACK } from '../config/constants';

/**
 * The event the bonus board just selected, as a signboard on the stage.
 *
 * The old design answered with a second card — icon tile, gradient, particles —
 * a second box below the first one the strip was in. This is the signboard the
 * station posts: square, the deck's grain and ground, a lit rail on top in the
 * event's own identity colour, and that light rising through the face. It is
 * the destination sign carried from the board, not a receipt.
 *
 * Each event owns one icon, the same one the board draws: Zap for the lucky
 * family, Layers for the 5x's parallel lines, Crown for triple lucky.
 */
/**
 * Only the glyph lives here. The colours come from BONUS_IDENTITY in
 * config/constants, because this plaque, the board that selected the event and
 * the lamp the spin then runs under are three views of one thing and had three
 * private colour tables between them — this one said gold for a triple-lucky
 * that executes green.
 */
const EVENT_ICON = {
    lucky_spin: Zap,
    triple_spin: Layers,
    triple_lucky_spin: Crown,
};

export function BonusEventPlaque({ event, isMobile = false }) {
    if (!event) return null;

    const identity = BONUS_IDENTITY[event.id] || BONUS_IDENTITY_FALLBACK;
    const Icon = EVENT_ICON[event.id] || Zap;

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: isMobile ? '320px' : '420px',
            padding: isMobile ? '24px 20px' : '32px 36px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            borderRadius: 0,
            backgroundImage: `${SURFACE_NOISE}, linear-gradient(180deg, rgba(148,168,212,0.05) 0%, rgba(148,168,212,0) 38%), linear-gradient(180deg, #0d1322 0%, #0a0d18 100%)`,
            boxShadow: `inset 0 1px 0 ${identity.color}55, inset 0 0 34px ${identity.color}12, 0 18px 40px -24px rgba(0,0,0,0.8)`,
            animation: 'textFadeUp 0.45s cubic-bezier(0.25,0.46,0.45,0.94) both',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: isMobile ? '56px' : '64px',
                height: isMobile ? '56px' : '64px',
                borderRadius: 0,
                // The icon seat takes the icon's colour, not the sign's, so the
                // triple-lucky's gold crown sits in gold light on a green plaque
                // — the same split the board draws.
                background: `${identity.iconColor}10`,
                boxShadow: `inset 0 1px 0 ${identity.iconColor}40`,
            }}>
                <Icon size={isMobile ? 28 : 32} style={{
                    color: identity.iconColor,
                    filter: `drop-shadow(0 0 12px ${identity.iconColor}66)`,
                }} />
            </div>

            <div style={{
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: 700,
                letterSpacing: '0.02em',
                textAlign: 'center',
                color: identity.color,
                textShadow: `0 0 22px ${identity.color}44`,
            }}>
                {event.name}
            </div>

            <div style={{
                fontSize: isMobile ? '12px' : '13px',
                color: COLORS.textMuted,
                textAlign: 'center',
                maxWidth: isMobile ? '260px' : '340px',
                lineHeight: 1.45,
            }}>
                {event.description}
            </div>
        </div>
    );
}

export default BonusEventPlaque;
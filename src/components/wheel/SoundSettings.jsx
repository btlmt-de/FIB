import React from 'react';
import { Volume2, VolumeX, Music, Zap, Sparkles, Crown, Star, X, RotateCcw, Play, Square } from 'lucide-react';
import { useSound } from '../../context/SoundContext';
import { COLORS } from '../../config/constants';

// ============================================
// Sound Settings Component
// ============================================

// Slider component
function VolumeSlider({ value, onChange, disabled, color = COLORS.accent, ariaLabel = 'Volume' }) {
    const percentage = Math.round(value * 100);

    return (
        <div style={{
            position: 'relative',
            flex: 1,
            height: '24px',
            display: 'flex',
            alignItems: 'center'
        }}>
            <input
                type="range"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => onChange(parseInt(e.target.value) / 100)}
                disabled={disabled}
                className="volume-slider"
                aria-label={ariaLabel}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
                style={{
                    width: '100%',
                    height: '6px',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    background: `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, ${COLORS.bg} ${percentage}%, ${COLORS.bg} 100%)`,
                    borderRadius: '3px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.4 : 1,
                    outline: 'none',
                }}
            />
            <style>{`
                .volume-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #fff;
                    cursor: pointer;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    border: none;
                }
                .volume-slider::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #fff;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                }
                .volume-slider:disabled::-webkit-slider-thumb {
                    cursor: not-allowed;
                    opacity: 0.5;
                }
            `}</style>
        </div>
    );
}

// Toggle switch component
function ToggleSwitch({ checked, onChange, disabled, color = COLORS.accent, ariaLabel }) {
    const handleKeyDown = (e) => {
        if (disabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onChange(!checked);
        }
    };

    return (
        <button
            onClick={() => !disabled && onChange(!checked)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            role="switch"
            aria-checked={checked}
            aria-disabled={disabled}
            aria-label={ariaLabel}
            style={{
                width: '40px',
                height: '22px',
                borderRadius: '11px',
                background: checked ? color : COLORS.bg,
                border: `1px solid ${checked ? color : COLORS.border}`,
                cursor: disabled ? 'not-allowed' : 'pointer',
                position: 'relative',
                transition: 'all 0.2s',
                opacity: disabled ? 0.4 : 1,
                flexShrink: 0,
                padding: 0,
            }}
        >
            <div style={{
                position: 'absolute',
                top: '2px',
                left: checked ? '20px' : '2px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
        </button>
    );
}

// Preview button component - toggles between play/stop
function PreviewButton({ onClick, disabled, isActive }) {
    const label = isActive ? "Stop preview" : "Preview sound";
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: isActive ? `${COLORS.accent}33` : 'transparent',
                border: `1px solid ${isActive ? COLORS.accent : COLORS.border}`,
                color: disabled ? COLORS.textMuted : COLORS.accent,
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
                opacity: disabled ? 0.4 : 1,
                flexShrink: 0,
                padding: 0,
            }}
            title={label}
        >
            {isActive ? (
                <Square size={12} fill={COLORS.accent} />
            ) : (
                <Play size={14} fill={disabled ? 'none' : COLORS.accent} />
            )}
        </button>
    );
}

// Sound setting row - simplified layout
function SoundRow({ icon, label, color, enabled, onToggle, onPreview, disabled, isActive }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            background: COLORS.bg,
            borderRadius: '8px',
            opacity: disabled ? 0.5 : 1,
        }}>
            {/* Icon */}
            <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: `${color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color,
                flexShrink: 0,
            }}>
                {icon}
            </div>

            {/* Label */}
            <span style={{
                flex: 1,
                color: COLORS.text,
                fontSize: '13px',
                fontWeight: '500',
            }}>
                {label}
            </span>

            {/* Preview button */}
            <PreviewButton onClick={onPreview} disabled={disabled} isActive={isActive} />

            {/* Toggle */}
            <ToggleSwitch
                checked={enabled}
                onChange={onToggle}
                disabled={disabled}
                color={color}
                ariaLabel={`Toggle ${label}`}
            />
        </div>
    );
}

// Main Sound Settings Panel
export function SoundSettingsPanel({ onClose }) {
    const {
        settings,
        updateSetting,
        toggleEnabled,
        resetToDefaults,
        isPlaying,
        toggleSoundtrack,
        previewSound,
        previewingSound,
    } = useSound();

    // Handle Escape key to close modal
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '20px',
            }}
            onClick={onClose}
            onKeyDown={handleKeyDown}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="sound-settings-title"
                style={{
                    background: COLORS.bgLight,
                    borderRadius: '16px',
                    border: `1px solid ${COLORS.border}`,
                    width: '100%',
                    maxWidth: '380px',
                    maxHeight: '85vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Volume2 size={18} color="#fff" />
                        </div>
                        <span id="sound-settings-title" style={{ color: COLORS.text, fontSize: '16px', fontWeight: '600' }}>
                            Sound Settings
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: COLORS.textMuted,
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    padding: '16px',
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    flex: 1,
                }}>
                    {/* Master Toggle */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: settings.enabled ? `${COLORS.green}11` : `${COLORS.red}11`,
                        border: `1px solid ${settings.enabled ? COLORS.green : COLORS.red}33`,
                        borderRadius: '10px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {settings.enabled ? (
                                <Volume2 size={18} color={COLORS.green} />
                            ) : (
                                <VolumeX size={18} color={COLORS.red} />
                            )}
                            <span style={{ color: COLORS.text, fontWeight: '500', fontSize: '14px' }}>
                                {settings.enabled ? 'Sound Enabled' : 'Sound Disabled'}
                            </span>
                        </div>
                        <ToggleSwitch
                            checked={settings.enabled}
                            onChange={toggleEnabled}
                            color={COLORS.green}
                            ariaLabel="Enable all sounds"
                        />
                    </div>

                    {/* Master Volume */}
                    <div style={{
                        padding: '14px 16px',
                        background: COLORS.bg,
                        borderRadius: '10px',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '12px'
                        }}>
                            <span style={{ color: COLORS.text, fontSize: '13px', fontWeight: '500' }}>
                                Master Volume
                            </span>
                            <span style={{
                                color: COLORS.textMuted,
                                fontSize: '12px',
                                background: COLORS.bgLighter,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                minWidth: '40px',
                                textAlign: 'center'
                            }}>
                                {Math.round(settings.masterVolume * 100)}%
                            </span>
                        </div>
                        <VolumeSlider
                            value={settings.masterVolume}
                            onChange={(v) => updateSetting('masterVolume', v)}
                            disabled={!settings.enabled}
                        />
                    </div>

                    {/* Music Section */}
                    <div>
                        <div style={{
                            color: COLORS.textMuted,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '8px',
                            fontWeight: '600'
                        }}>
                            Music
                        </div>

                        <div style={{
                            background: COLORS.bg,
                            borderRadius: '10px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                        }}>
                            {/* Soundtrack row */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    background: `${COLORS.accent}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: COLORS.accent,
                                    flexShrink: 0,
                                }}>
                                    <Music size={16} />
                                </div>
                                <span style={{ flex: 1, color: COLORS.text, fontSize: '13px', fontWeight: '500' }}>
                                    Soundtrack
                                </span>
                                <PreviewButton
                                    onClick={() => previewSound('soundtrack')}
                                    disabled={!settings.enabled}
                                    isActive={previewingSound === 'soundtrack'}
                                />
                                <ToggleSwitch
                                    checked={settings.soundtrackEnabled}
                                    onChange={(v) => updateSetting('soundtrackEnabled', v)}
                                    disabled={!settings.enabled}
                                    color={COLORS.accent}
                                    ariaLabel="Toggle soundtrack"
                                />
                            </div>

                            {/* Recursion Soundtrack row */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    background: `${COLORS.recursion}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: COLORS.recursion,
                                    flexShrink: 0,
                                }}>
                                    <Zap size={16} />
                                </div>
                                <span style={{ flex: 1, color: COLORS.text, fontSize: '13px', fontWeight: '500' }}>
                                    Recursion Music
                                </span>
                                <PreviewButton
                                    onClick={() => previewSound('recursionSoundtrack')}
                                    disabled={!settings.enabled}
                                    isActive={previewingSound === 'recursionSoundtrack'}
                                />
                                <ToggleSwitch
                                    checked={settings.recursionSoundtrackEnabled}
                                    onChange={(v) => updateSetting('recursionSoundtrackEnabled', v)}
                                    disabled={!settings.enabled}
                                    color={COLORS.recursion}
                                    ariaLabel="Toggle recursion music"
                                />
                            </div>

                            {/* Music volume */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                paddingLeft: '44px'
                            }}>
                                <VolumeSlider
                                    value={settings.musicVolume}
                                    onChange={(v) => updateSetting('musicVolume', v)}
                                    disabled={!settings.enabled || (!settings.soundtrackEnabled && !settings.recursionSoundtrackEnabled)}
                                    color={COLORS.accent}
                                    ariaLabel="Music volume"
                                />
                                <span style={{
                                    color: COLORS.textMuted,
                                    fontSize: '11px',
                                    minWidth: '36px',
                                    textAlign: 'right'
                                }}>
                                    {Math.round(settings.musicVolume * 100)}%
                                </span>
                            </div>

                            {/* Play/Stop button */}
                            {settings.enabled && settings.soundtrackEnabled && (
                                <button
                                    type="button"
                                    onClick={toggleSoundtrack}
                                    style={{
                                        padding: '8px 16px',
                                        background: isPlaying ? `${COLORS.red}15` : `${COLORS.green}15`,
                                        border: `1px solid ${isPlaying ? COLORS.red : COLORS.green}33`,
                                        borderRadius: '6px',
                                        color: isPlaying ? COLORS.red : COLORS.green,
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        marginTop: '4px',
                                    }}
                                >
                                    {isPlaying ? <Square size={12} /> : <Play size={12} fill={COLORS.green} />}
                                    {isPlaying ? 'Stop Music' : 'Play Music'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sound Effects Section */}
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                        }}>
                            <span style={{
                                color: COLORS.textMuted,
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontWeight: '600'
                            }}>
                                Sound Effects
                            </span>
                            <span style={{
                                color: COLORS.textMuted,
                                fontSize: '11px',
                                background: COLORS.bg,
                                padding: '2px 8px',
                                borderRadius: '4px',
                            }}>
                                {Math.round(settings.sfxVolume * 100)}%
                            </span>
                        </div>

                        {/* SFX Volume Slider */}
                        <div style={{
                            padding: '10px 12px',
                            background: COLORS.bg,
                            borderRadius: '8px',
                            marginBottom: '8px',
                        }}>
                            <VolumeSlider
                                value={settings.sfxVolume}
                                onChange={(v) => updateSetting('sfxVolume', v)}
                                disabled={!settings.enabled}
                                color={COLORS.orange}
                            />
                        </div>

                        {/* Individual SFX toggles */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <SoundRow
                                icon={<Zap size={16} />}
                                label="Recursion Event"
                                color={COLORS.recursion}
                                enabled={settings.recursionEnabled}
                                onToggle={(v) => updateSetting('recursionEnabled', v)}
                                onPreview={() => previewSound('recursion')}
                                disabled={!settings.enabled}
                                isActive={previewingSound === 'recursion'}
                            />
                            <SoundRow
                                icon={<Sparkles size={16} />}
                                label="Insane Item"
                                color={COLORS.insane}
                                enabled={settings.insaneEnabled}
                                onToggle={(v) => updateSetting('insaneEnabled', v)}
                                onPreview={() => previewSound('insane')}
                                disabled={!settings.enabled}
                                isActive={previewingSound === 'insane'}
                            />
                            <SoundRow
                                icon={<Crown size={16} />}
                                label="Legendary / Mythic"
                                color={COLORS.purple}
                                enabled={settings.legendaryEnabled}
                                onToggle={(v) => updateSetting('legendaryEnabled', v)}
                                onPreview={() => previewSound('legendary')}
                                disabled={!settings.enabled}
                                isActive={previewingSound === 'legendary'}
                            />
                            <SoundRow
                                icon={<Star size={16} />}
                                label="Rare Item"
                                color={COLORS.red}
                                enabled={settings.rareEnabled}
                                onToggle={(v) => updateSetting('rareEnabled', v)}
                                onPreview={() => previewSound('rare')}
                                disabled={!settings.enabled}
                                isActive={previewingSound === 'rare'}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 16px',
                    borderTop: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                }}>
                    {/* Credits */}
                    <div style={{
                        textAlign: 'center',
                        color: COLORS.textMuted,
                        fontSize: '11px',
                    }}>
                        Sounds by <span style={{ color: COLORS.purple, fontWeight: '500' }}>CH0RD</span>
                    </div>

                    {/* Buttons */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <button
                            type="button"
                            onClick={resetToDefaults}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                background: 'transparent',
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '6px',
                                color: COLORS.textMuted,
                                fontSize: '12px',
                                cursor: 'pointer',
                            }}
                        >
                            <RotateCcw size={14} />
                            Reset
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '8px 24px',
                                background: COLORS.accent,
                                border: 'none',
                                borderRadius: '6px',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Compact sound button for header/navigation
export function SoundButton({ onClick }) {
    const { settings, isPlaying } = useSound();
    const label = settings.enabled ? "Sound settings (enabled)" : "Sound settings (disabled)";

    return (
        <button
            type="button"
            onClick={onClick}
            title="Sound Settings"
            aria-label={label}
            style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: settings.enabled
                    ? (isPlaying ? `${COLORS.accent}22` : COLORS.bgLighter)
                    : `${COLORS.red}15`,
                border: `1px solid ${settings.enabled
                    ? (isPlaying ? COLORS.accent : COLORS.border)
                    : COLORS.red}33`,
                color: settings.enabled
                    ? (isPlaying ? COLORS.accent : COLORS.textMuted)
                    : COLORS.red,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                padding: 0,
            }}
        >
            {settings.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
    );
}

export default SoundSettingsPanel;
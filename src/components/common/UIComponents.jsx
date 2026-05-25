// @refresh reset
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
// Direct imports for bundle optimization (react-best-practices rule 2.1)
import X from 'lucide-react/dist/esm/icons/x';
import Check from 'lucide-react/dist/esm/icons/check';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Info from 'lucide-react/dist/esm/icons/info';
import Search from 'lucide-react/dist/esm/icons/search';
import Package from 'lucide-react/dist/esm/icons/package';
import SearchX from 'lucide-react/dist/esm/icons/search-x';
import PackageOpen from 'lucide-react/dist/esm/icons/package-open';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

// ── V2 design tokens ────────────────────────────────────────────────────────
const C = {
    bg:       'oklch(17% 0.025 255)',
    surface:  'oklch(21% 0.023 255)',
    surfHov:  'oklch(25% 0.021 255)',
    raised:   'oklch(23% 0.022 255)',
    border:   'oklch(30% 0.019 255)',
    borderF:  'oklch(24% 0.022 255)',
    text:     'oklch(94% 0.007 255)',
    textMid:  'oklch(74% 0.012 255)',
    muted:    'oklch(58% 0.012 255)',
    dim:      'oklch(42% 0.013 255)',
    amber:    'oklch(76% 0.16 68)',
    green:    'oklch(64% 0.20 142)',
    red:      'oklch(62% 0.22 25)',
    warn:     'oklch(82% 0.16 90)',
    cyan:     'oklch(68% 0.12 200)',
    early:    'oklch(64% 0.20 142)',
    mid:      'oklch(76% 0.16 68)',
    late:     'oklch(62% 0.22 25)',
    nether:   'oklch(60% 0.20 15)',
    end:      'oklch(65% 0.15 290)',
    extreme:  'oklch(66% 0.20 45)',
    desc:     'oklch(68% 0.12 200)',
};

// Compatibility alias — re-exported from the canonical tokens module so that
// components importing COLORS from UIComponents continue to work.
import { COLORS } from '../../config/constants';
export { COLORS };

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================

const ToastContext = createContext(null);

// Hoisted constants (react-best-practices rule 7.9)
const TOAST_DURATION = 4000;
const TOAST_EXIT_DURATION = 300;

// Hoisted icon/color maps (avoid recreation)
const TOAST_ICONS = { success: Check, error: AlertTriangle, warning: AlertTriangle, info: Info };
const TOAST_COLORS = { success: C.green, error: C.red, warning: C.warn, info: C.cyan };

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const toastIdRef = useRef(0);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, TOAST_EXIT_DURATION);
    }, []);

    const addToast = useCallback((message, type = 'info', duration = TOAST_DURATION) => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { id, message, type, exiting: false }]);

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }

        return id;
    }, [removeToast]);

    // Memoize context value (react-best-practices rule 5.2)
    const contextValue = useMemo(() => ({
        addToast,
        removeToast,
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        warning: (msg) => addToast(msg, 'warning'),
        info: (msg) => addToast(msg, 'info'),
    }), [addToast, removeToast]);

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

function ToastContainer({ toasts, onRemove }) {
    if (toasts.length === 0) return null;

    const TOAST_ICON_COLOR = { success: C.green, error: C.red, warning: C.warn, info: C.cyan };

    return (
        <div style={{
            position: 'fixed', bottom: 20, right: 20,
            zIndex: 9999, display: 'flex', flexDirection: 'column',
            gap: 8, pointerEvents: 'none',
        }}>
            {toasts.map(toast => {
                const Icon  = TOAST_ICONS[toast.type] || Info;
                const color = TOAST_ICON_COLOR[toast.type] || C.cyan;
                return (
                    <div
                        key={toast.id}
                        style={{
                            background: C.surface,
                            border: `1px solid ${color}40`,
                            borderRadius: 8,
                            padding: '12px 14px',
                            display: 'flex', alignItems: 'center', gap: 12,
                            minWidth: 280, maxWidth: 400,
                            pointerEvents: 'auto',
                            animation: toast.exiting
                                ? 'toastSlideOut 0.3s ease-in forwards'
                                : 'toastSlideIn 0.3s cubic-bezier(0.21, 1.02, 0.73, 1)',
                        }}
                    >
                        <div style={{
                            width: 28, height: 28, borderRadius: 6,
                            background: `${color}15`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Icon size={14} style={{ color }} />
                        </div>
                        <span style={{
                            color: C.textMid, fontSize: 13, flex: 1, lineHeight: 1.5,
                        }}>
                            {toast.message}
                        </span>
                        <button
                            onClick={() => onRemove(toast.id)}
                            aria-label="Close notification"
                            style={{
                                background: 'none', border: 'none',
                                color: C.dim, cursor: 'pointer',
                                padding: 4, display: 'flex', flexShrink: 0,
                                borderRadius: 4,
                            }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================================
// SKELETON LOADING COMPONENTS
// ============================================================================

export function SkeletonCard() {
    const shimmer = {
        background: `linear-gradient(90deg, oklch(16% 0.014 240) 25%, oklch(19.5% 0.013 240) 50%, oklch(16% 0.014 240) 75%)`,
        backgroundSize: '200% 100%',
        animation: 'skeletonShimmer 1.5s infinite',
        borderRadius: 4,
    };
    return (
        <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '14px 14px 12px',
            display: 'flex', flexDirection: 'column', gap: 9,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ ...shimmer, width: 40, height: 40, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                    <div style={{ ...shimmer, height: 13, width: '72%', marginBottom: 6 }} />
                    <div style={{ ...shimmer, height: 9, width: '38%' }} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
                <div style={{ ...shimmer, width: 48, height: 20 }} />
                <div style={{ ...shimmer, width: 38, height: 20, animationDelay: '0.1s' }} />
            </div>
        </div>
    );
}

export function SkeletonGrid({ count = 12 }) {
    const items = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 8,
        }}>
            {items.map(i => <SkeletonCard key={i} />)}
        </div>
    );
}


// ============================================================================
// STATE BADGE (Minecraft pixelated style)
// ============================================================================

export function StateBadge({ state }) {
    const stateCol = { EARLY: C.early, MID: C.mid, LATE: C.late };
    const color = stateCol[state] || C.muted;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            background: `${color}18`, color,
            padding: '3px 8px', fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.5px',
            border: `1px solid ${color}45`,
            borderRadius: 4,
            fontFamily: 'Barlow Condensed, system-ui, sans-serif',
        }}>
            {state}
        </span>
    );
}

export function TagBadge({ tag }) {
    const tagCol = { NETHER: C.nether, END: C.end, EXTREME: C.extreme };
    const color = tagCol[tag] || C.muted;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            background: `${color}18`, color,
            padding: '3px 8px', fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.5px',
            border: `1px solid ${color}45`,
            borderRadius: 4,
            fontFamily: 'Barlow Condensed, system-ui, sans-serif',
        }}>
            {tag}
        </span>
    );
}

// ============================================================================
// ANIMATED VIEW MODE TOGGLE
// ============================================================================

export function ViewModeToggle({ value, onChange, options }) {
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
    const containerRef = useRef(null);
    const buttonRefs = useRef({});

    // Calculate indicator position
    const updateIndicator = useCallback(() => {
        const activeButton = buttonRefs.current[value];
        const container = containerRef.current;

        if (activeButton && container) {
            const containerRect = container.getBoundingClientRect();
            const buttonRect = activeButton.getBoundingClientRect();

            setIndicatorStyle({
                left: buttonRect.left - containerRect.left,
                width: buttonRect.width,
            });
        }
    }, [value]);

    useEffect(() => {
        // Initial calculation
        updateIndicator();

        // Recalculate after a short delay to handle font loading, etc.
        const timeoutId = setTimeout(updateIndicator, 50);

        return () => clearTimeout(timeoutId);
    }, [value, options, updateIndicator]);

    return (
        <div
            ref={containerRef}
            style={{
                display: 'inline-flex',
                background: C.bg,
                borderRadius: '6px',
                padding: '3px',
                position: 'relative',
                border: `1px solid ${C.border}`,
                height: '38px',
                boxSizing: 'border-box',
            }}
        >
            {/* Animated sliding indicator */}
            <div
                style={{
                    position: 'absolute',
                    top: '3px',
                    bottom: '3px',
                    left: indicatorStyle.left,
                    width: indicatorStyle.width,
                    background: C.amber,
                    borderRadius: '4px',
                    transition: 'left 0.2s ease, width 0.2s ease',
                }}
            />

            {options.map(option => (
                <button
                    key={option.value}
                    ref={el => { buttonRefs.current[option.value] = el; }}
                    onClick={() => onChange(option.value)}
                    style={{
                        padding: '0 14px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        color: value === option.value ? 'oklch(14% 0.01 50)' : C.muted,
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        position: 'relative',
                        zIndex: 1,
                        transition: 'color 0.15s',
                        height: '100%',
                    }}
                >
                    {option.icon}
                    {option.label}
                    {option.count !== undefined && (
                        <span style={{
                            background: value === option.value ? 'rgba(255,255,255,0.2)' : C.surface,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            minWidth: '20px',
                            textAlign: 'center',
                            transition: 'background 0.15s',
                        }}>
                            <AnimatedNumber value={option.count} />
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

// ============================================================================
// ANIMATED NUMBER
// ============================================================================

export function AnimatedNumber({ value, duration = 400 }) {
    const [displayValue, setDisplayValue] = useState(value);
    const prevValueRef = useRef(value);
    const rafRef = useRef(null);

    useEffect(() => {
        const prevValue = prevValueRef.current;
        if (prevValue === value) return;

        const startTime = performance.now();
        const startValue = prevValue;
        const endValue = value;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out expo
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const current = Math.round(startValue + (endValue - startValue) * eased);

            setDisplayValue(current);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };

        rafRef.current = requestAnimationFrame(animate);
        prevValueRef.current = value;

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [value, duration]);

    return <>{displayValue.toLocaleString()}</>;
}

// ============================================================================
// EMPTY STATES
// ============================================================================

export function EmptyState({ icon: Icon = Package, title, description, actionLabel, onAction }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '56px 24px', textAlign: 'center',
            animation: 'fadeIn 0.3s ease-out',
        }}>
            <div style={{
                width: 64, height: 64, borderRadius: 10,
                background: C.raised,
                border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
            }}>
                <Icon size={28} style={{ color: C.dim }} />
            </div>
            <h3 style={{
                color: C.text, fontSize: 16, fontWeight: 600,
                margin: '0 0 8px', letterSpacing: '-0.01em',
            }}>
                {title}
            </h3>
            <p style={{
                color: C.muted, fontSize: 13.5, margin: 0,
                maxWidth: 300, lineHeight: 1.65,
            }}>
                {description}
            </p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    style={{
                        marginTop: 20, padding: '8px 18px',
                        background: C.amber, border: 'none', borderRadius: 6,
                        color: 'oklch(14% 0.01 50)', fontSize: 13, fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'Barlow, system-ui, sans-serif',
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

// Pre-configured empty states
export function NoResultsEmpty({ searchTerm, onClear }) {
    return (
        <EmptyState
            icon={SearchX}
            title="No items found"
            description={searchTerm
                ? `No items match "${searchTerm}". Try adjusting your search or clearing filters.`
                : "No items match your current filters."
            }
            actionLabel={onClear ? "Clear Search" : undefined}
            onAction={onClear}
        />
    );
}

export function NoMissingItemsEmpty() {
    return (
        <EmptyState
            icon={PackageOpen}
            title="All items are pooled!"
            description="Every Minecraft item is already assigned to a difficulty pool. Nice work keeping everything organized."
        />
    );
}

// ============================================================================
// PROGRESS STEPS
// ============================================================================

export function ProgressSteps({ steps, currentStep }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', marginBottom: 20 }}>
            {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent   = index === currentStep;
                const isLast      = index === steps.length - 1;
                const dotColor    = isCompleted ? C.green : isCurrent ? C.amber : C.raised;
                const dotBorder   = isCompleted ? C.green : isCurrent ? C.amber : C.border;
                return (
                    <React.Fragment key={step.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: dotColor,
                                border: `2px solid ${dotBorder}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'background 0.25s, border-color 0.25s',
                                flexShrink: 0,
                            }}>
                                {isCompleted ? (
                                    <Check size={14} style={{ color: C.bg }} />
                                ) : (
                                    <span style={{
                                        color: isCurrent ? 'oklch(14% 0.01 50)' : C.dim,
                                        fontSize: 12, fontWeight: 700,
                                    }}>
                                        {index + 1}
                                    </span>
                                )}
                            </div>
                            <span style={{
                                color: isCurrent ? C.text : isCompleted ? C.green : C.muted,
                                fontSize: 12.5, fontWeight: isCurrent ? 600 : 500,
                                whiteSpace: 'nowrap', transition: 'color 0.2s',
                            }}>
                                {step.label}
                            </span>
                        </div>
                        {!isLast && (
                            <div style={{
                                flex: 1, height: 2, background: C.border,
                                margin: '0 12px', minWidth: 32, borderRadius: 1,
                                position: 'relative', overflow: 'hidden',
                            }}>
                                <div style={{
                                    position: 'absolute', top: 0, left: 0,
                                    height: '100%', width: isCompleted ? '100%' : '0%',
                                    background: C.green,
                                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                }} />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ============================================================================
// ENHANCED SEARCH INPUT
// ============================================================================

export function SearchInput({
                                value,
                                onChange,
                                placeholder = 'Search items...',
                                debounceMs = 150,
                                showShortcut = true,
                            }) {
    const [localValue, setLocalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    // Sync with external value
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    // Debounced onChange handler
    const handleChange = useCallback((e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => onChange(newValue), debounceMs);
    }, [onChange, debounceMs]);

    // Keyboard shortcut: "/" to focus
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if focus is on any text input element
            const active = document.activeElement;
            if (!active) return;
            if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable) {
                return;
            }

            if (e.key === '/') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const handleClear = useCallback(() => {
        setLocalValue('');
        onChange('');
        inputRef.current?.focus();
    }, [onChange]);

    return (
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search
                size={16}
                style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: isFocused ? C.amber : C.muted,
                    transition: 'color 0.15s',
                    pointerEvents: 'none',
                }}
            />
            <input
                ref={inputRef}
                type="text"
                value={localValue}
                onChange={handleChange}
                placeholder={placeholder}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={{
                    width: '100%', height: 38,
                    padding: '0 36px 0 38px',
                    background: C.bg,
                    border: `1px solid ${isFocused ? C.border : C.borderF}`,
                    borderRadius: 6, color: C.text,
                    fontSize: 13, outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                }}
            />

            {/* Clear button or shortcut hint */}
            {localValue ? (
                <button
                    onClick={handleClear}
                    aria-label="Clear search"
                    style={{
                        position: 'absolute', right: 8, top: '50%',
                        transform: 'translateY(-50%)',
                        background: C.raised, border: 'none', borderRadius: 4,
                        width: 20, height: 20,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: C.muted,
                    }}
                >
                    <X size={12} />
                </button>
            ) : showShortcut && !isFocused && (
                <span style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: C.dim,
                    fontSize: '10px',
                    padding: '2px 6px',
                    background: C.surface,
                    borderRadius: '3px',
                    border: `1px solid ${C.border}`,
                    fontFamily: 'monospace',
                    pointerEvents: 'none',
                }}>
                    /
                </span>
            )}
        </div>
    );
}

// ============================================================================
// FILTER CHIP
// ============================================================================

export function FilterChip({ label, active, onClick, color, count }) {
    const chipColor = color || C.amber;
    return (
        <button
            onClick={onClick}
            style={{
                padding: '5px 12px',
                background: active ? `${chipColor}18` : 'transparent',
                border: `1px solid ${active ? chipColor + '55' : C.border}`,
                borderRadius: 5,
                color: active ? chipColor : C.muted,
                fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                whiteSpace: 'nowrap',
                fontFamily: 'Barlow, system-ui, sans-serif',
                textTransform: 'uppercase', letterSpacing: '0.5px',
            }}
        >
            {label}
            {count !== undefined && (
                <span style={{
                    background: active ? `${chipColor}25` : C.raised,
                    padding: '1px 6px', borderRadius: 4,
                    fontSize: 10, fontWeight: 700,
                }}>
                    {count}
                </span>
            )}
        </button>
    );
}

// ============================================================================
// GLOBAL STYLES (CSS Animations)
// ============================================================================

export function GlobalStyles() {
    return (
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');

            @keyframes skeletonShimmer {
                0%   { background-position: -200% 0; }
                100% { background-position:  200% 0; }
            }
            @keyframes toastSlideIn {
                from { transform: translateX(120%); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
            }
            @keyframes toastSlideOut {
                from { transform: translateX(0);    opacity: 1; }
                to   { transform: translateX(120%); opacity: 0; }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to   { opacity: 1; }
            }
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(12px); }
                to   { opacity: 1; transform: translateY(0);    }
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
            }

            ::-webkit-scrollbar { width: 7px; height: 7px; }
            ::-webkit-scrollbar-track { background: oklch(17% 0.025 255); }
            ::-webkit-scrollbar-thumb { background: oklch(30% 0.019 255); border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: oklch(36% 0.017 255); }

            select { font-family: inherit; }
            select option { background: oklch(21% 0.023 255); color: oklch(94% 0.007 255); }
            select:focus  { border-color: oklch(44% 0.014 255) !important; outline: none; }
        `}</style>
    );
}

export default {
    COLORS,
    ToastProvider,
    useToast,
    SkeletonCard,
    SkeletonGrid,
    StateBadge,
    TagBadge,
    ViewModeToggle,
    AnimatedNumber,
    EmptyState,
    NoResultsEmpty,
    NoMissingItemsEmpty,
    ProgressSteps,
    SearchInput,
    FilterChip,
    GlobalStyles,
};
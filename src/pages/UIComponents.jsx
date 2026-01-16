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

export const COLORS = {
    // State colors (Minecraft-inspired)
    early: '#55FF55',
    mid: '#FFFF55',
    late: '#FF5555',
    nether: '#AA0000',
    end: '#AA00AA',
    extreme: '#FF55FF',
    description: '#55FFFF',

    // UI colors
    bg: '#1a1a2e',
    bgLight: '#252542',
    bgLighter: '#2d2d4a',
    bgHover: '#303050',
    text: '#e0e0e0',
    textMuted: '#888',
    textDim: '#666',
    border: '#3d3d5c',
    borderLight: '#4d4d6c',
    accent: '#5865F2',
    accentHover: '#6875F3',

    // Toast/status colors
    success: '#55FF55',
    error: '#FF5555',
    warning: '#FFFF55',
    info: '#55FFFF',
};

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================

const ToastContext = createContext(null);

// Hoisted constants (react-best-practices rule 7.9)
const TOAST_DURATION = 4000;
const TOAST_EXIT_DURATION = 300;

// Hoisted icon/color maps (avoid recreation)
const TOAST_ICONS = { success: Check, error: AlertTriangle, warning: AlertTriangle, info: Info };
const TOAST_COLORS = { success: COLORS.success, error: COLORS.error, warning: COLORS.warning, info: COLORS.info };

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

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'none'
        }}>
            {toasts.map(toast => {
                const Icon = TOAST_ICONS[toast.type] || Info;
                const color = TOAST_COLORS[toast.type] || COLORS.info;

                return (
                    <div
                        key={toast.id}
                        style={{
                            background: COLORS.bgLight,
                            border: `1px solid ${color}44`,
                            borderLeft: `3px solid ${color}`,
                            borderRadius: '8px',
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 30px ${color}15`,
                            minWidth: '300px',
                            maxWidth: '420px',
                            pointerEvents: 'auto',
                            animation: toast.exiting
                                ? 'toastSlideOut 0.3s ease-in forwards'
                                : 'toastSlideIn 0.3s cubic-bezier(0.21, 1.02, 0.73, 1)',
                        }}
                    >
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: `${color}22`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Icon size={16} style={{ color }} />
                        </div>
                        <span style={{
                            color: COLORS.text,
                            fontSize: '13px',
                            flex: 1,
                            lineHeight: 1.5,
                            fontWeight: '500',
                        }}>
                            {toast.message}
                        </span>
                        <button
                            onClick={() => onRemove(toast.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: COLORS.textMuted,
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                flexShrink: 0,
                                borderRadius: '4px',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = COLORS.bgLighter}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                            <X size={16} />
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
    return (
        <div style={{
            background: COLORS.bgLight,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    background: `linear-gradient(90deg, ${COLORS.bgLighter} 25%, ${COLORS.bgHover} 50%, ${COLORS.bgLighter} 75%)`,
                    backgroundSize: '200% 100%',
                    borderRadius: '4px',
                    animation: 'skeletonShimmer 1.5s infinite',
                }} />
                <div style={{ flex: 1 }}>
                    <div style={{
                        height: '14px',
                        width: '75%',
                        background: `linear-gradient(90deg, ${COLORS.bgLighter} 25%, ${COLORS.bgHover} 50%, ${COLORS.bgLighter} 75%)`,
                        backgroundSize: '200% 100%',
                        borderRadius: '3px',
                        animation: 'skeletonShimmer 1.5s infinite',
                        marginBottom: '6px',
                    }} />
                    <div style={{
                        height: '10px',
                        width: '40%',
                        background: `linear-gradient(90deg, ${COLORS.bgLighter} 25%, ${COLORS.bgHover} 50%, ${COLORS.bgLighter} 75%)`,
                        backgroundSize: '200% 100%',
                        borderRadius: '3px',
                        animation: 'skeletonShimmer 1.5s infinite',
                    }} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{
                    width: '52px',
                    height: '22px',
                    background: `linear-gradient(90deg, ${COLORS.bgLighter} 25%, ${COLORS.bgHover} 50%, ${COLORS.bgLighter} 75%)`,
                    backgroundSize: '200% 100%',
                    borderRadius: '3px',
                    animation: 'skeletonShimmer 1.5s infinite',
                }} />
                <div style={{
                    width: '42px',
                    height: '22px',
                    background: `linear-gradient(90deg, ${COLORS.bgLighter} 25%, ${COLORS.bgHover} 50%, ${COLORS.bgLighter} 75%)`,
                    backgroundSize: '200% 100%',
                    borderRadius: '3px',
                    animation: 'skeletonShimmer 1.5s infinite',
                    animationDelay: '0.1s',
                }} />
            </div>
        </div>
    );
}

export function SkeletonGrid({ count = 12 }) {
    // Memoize array to avoid recreation (react-best-practices)
    const items = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '12px',
        }}>
            {items.map(i => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}

// ============================================================================
// STATE BADGE (Minecraft pixelated style)
// ============================================================================

export function StateBadge({ state }) {
    const color = COLORS[state?.toLowerCase()] || COLORS.textMuted;

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: `${color}22`,
            color: color,
            padding: '3px 8px',
            fontSize: '10px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            border: `1px solid ${color}44`,
        }}>
            {state}
        </span>
    );
}

export function TagBadge({ tag }) {
    const colorMap = { NETHER: COLORS.nether, END: COLORS.end, EXTREME: COLORS.extreme };
    const color = colorMap[tag] || COLORS.textMuted;

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: `${color}22`,
            color: color,
            padding: '3px 8px',
            fontSize: '10px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            border: `1px solid ${color}44`,
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

    useEffect(() => {
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

    return (
        <div
            ref={containerRef}
            style={{
                display: 'inline-flex',
                background: COLORS.bg,
                borderRadius: '6px',
                padding: '3px',
                position: 'relative',
                border: `1px solid ${COLORS.border}`,
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
                    background: COLORS.accent,
                    borderRadius: '4px',
                    transition: 'left 0.2s ease, width 0.2s ease',
                }}
            />

            {options.map(option => (
                <button
                    key={option.value}
                    ref={el => buttonRefs.current[option.value] = el}
                    onClick={() => onChange(option.value)}
                    style={{
                        padding: '0 14px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        color: value === option.value ? '#fff' : COLORS.textMuted,
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
                            background: value === option.value ? 'rgba(255,255,255,0.2)' : COLORS.bgLight,
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
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px',
            textAlign: 'center',
            animation: 'fadeIn 0.4s ease-out',
        }}>
            <div style={{
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                background: `linear-gradient(145deg, ${COLORS.bgLighter} 0%, ${COLORS.bg} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                border: `2px dashed ${COLORS.border}`,
                boxShadow: `inset 0 2px 10px rgba(0,0,0,0.3)`,
            }}>
                <Icon size={40} style={{ color: COLORS.textMuted, opacity: 0.7 }} />
            </div>

            <h3 style={{
                color: COLORS.text,
                fontSize: '18px',
                fontWeight: '600',
                margin: '0 0 10px 0',
                letterSpacing: '-0.01em',
            }}>
                {title}
            </h3>

            <p style={{
                color: COLORS.textMuted,
                fontSize: '14px',
                margin: '0',
                maxWidth: '320px',
                lineHeight: 1.6,
            }}>
                {description}
            </p>

            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    style={{
                        marginTop: '24px',
                        padding: '12px 24px',
                        background: COLORS.accent,
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = `0 6px 20px ${COLORS.accent}44`;
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
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
        <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '24px',
            padding: '0 8px',
        }}>
            {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                const isLast = index === steps.length - 1;

                return (
                    <React.Fragment key={step.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: isCompleted
                                    ? COLORS.success
                                    : isCurrent
                                        ? COLORS.accent
                                        : COLORS.bgLighter,
                                border: `2px solid ${isCompleted ? COLORS.success : isCurrent ? COLORS.accent : COLORS.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: isCurrent
                                    ? `0 0 0 4px ${COLORS.accent}22, 0 2px 8px ${COLORS.accent}44`
                                    : isCompleted
                                        ? `0 2px 8px ${COLORS.success}44`
                                        : 'none',
                            }}>
                                {isCompleted ? (
                                    <Check size={16} style={{ color: COLORS.bg }} />
                                ) : (
                                    <span style={{
                                        color: isCurrent ? '#fff' : COLORS.textMuted,
                                        fontSize: '13px',
                                        fontWeight: '700',
                                    }}>
                                        {index + 1}
                                    </span>
                                )}
                            </div>

                            <span style={{
                                color: isCurrent ? COLORS.text : isCompleted ? COLORS.success : COLORS.textMuted,
                                fontSize: '13px',
                                fontWeight: isCurrent ? '600' : '500',
                                whiteSpace: 'nowrap',
                                transition: 'color 0.2s',
                            }}>
                                {step.label}
                            </span>
                        </div>

                        {!isLast && (
                            <div style={{
                                flex: 1,
                                height: '2px',
                                background: COLORS.border,
                                margin: '0 16px',
                                minWidth: '40px',
                                position: 'relative',
                                overflow: 'hidden',
                                borderRadius: '1px',
                            }}>
                                {/* Progress fill */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    height: '100%',
                                    width: isCompleted ? '100%' : '0%',
                                    background: COLORS.success,
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
            if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
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
                    color: isFocused ? COLORS.accent : COLORS.textMuted,
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
                    width: '100%',
                    height: '38px',
                    padding: '0 36px 0 38px',
                    background: COLORS.bg,
                    border: `1px solid ${isFocused ? COLORS.accent : COLORS.border}`,
                    borderRadius: '6px',
                    color: COLORS.text,
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                    boxShadow: isFocused ? `0 0 0 3px ${COLORS.accent}22` : 'none',
                }}
            />

            {/* Clear button or shortcut hint */}
            {localValue ? (
                <button
                    onClick={handleClear}
                    style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: COLORS.bgLight,
                        border: 'none',
                        borderRadius: '4px',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: COLORS.textMuted,
                        transition: 'color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.color = COLORS.text;
                        e.currentTarget.style.background = COLORS.bgHover;
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = COLORS.textMuted;
                        e.currentTarget.style.background = COLORS.bgLight;
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
                    color: COLORS.textDim,
                    fontSize: '10px',
                    padding: '2px 6px',
                    background: COLORS.bgLight,
                    borderRadius: '3px',
                    border: `1px solid ${COLORS.border}`,
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
    const chipColor = color || COLORS.accent;

    return (
        <button
            onClick={onClick}
            style={{
                padding: '7px 14px',
                background: active ? `${chipColor}22` : 'transparent',
                border: `1px solid ${active ? chipColor : COLORS.border}`,
                borderRadius: '20px',
                color: active ? chipColor : COLORS.textMuted,
                fontSize: '12px',
                fontWeight: active ? '600' : '500',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
                if (!active) {
                    e.currentTarget.style.borderColor = chipColor;
                    e.currentTarget.style.color = chipColor;
                }
            }}
            onMouseLeave={e => {
                if (!active) {
                    e.currentTarget.style.borderColor = COLORS.border;
                    e.currentTarget.style.color = COLORS.textMuted;
                }
            }}
        >
            {label}
            {count !== undefined && (
                <span style={{
                    background: active ? `${chipColor}33` : COLORS.bgLighter,
                    padding: '2px 7px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: '700',
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
            @keyframes skeletonShimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
            
            @keyframes toastSlideIn {
                from {
                    transform: translateX(120%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes toastSlideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(120%);
                    opacity: 0;
                }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { 
                    opacity: 0;
                    transform: translateY(12px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            @keyframes cardGlow {
                0%, 100% { box-shadow: 0 0 0 rgba(88, 101, 242, 0); }
                50% { box-shadow: 0 0 20px rgba(88, 101, 242, 0.3); }
            }
            
            /* Custom scrollbar */
            ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            ::-webkit-scrollbar-track {
                background: ${COLORS.bg};
            }
            ::-webkit-scrollbar-thumb {
                background: ${COLORS.border};
                border-radius: 4px;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: ${COLORS.borderLight};
            }
            
            /* Select dropdown styling */
            select {
                font-family: inherit;
            }
            select option {
                background: ${COLORS.bgLight};
                color: ${COLORS.text};
                padding: 8px;
            }
            select:focus {
                border-color: ${COLORS.accent} !important;
                outline: none;
            }
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
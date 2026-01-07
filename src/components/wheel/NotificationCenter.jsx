import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, API_BASE_URL } from '../../config/constants';
import { Bell, X, Check, CheckCheck, Megaphone, Wrench, FileText, ChevronDown } from 'lucide-react';

// ============================================
// Notification Bell (shows in header)
// ============================================
export function NotificationBell({ onClick, unreadCount }) {
    return (
        <button
            onClick={onClick}
            style={{
                position: 'relative',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = COLORS.bgLight}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Notifications"
        >
            <Bell size={20} color={unreadCount > 0 ? COLORS.gold : COLORS.textMuted} />
            {unreadCount > 0 && (
                <span style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: COLORS.red,
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: '700',
                    borderRadius: '50%',
                    minWidth: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
}

// ============================================
// Notification Center (dropdown/modal)
// ============================================
export function NotificationCenter({ isOpen, onClose }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen, fetchNotifications]);

    const markAsRead = async (id) => {
        try {
            await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
                method: 'POST',
                credentials: 'include'
            });
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
            );
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
                method: 'POST',
                credentials: 'include'
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'announcement': return <Megaphone size={14} />;
            case 'maintenance': return <Wrench size={14} />;
            default: return <FileText size={14} />;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'announcement': return COLORS.gold;
            case 'maintenance': return COLORS.orange;
            default: return COLORS.accent;
        }
    };

    const getPriorityStyle = (priority) => {
        if (priority === 'high') {
            return { borderLeft: `3px solid ${COLORS.red}` };
        }
        return {};
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (!isOpen) return null;

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 999
                }}
            />

            {/* Notification Panel */}
            <div style={{
                position: 'fixed',
                top: '60px',
                right: '20px',
                width: '380px',
                maxHeight: '70vh',
                background: COLORS.bg,
                borderRadius: '12px',
                border: `1px solid ${COLORS.border}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'slideDown 0.2s ease-out'
            }}>
                <style>{`
                    @keyframes slideDown {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .notification-item:hover {
                        background: ${COLORS.bgLight} !important;
                    }
                `}</style>

                {/* Header */}
                <div style={{
                    padding: '16px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Bell size={18} color={COLORS.accent} />
                        <span style={{ color: COLORS.text, fontWeight: '600', fontSize: '15px' }}>
                            Notifications
                        </span>
                        {unreadCount > 0 && (
                            <span style={{
                                background: COLORS.red,
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: '600',
                                padding: '2px 8px',
                                borderRadius: '10px'
                            }}>
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: COLORS.accent,
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                                title="Mark all as read"
                            >
                                <CheckCheck size={14} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: COLORS.textMuted,
                                cursor: 'pointer',
                                padding: '4px'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '8px'
                }}>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: COLORS.textMuted }}>
                            Loading...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: COLORS.textMuted }}>
                            <Bell size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <div>No notifications yet</div>
                        </div>
                    ) : (
                        notifications.map(notification => {
                            const isExpanded = expandedId === notification.id;
                            const typeColor = getTypeColor(notification.type);

                            return (
                                <div
                                    key={notification.id}
                                    className="notification-item"
                                    onClick={() => {
                                        setExpandedId(isExpanded ? null : notification.id);
                                        if (!notification.is_read) {
                                            markAsRead(notification.id);
                                        }
                                    }}
                                    style={{
                                        padding: '12px',
                                        marginBottom: '6px',
                                        borderRadius: '8px',
                                        background: notification.is_read ? 'transparent' : `${COLORS.accent}08`,
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                        ...getPriorityStyle(notification.priority)
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px'
                                    }}>
                                        {/* Type icon */}
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '6px',
                                            background: `${typeColor}20`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: typeColor,
                                            flexShrink: 0
                                        }}>
                                            {getTypeIcon(notification.type)}
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px'
                                            }}>
                                                <span style={{
                                                    color: COLORS.text,
                                                    fontWeight: notification.is_read ? '500' : '600',
                                                    fontSize: '13px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {notification.title}
                                                </span>
                                                <span style={{
                                                    color: COLORS.textMuted,
                                                    fontSize: '11px',
                                                    flexShrink: 0
                                                }}>
                                                    {formatDate(notification.created_at)}
                                                </span>
                                            </div>

                                            {/* Preview or full content */}
                                            <div style={{
                                                color: COLORS.textMuted,
                                                fontSize: '12px',
                                                marginTop: '4px',
                                                lineHeight: '1.4',
                                                overflow: isExpanded ? 'visible' : 'hidden',
                                                textOverflow: isExpanded ? 'unset' : 'ellipsis',
                                                whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap'
                                            }}>
                                                {notification.content}
                                            </div>

                                            {/* Expand indicator */}
                                            {notification.content.length > 80 && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    color: COLORS.accent,
                                                    fontSize: '11px',
                                                    marginTop: '6px'
                                                }}>
                                                    <ChevronDown
                                                        size={12}
                                                        style={{
                                                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                                                            transition: 'transform 0.2s'
                                                        }}
                                                    />
                                                    {isExpanded ? 'Show less' : 'Show more'}
                                                </div>
                                            )}
                                        </div>

                                        {/* Unread indicator */}
                                        {!notification.is_read && (
                                            <div style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: COLORS.accent,
                                                flexShrink: 0
                                            }} />
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
}

// ============================================
// Hook for notification state
// ============================================
export function useNotifications() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.count || 0);
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    }, []);

    useEffect(() => {
        fetchUnreadCount();
        // Poll every 60 seconds
        const interval = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    const refreshCount = () => {
        fetchUnreadCount();
    };

    return {
        unreadCount,
        isOpen,
        setIsOpen,
        refreshCount
    };
}

export default NotificationCenter;
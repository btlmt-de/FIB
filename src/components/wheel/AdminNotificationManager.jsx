// ============================================
// Admin Panel - Notification Management Section
// Add this component to your AdminPanel.jsx
// ============================================

import React, { useState, useEffect } from 'react';
import { COLORS, API_BASE_URL } from '../../config/constants.js';
import { Bell, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { getNotificationTypeIcon, getNotificationTypeColor } from '../../utils/notificationHelpers.jsx';

function NotificationManager() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'changelog',
        priority: 'normal'
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchNotifications();
    }, []);

    async function fetchNotifications() {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/notifications`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    }

    async function createNotification(e) {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`${API_BASE_URL}/admin/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setNotifications(prev => [data.notification, ...prev]);
                setFormData({ title: '', content: '', type: 'changelog', priority: 'normal' });
                setShowForm(false);
            } else {
                setError(data.error || 'Failed to create notification');
            }
        } catch (error) {
            setError('Failed to create notification');
        } finally {
            setSubmitting(false);
        }
    }

    async function deleteNotification(id) {
        if (!confirm('Are you sure you want to delete this notification?')) return;

        try {
            const res = await fetch(`${API_BASE_URL}/admin/notifications/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    }

    const getPriorityBadge = (priority) => {
        const colors = {
            low: COLORS.textMuted,
            normal: COLORS.accent,
            high: COLORS.red
        };
        return (
            <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: `${colors[priority]}20`,
                color: colors[priority],
                fontWeight: '600',
                textTransform: 'uppercase'
            }}>
                {priority}
            </span>
        );
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div style={{
            background: COLORS.bgLight,
            borderRadius: '12px',
            border: `1px solid ${COLORS.border}`,
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Bell size={18} color={COLORS.accent} />
                    <span style={{ color: COLORS.text, fontWeight: '600' }}>Notification Center</span>
                    <span style={{
                        fontSize: '12px',
                        color: COLORS.textMuted,
                        background: COLORS.bg,
                        padding: '2px 8px',
                        borderRadius: '10px'
                    }}>
                        {notifications.length} total
                    </span>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        background: showForm ? COLORS.bgLighter : COLORS.accent,
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                    }}
                >
                    <Plus size={14} />
                    {showForm ? 'Cancel' : 'New Notification'}
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <form onSubmit={createNotification} style={{
                    padding: '20px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    background: COLORS.bg
                }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>
                            Title *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g., New Feature: Lucky Spins!"
                            maxLength={100}
                            required
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: COLORS.bgLight,
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '6px',
                                color: COLORS.text,
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>
                            Content *
                        </label>
                        <textarea
                            value={formData.content}
                            onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                            placeholder="Describe the update, changes, or announcement..."
                            maxLength={2000}
                            required
                            rows={4}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: COLORS.bgLight,
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '6px',
                                color: COLORS.text,
                                fontSize: '14px',
                                outline: 'none',
                                resize: 'vertical',
                                boxSizing: 'border-box',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>
                                Type
                            </label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: COLORS.bgLight,
                                    border: `1px solid ${COLORS.border}`,
                                    borderRadius: '6px',
                                    color: COLORS.text,
                                    fontSize: '14px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="changelog">📋 Changelog</option>
                                <option value="announcement">📢 Announcement</option>
                                <option value="maintenance">🔧 Maintenance</option>
                            </select>
                        </div>

                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>
                                Priority
                            </label>
                            <select
                                value={formData.priority}
                                onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: COLORS.bgLight,
                                    border: `1px solid ${COLORS.border}`,
                                    borderRadius: '6px',
                                    color: COLORS.text,
                                    fontSize: '14px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High (shows badge)</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            padding: '10px 12px',
                            background: `${COLORS.red}20`,
                            border: `1px solid ${COLORS.red}`,
                            borderRadius: '6px',
                            color: COLORS.red,
                            fontSize: '13px',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <AlertTriangle size={14} />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || !formData.title || !formData.content}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: COLORS.accent,
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: submitting ? 'wait' : 'pointer',
                            opacity: submitting || !formData.title || !formData.content ? 0.5 : 1
                        }}
                    >
                        {submitting ? 'Publishing...' : 'Publish Notification'}
                    </button>
                </form>
            )}

            {/* Notifications List */}
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: COLORS.textMuted }}>
                        Loading...
                    </div>
                ) : notifications.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: COLORS.textMuted }}>
                        <Bell size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                        <div>No notifications yet</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                            Create one to notify all users
                        </div>
                    </div>
                ) : (
                    notifications.map(notification => {
                        const typeColor = getNotificationTypeColor(notification.type);

                        return (
                            <div
                                key={notification.id}
                                style={{
                                    padding: '14px 20px',
                                    borderBottom: `1px solid ${COLORS.border}`,
                                    display: 'flex',
                                    gap: '12px',
                                    alignItems: 'flex-start'
                                }}
                            >
                                {/* Type Icon */}
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: `${typeColor}20`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: typeColor,
                                    flexShrink: 0
                                }}>
                                    {getNotificationTypeIcon(notification.type)}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '4px'
                                    }}>
                                        <span style={{
                                            color: COLORS.text,
                                            fontWeight: '600',
                                            fontSize: '14px'
                                        }}>
                                            {notification.title}
                                        </span>
                                        {getPriorityBadge(notification.priority)}
                                    </div>
                                    <div style={{
                                        color: COLORS.textMuted,
                                        fontSize: '13px',
                                        lineHeight: '1.4',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word'
                                    }}>
                                        {notification.content.length > 150
                                            ? notification.content.substring(0, 150) + '...'
                                            : notification.content
                                        }
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        color: COLORS.textMuted,
                                        marginTop: '6px'
                                    }}>
                                        {formatDate(notification.created_at)}
                                    </div>
                                </div>

                                {/* Delete Button */}
                                <button
                                    onClick={() => deleteNotification(notification.id)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: COLORS.textMuted,
                                        cursor: 'pointer',
                                        padding: '6px',
                                        borderRadius: '4px',
                                        transition: 'color 0.2s, background 0.2s'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.color = COLORS.red;
                                        e.currentTarget.style.background = `${COLORS.red}20`;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.color = COLORS.textMuted;
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default NotificationManager;
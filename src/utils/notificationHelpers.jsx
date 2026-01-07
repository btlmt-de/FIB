// ============================================
// Notification Helpers - Shared utility for notification-related functions
// ============================================

import React from 'react';
import { Megaphone, Wrench, FileText } from 'lucide-react';
import { COLORS } from '../config/constants';

/**
 * Get the icon component for a notification type
 * @param {string} type - The notification type (announcement, maintenance, or default)
 * @param {number} size - Icon size in pixels (default 14)
 * @returns {React.ReactElement} The icon component
 */
export function getNotificationTypeIcon(type, size = 14) {
    switch (type) {
        case 'announcement': return <Megaphone size={size} />;
        case 'maintenance': return <Wrench size={size} />;
        default: return <FileText size={size} />;
    }
}

/**
 * Get the color associated with a notification type
 * @param {string} type - The notification type (announcement, maintenance, or default)
 * @returns {string} The color code for the notification type
 */
export function getNotificationTypeColor(type) {
    switch (type) {
        case 'announcement': return COLORS.gold;
        case 'maintenance': return COLORS.orange;
        default: return COLORS.accent;
    }
}
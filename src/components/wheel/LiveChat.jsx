import React, { useState, useEffect, useRef, useCallback } from 'react';
import { COLORS, API_BASE_URL } from '../../config/constants';
import { MessageCircle, Send, X, Minimize2, Maximize2, Trash2, Users, ChevronDown, Reply, AtSign, Move, RotateCcw } from 'lucide-react';

// ============================================
// Live Chat Component - With @Mentions
// ============================================
export function LiveChat({ user, isAdmin = false }) {
    // Check if user can chat (must have approved username OR be admin)
    const canChat = user && (isAdmin || user.usernameApproved || user.username_approved);
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);

    // Mention autocomplete state
    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionUsers, setMentionUsers] = useState([]);
    const [mentionIndex, setMentionIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(0);

    // Ping notification state
    const [hasPing, setHasPing] = useState(false);

    // Online users state
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [showOnlineList, setShowOnlineList] = useState(false);

    // Typing indicator state
    const [typingUsers, setTypingUsers] = useState([]); // Array of {userId, username}
    const typingTimeoutsRef = useRef(new Map()); // Per-user timeout tracking
    const lastTypingRef = useRef(0);

    // Position and size state for draggable/resizable
    const [position, setPosition] = useState(() => {
        const saved = localStorage.getItem('chat-position');
        return saved ? JSON.parse(saved) : { x: 20, y: null }; // y: null means use bottom positioning
    });
    const [size, setSize] = useState(() => {
        const saved = localStorage.getItem('chat-size');
        return saved ? JSON.parse(saved) : { width: 380, height: 520 };
    });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
    const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const lastMessageIdRef = useRef(0);
    const pollIntervalRef = useRef(null);
    const inputRef = useRef(null);
    const lastActivityRef = useRef(Date.now());

    // Refs to track visibility state for use in callbacks (avoids stale closures)
    const isOpenRef = useRef(isOpen);
    const isMinimizedRef = useRef(isMinimized);

    // Keep refs in sync with state
    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        isMinimizedRef.current = isMinimized;
    }, [isMinimized]);

    // Adaptive polling: fast when active, slower when idle
    const FAST_POLL_INTERVAL = 500;   // 500ms when actively chatting
    const SLOW_POLL_INTERVAL = 3000;  // 3s when idle/minimized
    const ACTIVITY_TIMEOUT = 10000;   // Consider idle after 10s of no activity

    // Track user activity
    const trackActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
    }, []);

    // Get current poll interval based on state (uses refs for current values)
    const getPollInterval = useCallback(() => {
        const isIdle = Date.now() - lastActivityRef.current > ACTIVITY_TIMEOUT;
        if (!isOpenRef.current || isMinimizedRef.current || isIdle) {
            return SLOW_POLL_INTERVAL;
        }
        return FAST_POLL_INTERVAL;
    }, []);

    // Save position and size to localStorage
    useEffect(() => {
        if (position.x !== 20 || position.y !== null) {
            localStorage.setItem('chat-position', JSON.stringify(position));
        }
    }, [position]);

    useEffect(() => {
        if (size.width !== 380 || size.height !== 520) {
            localStorage.setItem('chat-size', JSON.stringify(size));
        }
    }, [size]);

    // Drag handlers
    const handleDragStart = useCallback((e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) return;
        e.preventDefault();
        setIsDragging(true);

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Calculate current top position
        const currentY = position.y !== null ? position.y : window.innerHeight - 20 - size.height;

        dragStartRef.current = {
            x: clientX,
            y: clientY,
            posX: position.x,
            posY: currentY
        };
    }, [position, size.height]);

    const handleDragMove = useCallback((e) => {
        if (!isDragging) return;
        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - dragStartRef.current.x;
        const deltaY = clientY - dragStartRef.current.y;

        const newX = Math.max(0, Math.min(window.innerWidth - size.width, dragStartRef.current.posX + deltaX));
        const newY = Math.max(0, Math.min(window.innerHeight - size.height, dragStartRef.current.posY + deltaY));

        setPosition({ x: newX, y: newY });
    }, [isDragging, size.width, size.height]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Resize handlers
    const handleResizeStart = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        resizeStartRef.current = {
            x: clientX,
            y: clientY,
            width: size.width,
            height: size.height
        };
    }, [size]);

    const handleResizeMove = useCallback((e) => {
        if (!isResizing) return;
        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - resizeStartRef.current.x;
        const deltaY = resizeStartRef.current.y - clientY; // Inverted because resizing from top-right

        const newWidth = Math.max(300, Math.min(600, resizeStartRef.current.width + deltaX));
        const newHeight = Math.max(400, Math.min(800, resizeStartRef.current.height + deltaY));

        setSize({ width: newWidth, height: newHeight });
    }, [isResizing]);

    const handleResizeEnd = useCallback(() => {
        setIsResizing(false);
    }, []);

    // Global mouse/touch event listeners for drag and resize
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDragMove, { passive: false });
            window.addEventListener('touchend', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleResizeMove);
            window.addEventListener('mouseup', handleResizeEnd);
            window.addEventListener('touchmove', handleResizeMove, { passive: false });
            window.addEventListener('touchend', handleResizeEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleResizeMove);
            window.removeEventListener('mouseup', handleResizeEnd);
            window.removeEventListener('touchmove', handleResizeMove);
            window.removeEventListener('touchend', handleResizeEnd);
        };
    }, [isResizing, handleResizeMove, handleResizeEnd]);

    // Reset position function
    const resetPosition = useCallback(() => {
        setPosition({ x: 20, y: null });
        setSize({ width: 380, height: 520 });
        localStorage.removeItem('chat-position');
        localStorage.removeItem('chat-size');
    }, []);

    // Helper to find the message being replied to by reply_to_id
    const findRepliedMessage = useCallback((msg) => {
        // Only show reply if explicitly set via reply_to_id
        if (!msg.reply_to_id) return null;

        return messages.find(m => m.id === msg.reply_to_id) || null;
    }, [messages]);

    // Scroll to a specific message
    const scrollToMessage = useCallback((messageId) => {
        const element = document.getElementById(`chat-msg-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight briefly
            element.style.background = 'rgba(88, 101, 242, 0.2)';
            setTimeout(() => {
                element.style.background = '';
            }, 1500);
        }
    }, []);

    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    };

    const handleScroll = () => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setShowScrollButton(!isNearBottom);
        }
    };

    // Escape special regex characters in a string
    const escapeRegExp = (string) => {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    };

    // Image URL pattern - matches common image hosts and direct image links
    const imageUrlPattern = /https?:\/\/[^\s<>"']+?\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s<>"']*)?/gi;
    const imageHostPattern = /https?:\/\/(?:i\.imgur\.com|imgur\.com\/[a-zA-Z0-9]+|cdn\.discordapp\.com|media\.discordapp\.net|pbs\.twimg\.com|tenor\.com\/view|media\.tenor\.com|i\.redd\.it|preview\.redd\.it)[^\s<>"']*/gi;

    // Extract image URLs from message
    const extractImageUrls = (message) => {
        const urls = new Set();

        // Match direct image links
        const directMatches = message.match(imageUrlPattern) || [];
        directMatches.forEach(url => urls.add(url));

        // Match image host URLs
        const hostMatches = message.match(imageHostPattern) || [];
        hostMatches.forEach(url => urls.add(url));

        return Array.from(urls);
    };

    // Remove image URLs from message text for cleaner display
    const removeImageUrls = (message) => {
        let cleaned = message
            .replace(imageUrlPattern, '')
            .replace(imageHostPattern, '')
            .trim();
        return cleaned;
    };

    // Check if current user is mentioned in a message
    const isUserMentioned = (message) => {
        if (!user) return false;
        const username = user.customUsername || user.discordUsername;
        if (!username) return false;
        const escapedUsername = escapeRegExp(username);
        const mentionPattern = new RegExp(`@${escapedUsername}\\b`, 'i');
        return mentionPattern.test(message);
    };

    const fetchMessages = useCallback(async (since = null) => {
        try {
            const url = since
                ? `${API_BASE_URL}/api/chat/messages?since=${since}`
                : `${API_BASE_URL}/api/chat/messages`;

            const res = await fetch(url, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();

                if (since && data.messages.length > 0) {
                    // Deduplicate: filter out messages that already exist locally
                    // This prevents the double-message bug when sending + polling race
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const newMsgs = data.messages.filter(m => !existingIds.has(m.id));
                        if (newMsgs.length === 0) return prev; // No change needed

                        // Handle unread count for truly new messages only
                        // Use refs to get current visibility state (avoids stale closures)
                        if ((!isOpenRef.current || isMinimizedRef.current) && newMsgs.length > 0) {
                            setUnreadCount(c => c + newMsgs.length);
                            setHasNewMessage(true);
                            // Check for pings in new messages
                            const hasMention = newMsgs.some(msg =>
                                msg.user_id !== user?.id && isUserMentioned(msg.message)
                            );
                            if (hasMention) {
                                setHasPing(true);
                            }
                        }

                        return [...prev, ...newMsgs];
                    });
                } else if (!since) {
                    setMessages(data.messages || []);
                }

                if (data.messages.length > 0) {
                    const maxId = Math.max(...data.messages.map(m => m.id));
                    lastMessageIdRef.current = maxId;
                }
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    }, [user]);

    // Fetch users for mention autocomplete
    const fetchMentionUsers = async (search) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/users?search=${encodeURIComponent(search)}`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setMentionUsers(data.users || []);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    useEffect(() => {
        if (user) {
            // Initial fetch
            fetchMessages();

            // Fetch online users
            const fetchOnlineUsers = async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/online`, { credentials: 'include' });
                    if (res.ok) {
                        const data = await res.json();
                        setOnlineUsers(data.users || []);
                    }
                } catch (e) {
                    console.error('Failed to fetch online users:', e);
                }
            };
            fetchOnlineUsers();

            // Send heartbeat to keep user marked as online
            const sendHeartbeat = async () => {
                try {
                    await fetch(`${API_BASE_URL}/api/heartbeat`, {
                        method: 'POST',
                        credentials: 'include'
                    });
                } catch (e) {
                    // Ignore heartbeat errors
                }
            };
            sendHeartbeat();

            // Periodic heartbeat (every 60 seconds) and online refresh (every 30 seconds)
            const heartbeatInterval = setInterval(sendHeartbeat, 60000);
            const onlineRefreshInterval = setInterval(fetchOnlineUsers, 30000);

            // Listen for SSE chat messages (real-time)
            const handleSSEMessage = (event) => {
                const newMessage = event.detail;
                if (newMessage && newMessage.id) {
                    setMessages(prev => {
                        // Avoid duplicates (might already have it from own send)
                        if (prev.some(m => m.id === newMessage.id)) return prev;

                        // Update lastMessageIdRef
                        if (newMessage.id > lastMessageIdRef.current) {
                            lastMessageIdRef.current = newMessage.id;
                        }

                        // Track if it was for us (ping) - check for @mention of current user
                        const currentUsername = user.custom_username || user.customUsername || user.discord_username;
                        if (currentUsername && newMessage.message) {
                            const mentionPattern = new RegExp(`@${currentUsername}\\b`, 'i');
                            if (mentionPattern.test(newMessage.message) && newMessage.user_id !== user.id) {
                                if (!isOpenRef.current || isMinimizedRef.current) {
                                    setHasPing(true);
                                }
                            }
                        }

                        // Update unread count if chat is closed/minimized
                        if (!isOpenRef.current || isMinimizedRef.current) {
                            setUnreadCount(c => c + 1);
                            setHasNewMessage(true);
                        }

                        return [...prev, newMessage];
                    });
                }
            };

            // Listen for online count updates
            const handleOnlineCount = (event) => {
                const data = event.detail;
                if (data && data.userIds) {
                    // Refetch user details when count changes
                    fetchOnlineUsers();
                }
            };

            // Listen for typing indicators
            const handleTyping = (event) => {
                const { userId, username, isTyping } = event.detail;
                // Don't show own typing
                if (userId === user.id) return;

                // Clear any existing timeout for this user
                const existingTimeout = typingTimeoutsRef.current.get(userId);
                if (existingTimeout) {
                    clearTimeout(existingTimeout);
                    typingTimeoutsRef.current.delete(userId);
                }

                if (isTyping) {
                    // Add user if not already in list
                    setTypingUsers(prev => {
                        if (!prev.some(u => u.userId === userId)) {
                            return [...prev, { userId, username }];
                        }
                        return prev;
                    });

                    // Set auto-remove timeout after 3 seconds
                    const timeoutId = setTimeout(() => {
                        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
                        typingTimeoutsRef.current.delete(userId);
                    }, 3000);
                    typingTimeoutsRef.current.set(userId, timeoutId);
                } else {
                    // Remove user from list
                    setTypingUsers(prev => prev.filter(u => u.userId !== userId));
                }
            };

            window.addEventListener('sse-chat-message', handleSSEMessage);
            window.addEventListener('sse-online-count', handleOnlineCount);
            window.addEventListener('sse-chat-typing', handleTyping);

            // Sync when tab becomes visible (in case SSE missed messages while hidden)
            const handleVisibilityChange = () => {
                if (!document.hidden) {
                    fetchMessages(lastMessageIdRef.current || undefined);
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);

            return () => {
                window.removeEventListener('sse-chat-message', handleSSEMessage);
                window.removeEventListener('sse-online-count', handleOnlineCount);
                window.removeEventListener('sse-chat-typing', handleTyping);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                clearInterval(heartbeatInterval);
                clearInterval(onlineRefreshInterval);
                // Clear all typing timeouts
                typingTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
                typingTimeoutsRef.current.clear();
            };
        }
    }, [user, fetchMessages]);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            scrollToBottom(false);
        }
    }, [messages.length, isOpen, isMinimized]);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            setUnreadCount(0);
            setHasNewMessage(false);
            setHasPing(false);
        }
    }, [isOpen, isMinimized]);

    // Handle mention search - fetch even with empty string (shows all users when just @)
    useEffect(() => {
        if (showMentionList) {
            fetchMentionUsers(mentionSearch);
        } else {
            setMentionUsers([]);
        }
    }, [mentionSearch, showMentionList]);

    // Send typing indicator (debounced)
    const sendTypingIndicator = useCallback(async () => {
        const now = Date.now();
        // Only send every 2 seconds max
        if (now - lastTypingRef.current < 2000) return;
        lastTypingRef.current = now;

        try {
            await fetch(`${API_BASE_URL}/api/chat/typing`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            // Ignore errors for typing indicator
        }
    }, []);

    const handleInputChange = (e) => {
        trackActivity(); // Track user activity for adaptive polling
        const value = e.target.value;
        const curPos = e.target.selectionStart;
        setInputValue(value);
        setCursorPosition(curPos);

        // Send typing indicator if there's content
        if (value.trim().length > 0) {
            sendTypingIndicator();
        }

        // Check for @ mention trigger
        const textBeforeCursor = value.slice(0, curPos);
        const atMatch = textBeforeCursor.match(/@(\w*)$/);

        if (atMatch) {
            setShowMentionList(true);
            setMentionSearch(atMatch[1]);
            setMentionIndex(0);
        } else {
            setShowMentionList(false);
            setMentionSearch('');
        }
    };

    const handleKeyDown = (e) => {
        if (showMentionList && mentionUsers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex(prev => (prev + 1) % mentionUsers.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex(prev => (prev - 1 + mentionUsers.length) % mentionUsers.length);
            } else if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault();
                selectMention(mentionUsers[mentionIndex]);
            } else if (e.key === 'Escape') {
                setShowMentionList(false);
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const selectMention = (mentionUser) => {
        const textBeforeCursor = inputValue.slice(0, cursorPosition);
        const textAfterCursor = inputValue.slice(cursorPosition);
        const beforeAt = textBeforeCursor.replace(/@\w*$/, '');
        const username = mentionUser.custom_username || mentionUser.discord_username;

        const space = textAfterCursor.startsWith(' ') ? '' : ' ';
        const newValue = `${beforeAt}@${username}${space}${textAfterCursor}`;
        setInputValue(newValue);
        setShowMentionList(false);
        setMentionSearch('');

        // Focus back on input
        setTimeout(() => {
            inputRef.current?.focus();
            const newPos = beforeAt.length + username.length + 2;
            inputRef.current?.setSelectionRange(newPos, newPos);
        }, 0);
    };

    // Slash command handlers
    const slashCommands = {
        shrug: () => 'Â¯\\_(ãƒ„)_/Â¯',
        tableflip: () => '(â•¯Â°â–¡Â°)â•¯ï¸µ â”»â”â”»',
        unflip: () => 'â”¬â”€â”¬ãƒŽ( Âº _ ÂºãƒŽ)',
        lenny: () => '( Í¡Â° ÍœÊ– Í¡Â°)',
        disapprove: () => 'à² _à² ',
        sparkles: () => 'âœ¨',
        help: () => null, // Special handling below
    };

    const handleSlashCommand = (input) => {
        const trimmed = input.trim();
        if (!trimmed.startsWith('/')) return null;

        const parts = trimmed.slice(1).split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');

        // Text replacement commands
        if (slashCommands[command] && command !== 'help') {
            const replacement = slashCommands[command]();
            return { type: 'replace', text: replacement };
        }

        // Help command - show available commands
        if (command === 'help') {
            return {
                type: 'local',
                content: (
                    <div style={{ padding: '12px', background: 'rgba(88, 101, 242, 0.1)', borderRadius: '8px', fontSize: '12px' }}>
                        <div style={{ color: '#8B5CF6', fontWeight: '600', marginBottom: '8px' }}>ðŸ“ Available Commands</div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                            <div><code style={{ color: '#5865F2' }}>/shrug</code> â€” Â¯\_(ãƒ„)_/Â¯</div>
                            <div><code style={{ color: '#5865F2' }}>/tableflip</code> â€” (â•¯Â°â–¡Â°)â•¯ï¸µ â”»â”â”»</div>
                            <div><code style={{ color: '#5865F2' }}>/unflip</code> â€” â”¬â”€â”¬ãƒŽ( Âº _ ÂºãƒŽ)</div>
                            <div><code style={{ color: '#5865F2' }}>/lenny</code> â€” ( Í¡Â° ÍœÊ– Í¡Â°)</div>
                            <div><code style={{ color: '#5865F2' }}>/disapprove</code> â€” à² _à² </div>
                            <div><code style={{ color: '#5865F2' }}>/sparkles</code> â€” âœ¨</div>
                            <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                                Tip: Share images by pasting imgur/discord CDN links!
                            </div>
                        </div>
                    </div>
                )
            };
        }

        return null;
    };

    const sendMessage = async () => {
        if (!inputValue.trim() || sending) return;

        // Check for slash commands first
        const commandResult = handleSlashCommand(inputValue);
        if (commandResult) {
            if (commandResult.type === 'replace') {
                // Replace command with text and send normally
                setInputValue(commandResult.text);
                // Continue to send below, but with the replaced text
            } else if (commandResult.type === 'local') {
                // Show local message (only visible to this user)
                setMessages(prev => [...prev, {
                    id: `local-${Date.now()}`,
                    user_id: 'system',
                    message: '',
                    custom_username: 'System',
                    discord_username: 'System',
                    created_at: new Date().toISOString(),
                    _localContent: commandResult.content
                }]);
                setInputValue('');
                scrollToBottom();
                return;
            }
        }

        trackActivity(); // Keep fast polling active when sending
        setSending(true);
        setError('');
        setShowMentionList(false);

        // Use replaced text if command was executed
        const finalInput = commandResult?.type === 'replace' ? commandResult.text : inputValue.trim();

        const messageText = replyingTo
            ? `@${replyingTo.name} ${finalInput}`
            : finalInput;

        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    message: messageText,
                    reply_to_id: replyingTo?.id || null
                })
            });

            const data = await res.json();

            if (res.ok) {
                setInputValue('');
                setReplyingTo(null);
                // Don't add message locally - SSE will broadcast it back
                // This prevents duplicate messages
                lastMessageIdRef.current = data.message.id;
            } else {
                setError(data.error || 'Failed to send message');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setError('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const deleteMessage = async (messageId) => {
        if (!isAdmin) return;

        try {
            const res = await fetch(`${API_BASE_URL}/admin/chat/messages/${messageId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                setMessages(prev => prev.filter(m => m.id !== messageId));
            }
        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    };

    // Parse server timestamp as UTC (SQLite stores UTC via CURRENT_TIMESTAMP)
    const parseServerDate = (dateStr) => {
        if (!dateStr) return new Date();
        // If already has timezone info, parse directly
        if (dateStr.includes('Z') || dateStr.includes('+') || dateStr.includes('T')) {
            return new Date(dateStr);
        }
        // SQLite format "YYYY-MM-DD HH:MM:SS" - interpret as UTC
        return new Date(dateStr.replace(' ', 'T') + 'Z');
    };

    const formatTime = (dateStr) => {
        const date = parseServerDate(dateStr);
        // toLocaleTimeString uses the user's local timezone automatically
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr) => {
        const date = parseServerDate(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Compare dates in local timezone
        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const getAvatarUrl = (discordId, avatar) => {
        if (avatar) {
            return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png`;
        }
        return 'https://cdn.discordapp.com/embed/avatars/0.png';
    };

    const shouldShowHeader = (msg, index) => {
        if (index === 0) return true;
        const prevMsg = messages[index - 1];
        if (prevMsg.user_id !== msg.user_id) return true;
        const timeDiff = parseServerDate(msg.created_at) - parseServerDate(prevMsg.created_at);
        return timeDiff > 5 * 60 * 1000;
    };

    const shouldShowDateSeparator = (msg, index) => {
        if (index === 0) return true;
        const prevMsg = messages[index - 1];
        const prevDate = parseServerDate(prevMsg.created_at).toDateString();
        const currDate = parseServerDate(msg.created_at).toDateString();
        return prevDate !== currDate;
    };

    const handleReply = (msg) => {
        trackActivity(); // Track user activity for adaptive polling
        const name = msg.custom_username || msg.discord_username || 'User';
        setReplyingTo({ id: msg.id, name, message: msg.message });
        inputRef.current?.focus();
    };

    // Decode HTML entities (messages are stored encoded for security)
    const decodeHtmlEntities = (text) => {
        if (!text) return '';
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    };

    // Render message with highlighted mentions and embedded images
    const renderMessageText = (text, msgUserId) => {
        const decoded = decodeHtmlEntities(text);

        // Extract image URLs
        const imageUrls = extractImageUrls(decoded);
        // Remove image URLs from text for cleaner display
        const cleanedText = imageUrls.length > 0 ? removeImageUrls(decoded) : decoded;

        // Render text with highlighted mentions
        const parts = cleanedText.split(/(@\w+)/g);
        const textContent = parts.map((part, i) => {
            if (part.startsWith('@')) {
                const username = part.slice(1);
                const isCurrentUser = user && (
                    username.toLowerCase() === (user.customUsername || '').toLowerCase() ||
                    username.toLowerCase() === (user.discordUsername || '').toLowerCase()
                );
                return (
                    <span
                        key={i}
                        style={{
                            color: isCurrentUser ? '#fff' : '#8B5CF6',
                            background: isCurrentUser ? 'rgba(139, 92, 246, 0.5)' : 'rgba(139, 92, 246, 0.15)',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            fontWeight: isCurrentUser ? '600' : '500'
                        }}
                    >
                        {part}
                    </span>
                );
            }
            return part;
        });

        // If there are images, render text + images
        if (imageUrls.length > 0) {
            return (
                <>
                    {cleanedText.trim() && <div>{textContent}</div>}
                    <div style={{ marginTop: cleanedText.trim() ? '8px' : '0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {imageUrls.map((url, i) => (
                            <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'block' }}
                            >
                                <img
                                    src={url}
                                    alt="Shared image"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    decoding
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '200px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        background: 'rgba(0,0,0,0.2)'
                                    }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            </a>
                        ))}
                    </div>
                </>
            );
        }

        return textContent;
    };

    if (!user) return null;

    const charCount = inputValue.length;
    const showCharCount = charCount > 400;

    return (
        <>
            <style>{`
                @keyframes chatGlow {
                    0%, 100% { box-shadow: 0 4px 20px rgba(88, 101, 242, 0.4), 0 0 25px rgba(138, 43, 226, 0.25); }
                    50% { box-shadow: 0 4px 30px rgba(88, 101, 242, 0.6), 0 0 40px rgba(138, 43, 226, 0.4); }
                }
                @keyframes pingGlow {
                    0%, 100% { box-shadow: 0 4px 20px rgba(237, 66, 69, 0.4), 0 0 25px rgba(237, 66, 69, 0.3); }
                    50% { box-shadow: 0 4px 30px rgba(237, 66, 69, 0.6), 0 0 40px rgba(237, 66, 69, 0.5); }
                }
                @keyframes chatSlideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes msgSlideIn {
                    from { opacity: 0; transform: translateX(-10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @keyframes pingPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                @keyframes typingBounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-4px); }
                }
                .chat-msg-row { transition: background 0.15s; }
                .chat-msg-row:hover { background: rgba(255,255,255,0.02); }
                .chat-msg-row:hover .msg-actions { opacity: 1; }
                .chat-msg-row:hover .msg-time { opacity: 1; }
                .chat-msg-row.mentioned { background: rgba(139, 92, 246, 0.08); border-left-color: #8B5CF6 !important; }
                .chat-scrollbar::-webkit-scrollbar { width: 6px; }
                .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .chat-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
                .chat-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                .mention-item { transition: background 0.1s; }
                .mention-item:hover, .mention-item.selected { background: rgba(88, 101, 242, 0.2); }
            `}</style>

            {/* Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => { trackActivity(); setIsOpen(true); }}
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        left: '20px',
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        background: hasPing
                            ? 'linear-gradient(135deg, #ED4245, #FF6B6B)'
                            : 'linear-gradient(135deg, #5865F2, #8B5CF6)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: (hasNewMessage || hasPing)
                            ? undefined
                            : '0 4px 15px rgba(88, 101, 242, 0.3)',
                        animation: hasPing
                            ? 'pingGlow 1s ease-in-out infinite, pingPulse 1s ease-in-out infinite'
                            : hasNewMessage
                                ? 'chatGlow 2s ease-in-out infinite'
                                : 'none',
                        transition: 'transform 0.2s',
                        zIndex: 900
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {hasPing ? <AtSign size={22} color="#fff" /> : <MessageCircle size={22} color="#fff" />}
                    {unreadCount > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '-2px',
                            left: '-2px',
                            background: hasPing ? '#fff' : '#ED4245',
                            color: hasPing ? '#ED4245' : '#fff',
                            fontSize: '10px',
                            fontWeight: '700',
                            borderRadius: '50%',
                            minWidth: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid #1a1a2e'
                        }}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    ...(position.y !== null
                            ? { top: `${position.y}px`, left: `${position.x}px` }
                            : { bottom: '20px', left: `${position.x}px` }
                    ),
                    width: `${size.width}px`,
                    height: isMinimized ? 'auto' : `${size.height}px`,
                    background: '#12121a',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isDragging ? '0 12px 48px rgba(0,0,0,0.7)' : '0 8px 32px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    zIndex: 950,
                    animation: isDragging ? 'none' : 'chatSlideUp 0.25s ease-out',
                    transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s'
                }}>
                    {/* Resize handle (top-right corner) */}
                    {!isMinimized && (
                        <div
                            onMouseDown={handleResizeStart}
                            onTouchStart={handleResizeStart}
                            style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                width: '20px',
                                height: '20px',
                                cursor: 'ne-resize',
                                zIndex: 10
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                width: '8px',
                                height: '8px',
                                borderTop: '2px solid rgba(255,255,255,0.3)',
                                borderRight: '2px solid rgba(255,255,255,0.3)',
                                borderRadius: '0 4px 0 0'
                            }} />
                        </div>
                    )}

                    {/* Header - Draggable */}
                    <div
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(88, 101, 242, 0.05)',
                            cursor: isDragging ? 'grabbing' : 'grab',
                            userSelect: 'none'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #5865F2, #8B5CF6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <MessageCircle size={16} color="#fff" />
                            </div>
                            <div>
                                <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Live Chat
                                    <div style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: '#22c55e',
                                        animation: 'pulse 2s infinite'
                                    }} />
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                                    {messages.length} messages â€¢ Drag to move
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                            {/* Online users button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowOnlineList(!showOnlineList); }}
                                title={`${onlineUsers.length} online`}
                                style={{
                                    background: showOnlineList ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                                    border: 'none',
                                    color: showOnlineList ? '#22c55e' : 'rgba(255,255,255,0.5)',
                                    cursor: 'pointer',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    marginRight: '4px'
                                }}
                                onMouseEnter={e => { if (!showOnlineList) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#22c55e'; }}}
                                onMouseLeave={e => { if (!showOnlineList) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}}
                            >
                                <Users size={14} />
                                <span>{onlineUsers.length}</span>
                            </button>
                            {/* Reset position button - only show if moved */}
                            {(position.x !== 20 || position.y !== null || size.width !== 380 || size.height !== 520) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); resetPosition(); }}
                                    title="Reset position & size"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'rgba(255,255,255,0.4)',
                                        cursor: 'pointer',
                                        padding: '8px',
                                        borderRadius: '6px',
                                        display: 'flex'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                                >
                                    <RotateCcw size={14} />
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); if (isMinimized) trackActivity(); setIsMinimized(!isMinimized); }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    display: 'flex'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                            >
                                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    display: 'flex'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Online Users List */}
                            {showOnlineList ? (
                                <div
                                    className="chat-scrollbar"
                                    style={{
                                        flex: 1,
                                        overflow: 'auto',
                                        background: '#0e0e15',
                                        padding: '12px'
                                    }}
                                >
                                    <div style={{
                                        color: 'rgba(255,255,255,0.5)',
                                        fontSize: '11px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        marginBottom: '12px',
                                        fontWeight: '600'
                                    }}>
                                        {onlineUsers.length} Online
                                    </div>
                                    {onlineUsers.length === 0 ? (
                                        <div style={{
                                            textAlign: 'center',
                                            color: 'rgba(255,255,255,0.3)',
                                            padding: '40px 20px',
                                            fontSize: '13px'
                                        }}>
                                            No users online
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {onlineUsers.map(onlineUser => (
                                                <div
                                                    key={onlineUser.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        padding: '8px 10px',
                                                        borderRadius: '8px',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.15s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                    onClick={() => {
                                                        // Insert @mention into input
                                                        const mention = `@${onlineUser.username} `;
                                                        setInputValue(prev => prev + mention);
                                                        setShowOnlineList(false);
                                                        inputRef.current?.focus();
                                                    }}
                                                >
                                                    <div style={{ position: 'relative' }}>
                                                        <img
                                                            src={onlineUser.avatar
                                                                ? `https://cdn.discordapp.com/avatars/${onlineUser.discord_id}/${onlineUser.avatar}.png?size=32`
                                                                : `https://cdn.discordapp.com/embed/avatars/${parseInt(onlineUser.discord_id || '0') % 5}.png`
                                                            }
                                                            alt=""
                                                            style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '50%',
                                                                background: '#1a1a2e'
                                                            }}
                                                        />
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: '-1px',
                                                            right: '-1px',
                                                            width: '10px',
                                                            height: '10px',
                                                            borderRadius: '50%',
                                                            background: '#22c55e',
                                                            border: '2px solid #0e0e15'
                                                        }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            color: '#fff',
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {onlineUser.username}
                                                        </div>
                                                    </div>
                                                    <AtSign size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Messages */
                                <div
                                    ref={messagesContainerRef}
                                    onScroll={handleScroll}
                                    className="chat-scrollbar"
                                    style={{
                                        flex: 1,
                                        overflow: 'auto',
                                        background: '#0e0e15',
                                        position: 'relative'
                                    }}
                                >
                                    {messages.length === 0 ? (
                                        <div style={{
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'rgba(255,255,255,0.3)',
                                            gap: '12px',
                                            padding: '40px'
                                        }}>
                                            <div style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '50%',
                                                background: 'rgba(88, 101, 242, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <MessageCircle size={28} color="#5865F2" />
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>No messages yet</div>
                                                <div style={{ fontSize: '12px' }}>Be the first to say hello!</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '8px 0' }}>
                                            {messages.map((msg, index) => {
                                                const isOwnMessage = msg.user_id === user.id;
                                                const displayName = msg.custom_username || msg.discord_username || 'User';
                                                const showHeader = shouldShowHeader(msg, index);
                                                const showDate = shouldShowDateSeparator(msg, index);
                                                const isMentioned = !isOwnMessage && isUserMentioned(msg.message);

                                                // Check if this is an explicit reply (has reply_to_id)
                                                const repliedMessage = findRepliedMessage(msg);
                                                const isReply = repliedMessage !== null;

                                                return (
                                                    <React.Fragment key={msg.id}>
                                                        {/* Date separator */}
                                                        {showDate && (
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: '16px 0 8px',
                                                                gap: '12px'
                                                            }}>
                                                                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                                                                <span style={{
                                                                    color: 'rgba(255,255,255,0.3)',
                                                                    fontSize: '11px',
                                                                    fontWeight: '500',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.5px'
                                                                }}>
                                                                {formatDate(msg.created_at)}
                                                            </span>
                                                                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                                                            </div>
                                                        )}

                                                        {/* Reply preview - Discord style */}
                                                        {isReply && (
                                                            <div
                                                                onClick={() => scrollToMessage(repliedMessage.id)}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    padding: '4px 16px 4px 60px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '12px',
                                                                    color: 'rgba(255,255,255,0.4)'
                                                                }}
                                                            >
                                                                <div style={{
                                                                    width: '2px',
                                                                    height: '12px',
                                                                    background: '#5865F2',
                                                                    borderRadius: '1px'
                                                                }} />
                                                                <Reply size={12} style={{ opacity: 0.6 }} />
                                                                <img
                                                                    src={getAvatarUrl(repliedMessage.discord_id, repliedMessage.discord_avatar)}
                                                                    alt=""
                                                                    style={{
                                                                        width: '14px',
                                                                        height: '14px',
                                                                        borderRadius: '50%'
                                                                    }}
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                                                    }}
                                                                />
                                                                <span style={{ color: '#8B5CF6', fontWeight: '500' }}>
                                                                {repliedMessage.custom_username || repliedMessage.discord_username}
                                                            </span>
                                                                <span style={{
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    maxWidth: '200px'
                                                                }}>
                                                                {decodeHtmlEntities(repliedMessage.message)}
                                                            </span>
                                                            </div>
                                                        )}

                                                        <div
                                                            id={`chat-msg-${msg.id}`}
                                                            className={`chat-msg-row ${isMentioned ? 'mentioned' : ''}`}
                                                            style={{
                                                                padding: showHeader ? '8px 16px 4px' : '2px 16px 2px 60px',
                                                                borderLeft: isMentioned
                                                                    ? '2px solid #8B5CF6'
                                                                    : isOwnMessage
                                                                        ? '2px solid rgba(139, 92, 246, 0.4)'
                                                                        : '2px solid transparent',
                                                                animation: index === messages.length - 1 ? 'msgSlideIn 0.2s ease-out' : 'none',
                                                                transition: 'background 0.3s ease'
                                                            }}
                                                        >
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                gap: '12px'
                                                            }}>
                                                                {/* Avatar */}
                                                                {showHeader ? (
                                                                    <img
                                                                        src={getAvatarUrl(msg.discord_id, msg.discord_avatar)}
                                                                        alt=""
                                                                        style={{
                                                                            width: '32px',
                                                                            height: '32px',
                                                                            borderRadius: '50%',
                                                                            flexShrink: 0
                                                                        }}
                                                                        onError={(e) => {
                                                                            e.target.onerror = null;
                                                                            e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                                                        }}
                                                                    />
                                                                ) : null}

                                                                {/* Content */}
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    {showHeader && (
                                                                        <div style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '8px',
                                                                            marginBottom: '2px'
                                                                        }}>
                                                                        <span style={{
                                                                            color: isOwnMessage ? '#8B5CF6' : '#fff',
                                                                            fontSize: '13px',
                                                                            fontWeight: '600'
                                                                        }}>
                                                                            {isOwnMessage ? 'You' : displayName}
                                                                        </span>
                                                                            <span style={{
                                                                                color: 'rgba(255,255,255,0.25)',
                                                                                fontSize: '11px'
                                                                            }}>
                                                                            {formatTime(msg.created_at)}
                                                                        </span>
                                                                        </div>
                                                                    )}

                                                                    <div style={{
                                                                        display: 'flex',
                                                                        alignItems: 'flex-start',
                                                                        gap: '8px'
                                                                    }}>
                                                                        <div style={{
                                                                            color: 'rgba(255,255,255,0.85)',
                                                                            fontSize: '13px',
                                                                            lineHeight: '1.45',
                                                                            wordBreak: 'break-word',
                                                                            flex: 1
                                                                        }}>
                                                                            {msg._localContent || renderMessageText(msg.message, msg.user_id)}
                                                                        </div>

                                                                        {!showHeader && (
                                                                            <span className="msg-time" style={{
                                                                                color: 'rgba(255,255,255,0.2)',
                                                                                fontSize: '10px',
                                                                                opacity: 0,
                                                                                transition: 'opacity 0.15s',
                                                                                flexShrink: 0
                                                                            }}>
                                                                            {formatTime(msg.created_at)}
                                                                        </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Actions - always visible */}
                                                                <div className="msg-actions" style={{
                                                                    display: 'flex',
                                                                    gap: '2px',
                                                                    opacity: 0.5,
                                                                    transition: 'opacity 0.15s'
                                                                }}>
                                                                    {!isOwnMessage && (
                                                                        <button
                                                                            onClick={() => handleReply(msg)}
                                                                            style={{
                                                                                background: 'transparent',
                                                                                border: 'none',
                                                                                color: 'rgba(255,255,255,0.3)',
                                                                                cursor: 'pointer',
                                                                                padding: '4px',
                                                                                borderRadius: '4px'
                                                                            }}
                                                                            onMouseEnter={e => { e.currentTarget.style.color = '#5865F2'; e.currentTarget.style.background = 'rgba(88,101,242,0.1)'; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent'; }}
                                                                            title="Reply"
                                                                        >
                                                                            <Reply size={14} />
                                                                        </button>
                                                                    )}
                                                                    {isAdmin && (
                                                                        <button
                                                                            onClick={() => deleteMessage(msg.id)}
                                                                            style={{
                                                                                background: 'transparent',
                                                                                border: 'none',
                                                                                color: 'rgba(255,255,255,0.3)',
                                                                                cursor: 'pointer',
                                                                                padding: '4px',
                                                                                borderRadius: '4px'
                                                                            }}
                                                                            onMouseEnter={e => { e.currentTarget.style.color = '#ED4245'; e.currentTarget.style.background = 'rgba(237,66,69,0.1)'; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent'; }}
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />

                                    {showScrollButton && (
                                        <button
                                            onClick={() => scrollToBottom()}
                                            style={{
                                                position: 'absolute',
                                                bottom: '12px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                background: 'rgba(88, 101, 242, 0.9)',
                                                border: 'none',
                                                borderRadius: '20px',
                                                padding: '6px 14px',
                                                color: '#fff',
                                                fontSize: '11px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                            }}
                                        >
                                            <ChevronDown size={14} />
                                            New messages
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div style={{
                                    padding: '8px 16px',
                                    background: 'rgba(237, 66, 69, 0.15)',
                                    color: '#ED4245',
                                    fontSize: '12px',
                                    textAlign: 'center'
                                }}>
                                    {error}
                                </div>
                            )}

                            {/* Typing indicator */}
                            {typingUsers.length > 0 && (
                                <div style={{
                                    padding: '6px 16px',
                                    background: 'rgba(88, 101, 242, 0.05)',
                                    borderTop: '1px solid rgba(255,255,255,0.03)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        gap: '3px',
                                        alignItems: 'center'
                                    }}>
                                        <span className="typing-dot" style={{
                                            width: '6px', height: '6px', borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.5)',
                                            animation: 'typingBounce 1.4s infinite ease-in-out',
                                            animationDelay: '0s'
                                        }} />
                                        <span className="typing-dot" style={{
                                            width: '6px', height: '6px', borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.5)',
                                            animation: 'typingBounce 1.4s infinite ease-in-out',
                                            animationDelay: '0.2s'
                                        }} />
                                        <span className="typing-dot" style={{
                                            width: '6px', height: '6px', borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.5)',
                                            animation: 'typingBounce 1.4s infinite ease-in-out',
                                            animationDelay: '0.4s'
                                        }} />
                                    </div>
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                                        {typingUsers.length === 1
                                            ? `${typingUsers[0].username} is typing...`
                                            : typingUsers.length === 2
                                                ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
                                                : `${typingUsers[0].username} and ${typingUsers.length - 1} others are typing...`
                                        }
                                    </span>
                                </div>
                            )}

                            {/* Reply indicator */}
                            {replyingTo && (
                                <div style={{
                                    padding: '8px 16px',
                                    background: 'rgba(88, 101, 242, 0.1)',
                                    borderTop: '1px solid rgba(88, 101, 242, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                        <Reply size={14} color="#5865F2" style={{ flexShrink: 0 }} />
                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', flexShrink: 0 }}>
                                            Replying to <span style={{ color: '#8B5CF6', fontWeight: '500' }}>{replyingTo.name}</span>
                                        </span>
                                        {replyingTo.message && (
                                            <span style={{
                                                color: 'rgba(255,255,255,0.4)',
                                                fontSize: '11px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                maxWidth: '150px'
                                            }}>
                                                Ã¢â‚¬â€ {decodeHtmlEntities(replyingTo.message)}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setReplyingTo(null)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'rgba(255,255,255,0.4)',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            flexShrink: 0
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Input area */}
                            <div style={{
                                padding: '12px 16px',
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                background: '#12121a',
                                position: 'relative'
                            }}>
                                {/* Mention autocomplete dropdown */}
                                {showMentionList && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '100%',
                                        left: '16px',
                                        right: '16px',
                                        background: '#1a1a24',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
                                        maxHeight: '200px',
                                        overflow: 'auto',
                                        marginBottom: '8px'
                                    }}>
                                        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '500' }}>
                                                {mentionSearch ? `USERS MATCHING @${mentionSearch}` : 'SELECT A USER'}
                                            </span>
                                        </div>
                                        {mentionUsers.length === 0 ? (
                                            <div style={{ padding: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                                                {mentionSearch ? 'No users found' : 'No other users to mention'}
                                            </div>
                                        ) : (
                                            mentionUsers.map((u, idx) => (
                                                <div
                                                    key={u.id}
                                                    className={`mention-item ${idx === mentionIndex ? 'selected' : ''}`}
                                                    onClick={() => selectMention(u)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        cursor: 'pointer',
                                                        background: idx === mentionIndex ? 'rgba(88, 101, 242, 0.2)' : 'transparent'
                                                    }}
                                                >
                                                    <img
                                                        src={getAvatarUrl(u.discord_id, u.discord_avatar)}
                                                        alt=""
                                                        style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '50%'
                                                        }}
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                                        }}
                                                    />
                                                    <span style={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}>
                                                    {u.custom_username || u.discord_username}
                                                </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* Input area - or approval message */}
                                {canChat ? (
                                    <div style={{
                                        display: 'flex',
                                        gap: '10px',
                                        alignItems: 'flex-end'
                                    }}>
                                        <div style={{ flex: 1, position: 'relative' }}>
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={inputValue}
                                                onChange={handleInputChange}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Type a message... (@mention)"
                                                maxLength={500}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '8px',
                                                    color: '#fff',
                                                    fontSize: '13px',
                                                    outline: 'none',
                                                    transition: 'border-color 0.15s',
                                                    boxSizing: 'border-box'
                                                }}
                                                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(88, 101, 242, 0.5)'}
                                                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                                            />
                                            {showCharCount && (
                                                <span style={{
                                                    position: 'absolute',
                                                    right: '12px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    fontSize: '10px',
                                                    color: charCount > 480 ? '#ED4245' : 'rgba(255,255,255,0.3)'
                                                }}>
                                                    {charCount}/500
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={sendMessage}
                                            disabled={!inputValue.trim() || sending}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '8px',
                                                background: inputValue.trim()
                                                    ? 'linear-gradient(135deg, #5865F2, #8B5CF6)'
                                                    : 'rgba(255,255,255,0.05)',
                                                border: 'none',
                                                cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.15s',
                                                flexShrink: 0
                                            }}
                                        >
                                            <Send
                                                size={16}
                                                color={inputValue.trim() ? '#fff' : 'rgba(255,255,255,0.25)'}
                                            />
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: '12px 16px',
                                        background: 'rgba(255, 193, 7, 0.1)',
                                        border: '1px solid rgba(255, 193, 7, 0.2)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}>
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: '#FFC107',
                                            animation: 'pulse 2s infinite'
                                        }} />
                                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                                            {user?.custom_username || user?.customUsername
                                                ? 'Waiting for username approval to chat...'
                                                : 'Set a username to start chatting'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}

export default LiveChat;
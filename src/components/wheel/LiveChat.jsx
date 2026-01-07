import React, { useState, useEffect, useRef, useCallback } from 'react';
import { COLORS, API_BASE_URL } from '../../config/constants';
import { MessageCircle, Send, X, Minimize2, Maximize2, Trash2, Users, ChevronDown, Reply, AtSign } from 'lucide-react';

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

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const lastMessageIdRef = useRef(0);
    const pollIntervalRef = useRef(null);
    const inputRef = useRef(null);

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
                    setMessages(prev => [...prev, ...data.messages]);

                    // Check for pings in new messages
                    const hasMention = data.messages.some(msg =>
                        msg.user_id !== user?.id && isUserMentioned(msg.message)
                    );

                    if (!isOpen || isMinimized) {
                        setUnreadCount(prev => prev + data.messages.length);
                        setHasNewMessage(true);
                        if (hasMention) {
                            setHasPing(true);
                        }
                    }
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
    }, [isOpen, isMinimized, user]);

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
            fetchMessages();
            pollIntervalRef.current = setInterval(() => {
                // Always poll - fetchMessages handles undefined/0 since parameter
                fetchMessages(lastMessageIdRef.current || undefined);
            }, 3000);

            return () => {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                }
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

    const handleInputChange = (e) => {
        const value = e.target.value;
        const curPos = e.target.selectionStart;
        setInputValue(value);
        setCursorPosition(curPos);

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

    const sendMessage = async () => {
        if (!inputValue.trim() || sending) return;

        setSending(true);
        setError('');
        setShowMentionList(false);

        const messageText = replyingTo
            ? `@${replyingTo.name} ${inputValue.trim()}`
            : inputValue.trim();

        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message: messageText })
            });

            const data = await res.json();

            if (res.ok) {
                setInputValue('');
                setReplyingTo(null);
                setMessages(prev => [...prev, data.message]);
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

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

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
        const timeDiff = new Date(msg.created_at) - new Date(prevMsg.created_at);
        return timeDiff > 5 * 60 * 1000;
    };

    const shouldShowDateSeparator = (msg, index) => {
        if (index === 0) return true;
        const prevMsg = messages[index - 1];
        const prevDate = new Date(prevMsg.created_at).toDateString();
        const currDate = new Date(msg.created_at).toDateString();
        return prevDate !== currDate;
    };

    const handleReply = (msg) => {
        const name = msg.custom_username || msg.discord_username || 'User';
        setReplyingTo({ id: msg.id, name });
        inputRef.current?.focus();
    };

    // Render message with highlighted mentions
    const renderMessageText = (text, msgUserId) => {
        const parts = text.split(/(@\w+)/g);
        return parts.map((part, i) => {
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
                    onClick={() => setIsOpen(true)}
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
                    bottom: '20px',
                    left: '20px',
                    width: '380px',
                    height: isMinimized ? 'auto' : '520px',
                    background: '#12121a',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    zIndex: 950,
                    animation: 'chatSlideUp 0.25s ease-out'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(88, 101, 242, 0.05)'
                    }}>
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
                                    {messages.length} messages · Use @ to mention
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
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
                                onClick={() => setIsOpen(false)}
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
                            {/* Messages */}
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

                                                    <div
                                                        className={`chat-msg-row ${isMentioned ? 'mentioned' : ''}`}
                                                        style={{
                                                            padding: showHeader ? '8px 16px 4px' : '2px 16px 2px 60px',
                                                            borderLeft: isMentioned
                                                                ? '2px solid #8B5CF6'
                                                                : isOwnMessage
                                                                    ? '2px solid rgba(139, 92, 246, 0.4)'
                                                                    : '2px solid transparent',
                                                            animation: index === messages.length - 1 ? 'msgSlideIn 0.2s ease-out' : 'none'
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
                                                                        {renderMessageText(msg.message, msg.user_id)}
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

                                                            {/* Actions */}
                                                            <div className="msg-actions" style={{
                                                                display: 'flex',
                                                                gap: '2px',
                                                                opacity: 0,
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

                            {/* Reply indicator */}
                            {replyingTo && (
                                <div style={{
                                    padding: '8px 16px',
                                    background: 'rgba(88, 101, 242, 0.1)',
                                    borderTop: '1px solid rgba(88, 101, 242, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Reply size={14} color="#5865F2" />
                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                                            Replying to <span style={{ color: '#8B5CF6', fontWeight: '500' }}>{replyingTo.name}</span>
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setReplyingTo(null)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'rgba(255,255,255,0.4)',
                                            cursor: 'pointer',
                                            padding: '4px'
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
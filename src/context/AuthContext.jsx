// ============================================
// Wheel of Fortune - Auth Context
// ============================================

import React, { useState, useEffect, createContext, useContext } from 'react';
import { API_BASE_URL } from '../config/constants';

const AuthContext = createContext(null);

/**
 * Provide authentication context to descendant components.
 *
 * Manages the current user and loading state, performs an initial auth check, cleans temporary auth indicators from the URL, and exposes authentication actions: `login`, `logout`, `setUsername`, and `refreshUser`.
 *
 * @param {{children: React.ReactNode}} props
 * @param {React.ReactNode} props.children - Elements rendered inside the provider.
 * @returns {JSX.Element} The AuthContext provider wrapping `children`.
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');

        if (urlParams.get('auth') === 'success' || hashParams.get('auth') === 'success') {
            const cleanUrl = window.location.origin + window.location.pathname + window.location.hash.split('?')[0];
            window.history.replaceState({}, document.title, cleanUrl);
        }

        checkAuth();
    }, []);

    async function checkAuth() {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
            if (res.ok) {
                const userData = await res.json();
                console.log('Auth check successful:', userData);
                setUser(userData);
            } else {
                console.log('Auth check failed - not logged in');
                setUser(null);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    function login() {
        const returnTo = encodeURIComponent(window.location.href);
        window.location.href = `${API_BASE_URL}/auth/discord?return_to=${returnTo}`;
    }

    async function logout() {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
            setUser(null);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    async function setUsername(username) {
        const res = await fetch(`${API_BASE_URL}/api/username`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        await checkAuth();
        return data;
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, setUsername, refreshUser: checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Access the current authentication context for the calling component.
 *
 * @returns {{user: Object|null, loading: boolean, login: function, logout: function, setUsername: function, refreshUser: function}} Authentication context value:
 * - `user`: the authenticated user object or `null` if not authenticated.
 * - `loading`: `true` while the authentication status is being determined.
 * - `login`: function that initiates the login flow.
 * - `logout`: function that ends the current session.
 * - `setUsername`: function to update the user's username.
 * - `refreshUser`: function to re-check and refresh the current user data.
 */
export function useAuth() {
    return useContext(AuthContext);
}
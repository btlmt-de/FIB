import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/constants';

// Fallback values (used only if server is unreachable)
const FALLBACK_CONFIG = {
    wheel: {
        itemWidth: 80,
        spinDuration: 4000,
        stripLength: 80,
        finalIndex: 72
    },
    urls: {
        imageBase: 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib',
        wheelTexture: 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/item/wheel.png'
    },
    bonusEvents: [
        { id: 'triple_spin', name: 'Triple Spin', description: '3 bonus spins!' },
        { id: 'lucky_spin', name: 'Lucky Spin', description: 'Equal chance for all items!' }
    ]
};

// Cache the config so we don't refetch on every component mount
let cachedConfig = null;
let fetchPromise = null;

async function fetchConfig() {
    if (cachedConfig) return cachedConfig;

    if (fetchPromise) return fetchPromise;

    fetchPromise = fetch(`${API_BASE_URL}/api/config`)
        .then(res => {
            if (!res.ok) throw new Error('Failed to fetch config');
            return res.json();
        })
        .then(data => {
            cachedConfig = data;
            return data;
        })
        .catch(err => {
            console.error('Config fetch failed, using fallback:', err);
            cachedConfig = FALLBACK_CONFIG;
            return FALLBACK_CONFIG;
        })
        .finally(() => {
            fetchPromise = null;
        });

    return fetchPromise;
}

export function useWheelConfig() {
    const [config, setConfig] = useState(cachedConfig || FALLBACK_CONFIG);
    const [loading, setLoading] = useState(!cachedConfig);

    useEffect(() => {
        if (!cachedConfig) {
            fetchConfig().then(data => {
                setConfig(data);
                setLoading(false);
            });
        }
    }, []);

    return {
        config,
        loading,
        // Convenience accessors
        spinDuration: config.wheel.spinDuration,
        itemWidth: config.wheel.itemWidth,
        stripLength: config.wheel.stripLength,
        finalIndex: config.wheel.finalIndex,
        imageBaseUrl: config.urls.imageBase,
        wheelTextureUrl: config.urls.wheelTexture,
        bonusEvents: config.bonusEvents
    };
}

export default useWheelConfig;
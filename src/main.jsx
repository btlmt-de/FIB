import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Imported for its side effect, and it has to happen here. The module stamps
// `data-saver` on <html> at evaluation time, which is before React mounts and
// therefore before the first frame of a fully animated surface can paint on a
// phone that asked it not to. Doing it in an effect would cost that frame, which
// on the hardware this setting exists for is the most expensive one of the
// session.
import './config/power.js'
import App from './App.jsx'
import unicodeItems from '../unicodeItems.json'
import { IMAGE_BASE_URL } from './config/constants'

// Register service worker for texture caching
// Textures cache naturally as you spin - no upfront download needed
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('[SW] Registered'))
        .catch(err => console.error('[SW] Registration failed:', err));
}

const mainItems = unicodeItems
    .filter(item => !item.material.endsWith('_tabChat'))
    .map(item => item.material.toLowerCase());

// Pick random item and set favicon
const randomItem = mainItems[Math.floor(Math.random() * mainItems.length)];
const faviconUrl = `${IMAGE_BASE_URL}/${randomItem}.png`;

const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
link.rel = 'icon';
link.href = faviconUrl;
document.head.appendChild(link);

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
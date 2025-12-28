import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import unicodeItems from '../unicodeItems.json'

const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';

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
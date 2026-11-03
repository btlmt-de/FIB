import React from 'react';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import Footer from '../components/common/Footer.jsx';
import PageLinks from '../wiki/shell/PageLinks.jsx';
import { useGo } from '../wiki/shell/pages.js';
import '../wiki/page.css';

export default function Imprint({ onNavigate }) {
    const go = useGo(onNavigate);
    return (
        <main className="pg pg--short">
            <header className="wk-wrap pg-head">
                <h1 className="wk-h2">Imprint</h1>
                <p className="wk-lede">
                    This project is operated by McPlayHD.net. The imprint and full contact information are on their site.
                </p>
                <div className="pg-head-actions">
                    <a className="wk-btn wk-btn--quiet" href="https://mcplayhd.net/imprint" target="_blank" rel="noopener noreferrer">
                        mcplayhd.net/imprint <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                </div>
            </header>

            <PageLinks ids={['how-to-play', 'gameplay', 'pools', 'rules']} go={go} />
            <Footer />
        </main>
    );
}

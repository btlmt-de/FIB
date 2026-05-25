import React from 'react';
import { COLORS as C } from '../config/constants';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Footer from "../components/common/Footer.jsx";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');
  .imp {
    font-family: 'Barlow', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: oklch(17% 0.025 255);
    color: oklch(94% 0.007 255);
    min-height: 100vh; display: flex; flex-direction: column;
  }
  .imp-shell {
    max-width: 680px; margin: 0 auto;
    padding: 0 28px; width: 100%; box-sizing: border-box;
  }
  .imp-body { flex: 1; padding: 96px 0 80px; }
  .imp-eyebrow {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;
    color: oklch(76% 0.16 68); margin: 0 0 14px;
  }
  .imp-h1 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(40px, 6vw, 64px); font-weight: 800;
    line-height: 0.95; letter-spacing: -0.5px; text-transform: uppercase;
    color: oklch(94% 0.007 255); margin: 0 0 20px;
  }
  .imp-p {
    font-size: 15.5px; color: oklch(54% 0.012 255);
    line-height: 1.75; margin: 0 0 36px; max-width: 440px;
  }
  .imp-link {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 11px 20px;
    background: oklch(76% 0.16 68 / 0.10);
    border: 1px solid oklch(76% 0.16 68 / 0.35);
    border-radius: 7px;
    color: oklch(76% 0.16 68);
    text-decoration: none;
    font-size: 14px; font-weight: 600;
    transition: background 0.12s ease-out, border-color 0.12s ease-out;
  }
  .imp-link:hover {
    background: oklch(76% 0.16 68 / 0.17);
    border-color: oklch(76% 0.16 68 / 0.55);
  }
`;

export default function Imprint() {
    return (
        <div className="imp">
            <style>{CSS}</style>
            <div className="imp-shell" style={{ flex: 1 }}>
                <div className="imp-body">
                    <p className="imp-eyebrow">Legal</p>
                    <h1 className="imp-h1">Imprint</h1>
                    <p className="imp-p">
                        This project is operated by McPlayHD.net.<br />
                        For the imprint and full contact information, visit:
                    </p>
                    <a
                        href="https://mcplayhd.net/imprint"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="imp-link"
                    >
                        mcplayhd.net/imprint <ExternalLink size={13} />
                    </a>
                </div>
            </div>
            <Footer />
        </div>
    );
}
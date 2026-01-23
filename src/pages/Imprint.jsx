import React from 'react';
import { COLORS } from '../config/constants';
import Footer from "../components/common/Footer.jsx";

export default function Imprint() {
    return (
        <div style={{
            minHeight: '100vh',
            background: `linear-gradient(180deg, ${COLORS.bg} 0%, #0f0f1a 100%)`,
            color: COLORS.text,
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Content */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 20px'
            }}>
                <div style={{
                    maxWidth: '500px',
                    textAlign: 'center'
                }}>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: '300',
                        margin: '0 0 24px 0',
                        letterSpacing: '-0.5px'
                    }}>
                        Imprint
                    </h1>

                    <p style={{
                        fontSize: '16px',
                        lineHeight: '1.8',
                        color: COLORS.text,
                        margin: '0 0 32px 0'
                    }}>
                        This project is operated by McPlayHD.net.<br />
                        For the imprint and contact information, see:
                    </p>

                    <a
                        href="https://mcplayhd.net/imprint"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-block',
                            padding: '14px 28px',
                            background: COLORS.accent,
                            color: '#fff',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontSize: '15px',
                            fontWeight: '600',
                            transition: 'transform 0.15s, box-shadow 0.15s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${COLORS.accent}44`;
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        mcplayhd.net/imprint →
                    </a>
                </div>
            </div>
            <Footer />
        </div>
    );
}
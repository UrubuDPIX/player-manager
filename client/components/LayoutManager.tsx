import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import tw from 'twin.macro';
import * as Icon from 'react-feather';

const LayoutManager = () => {
    const [layout, setLayout] = useState(() => localStorage.getItem('arix-layout') || 'row');

    useEffect(() => {
        localStorage.setItem('arix-layout', layout);
        document.body.setAttribute('data-arix-layout', layout);
        applyGrid(layout);
    }, [layout]);

    useEffect(() => {
        const pteroToggle = document.querySelector('.icon-toggle') as HTMLElement;
        if (pteroToggle) pteroToggle.style.display = 'none';

        // Keep applying in case React re-renders the container
        const iv = setInterval(() => {
            applyGrid(localStorage.getItem('arix-layout') || 'row');
        }, 500);
        return () => clearInterval(iv);
    }, []);

    const applyGrid = (mode: string) => {
        // Find the container that wraps the server cards
        // In Jexactyl's DashboardContainer, it is typically a direct wrapper around the ServerRow items
        const containers = document.querySelectorAll('.grid') as NodeListOf<HTMLElement>;
        containers.forEach(el => {
            // Only target the server list grid (avoid targeting the page-level grid)
            if (!el.querySelector('.server-row') && !el.querySelector('[class*="server-row"]')) return;

            if (mode === 'row') {
                el.style.setProperty('grid-template-columns', '1fr', 'important');
                el.style.setProperty('gap', '0', 'important');
            } else if (mode === 'grid') {
                el.style.setProperty('grid-template-columns', 'repeat(2, 1fr)', 'important');
                el.style.setProperty('gap', '0.75rem', 'important');
            } else if (mode === 'compact') {
                el.style.setProperty('grid-template-columns', 'repeat(auto-fill, minmax(220px, 1fr))', 'important');
                el.style.setProperty('gap', '0.75rem', 'important');
            }
        });

        // Also try the general approach for Pterodactyl's dashboard structure
        const gen = document.querySelector('#app > div > div > div.grid') as HTMLElement;
        if (gen) {
            if (mode === 'row') {
                gen.style.setProperty('grid-template-columns', '1fr', 'important');
            } else if (mode === 'grid') {
                gen.style.setProperty('grid-template-columns', 'repeat(2, 1fr)', 'important');
            } else if (mode === 'compact') {
                gen.style.setProperty('grid-template-columns', 'repeat(auto-fill, minmax(220px, 1fr))', 'important');
            }
        }
    };

    const btnBase: React.CSSProperties = {
        padding: '8px 10px',
        borderRadius: 10,
        border: 'none',
        background: 'transparent',
        color: '#888',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.2s ease',
    };

    const btnActive: React.CSSProperties = {
        ...btnBase,
        color: '#2ecc71',
        background: 'rgba(46, 204, 113, 0.1)',
        border: '1px solid rgba(46, 204, 113, 0.3)',
    };

    const SorterUI = (
        <div style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            display: 'flex',
            gap: 4,
            padding: 6,
            borderRadius: 14,
            background: 'rgba(22, 26, 24, 0.92)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)',
        }}>
            <button onClick={() => setLayout('row')} style={layout === 'row' ? btnActive : btnBase} title="Row Layout">
                <Icon.List size={16} />
            </button>
            <button onClick={() => setLayout('grid')} style={layout === 'grid' ? btnActive : btnBase} title="Grid Layout">
                <Icon.Grid size={16} />
            </button>
            <button onClick={() => setLayout('compact')} style={layout === 'compact' ? btnActive : btnBase} title="Compact Layout">
                <Icon.Columns size={16} />
            </button>
        </div>
    );

    return ReactDOM.createPortal(SorterUI, document.body);
};

export default LayoutManager;

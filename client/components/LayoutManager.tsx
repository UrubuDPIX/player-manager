import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import tw from 'twin.macro';
import * as Icon from 'react-feather';

const LayoutManager = () => {
    const [layout, setLayout] = useState(() => localStorage.getItem('arix-layout') || 'row');

    useEffect(() => {
        localStorage.setItem('arix-layout', layout);
        document.body.setAttribute('data-arix-layout', layout);
    }, [layout]);

    useEffect(() => {
        const pteroToggle = document.querySelector('.icon-toggle') as HTMLElement;
        if (pteroToggle) pteroToggle.style.display = 'none';

        // Add global styles for the layout using :has selector for instant rendering without shifting
        if (!document.getElementById('arix-layout-styles')) {
            const style = document.createElement('style');
            style.id = 'arix-layout-styles';
            style.innerHTML = `
                body[data-arix-layout="row"] div:has(> .server-row) {
                    display: grid !important;
                    grid-template-columns: 1fr !important;
                    gap: 0 !important;
                }
                body[data-arix-layout="grid"] div:has(> .server-row) {
                    display: grid !important;
                    grid-template-columns: repeat(2, 1fr) !important;
                    gap: 0.75rem !important;
                }
                body[data-arix-layout="compact"] div:has(> .server-row) {
                    display: grid !important;
                    grid-template-columns: repeat(5, 1fr) !important;
                    gap: 0.75rem !important;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

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

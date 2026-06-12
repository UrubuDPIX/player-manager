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
        // Encontra a primeira server-row
        const firstRow = document.querySelector('.server-row');
        if (!firstRow) return;

        // O pai direto das server-rows é o container que queremos transformar em grid
        const container = firstRow.parentElement;
        if (!container) return;

        // Força o display grid no container pai
        container.style.setProperty('display', 'grid', 'important');

        if (mode === 'row') {
            container.style.setProperty('grid-template-columns', '1fr', 'important');
            container.style.setProperty('gap', '0', 'important');
        } else if (mode === 'grid') {
            container.style.setProperty('grid-template-columns', 'repeat(2, 1fr)', 'important');
            container.style.setProperty('gap', '0.75rem', 'important');
        } else if (mode === 'compact') {
            container.style.setProperty('grid-template-columns', 'repeat(5, 1fr)', 'important');
            container.style.setProperty('gap', '0.75rem', 'important');
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

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import tw from 'twin.macro';
import * as Icon from 'react-feather';

const LayoutManager = () => {
    const [layout, setLayout] = useState(() => localStorage.getItem('arix-layout') || 'row');

    useEffect(() => {
        localStorage.setItem('arix-layout', layout);
        document.body.setAttribute('data-arix-layout', layout);
        
        // Apply the layout by forcing the grid-template-columns of Pterodactyl
        const grid = document.querySelector('#app > div > div > div.grid') as HTMLElement;
        if (grid) {
            if (layout === 'row') {
                grid.style.setProperty('grid-template-columns', '1fr', 'important');
            } else if (layout === 'grid') {
                grid.style.setProperty('grid-template-columns', 'repeat(2, 1fr)', 'important');
            } else if (layout === 'compact') {
                grid.style.setProperty('grid-template-columns', 'repeat(3, 1fr)', 'important');
            }
        }
    }, [layout]);

    // Hide the native pterodactyl toggle if it exists
    useEffect(() => {
        const pteroToggle = document.querySelector('.icon-toggle') as HTMLElement;
        if (pteroToggle) pteroToggle.style.display = 'none';
        
        // Continously apply grid just in case react re-renders it
        const interval = setInterval(() => {
            const grid = document.querySelector('#app > div > div > div.grid') as HTMLElement;
            if (grid) {
                const currentLayout = localStorage.getItem('arix-layout') || 'row';
                if (currentLayout === 'row') {
                    grid.style.setProperty('grid-template-columns', '1fr', 'important');
                } else if (currentLayout === 'grid') {
                    grid.style.setProperty('grid-template-columns', 'repeat(2, 1fr)', 'important');
                } else if (currentLayout === 'compact') {
                    grid.style.setProperty('grid-template-columns', 'repeat(3, 1fr)', 'important');
                }
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const SorterUI = (
        <div css={tw`fixed bottom-8 right-8 z-50 flex gap-2 p-2 rounded-2xl border border-[#2c3530] shadow-[0_10px_40px_rgba(0,0,0,0.5)]`} style={{ backgroundColor: 'rgba(22, 26, 24, 0.9)' }}>
            <button 
                onClick={() => setLayout('row')} 
                className="group"
                css={[tw`p-2.5 rounded-xl hover:bg-[#2c3530] transition-all duration-300 flex items-center gap-2`, layout === 'row' && tw`text-[#2ecc71] bg-[#1a201c] border`, layout === 'row' && { borderColor: 'rgba(46, 204, 113, 0.3)' }]}
                title="Row Layout"
            >
                <Icon.List size={18} className="group-hover:scale-110 transition-transform" />
            </button>
            <button 
                onClick={() => setLayout('grid')} 
                className="group"
                css={[tw`p-2.5 rounded-xl hover:bg-[#2c3530] transition-all duration-300 flex items-center gap-2`, layout === 'grid' && tw`text-[#2ecc71] bg-[#1a201c] border`, layout === 'grid' && { borderColor: 'rgba(46, 204, 113, 0.3)' }]}
                title="Grid Layout"
            >
                <Icon.Grid size={18} className="group-hover:scale-110 transition-transform" />
            </button>
            <button 
                onClick={() => setLayout('compact')} 
                className="group"
                css={[tw`p-2.5 rounded-xl hover:bg-[#2c3530] transition-all duration-300 flex items-center gap-2`, layout === 'compact' && tw`text-[#2ecc71] bg-[#1a201c] border`, layout === 'compact' && { borderColor: 'rgba(46, 204, 113, 0.3)' }]}
                title="Compact Layout"
            >
                <Icon.Columns size={18} className="group-hover:scale-110 transition-transform" />
            </button>
        </div>
    );

    return ReactDOM.createPortal(SorterUI, document.body);
};

export default LayoutManager;

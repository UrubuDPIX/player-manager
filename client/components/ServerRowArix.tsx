import React, { useEffect, useRef, useState } from 'react';
import tw, { styled } from 'twin.macro';
import * as Icon from 'react-feather';
import { Link } from 'react-router-dom';
import { Server } from '@/api/server/getServer';
import { bytesToString, ip } from '@/lib/formatters';
import getServerResourceUsage, { ServerPowerState, ServerStats } from '@/api/server/getServerResourceUsage';
import http from '@/api/http';
import LayoutManager from './LayoutManager';

const ArixCard = styled.div<{ $bg: string }>`
    ${tw`relative w-full rounded-[20px] overflow-hidden mb-6`}
    transition: all 0.3s ease;
    border: 1px solid rgba(255,255,255,0.05);
    background: #161a18;

    /* ROW LAYOUT */
    body[data-arix-layout="row"] & {
        ${tw`flex flex-row items-center h-[160px] min-h-[160px] p-4`}
        background: rgba(22, 26, 24, 0.8);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* GRID LAYOUT */
    body[data-arix-layout="grid"] & {
        ${tw`flex flex-col p-5`}
        min-height: 250px;
        background: rgba(22, 26, 24, 0.9);
        border-radius: 16px;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(5px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        
        /* O efeito de borda animada do Hyper */
        &::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 16px;
            padding: 2px; /* border-width */
            background-image: radial-gradient(circle at 50% 50%, rgba(225, 29, 72, 0.5), transparent 60%);
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: exclude;
            pointer-events: none;
        }
    }

    /* COMPACT LAYOUT */
    body[data-arix-layout="compact"] & {
        ${tw`flex flex-col justify-end p-4`}
        min-height: 280px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        box-shadow: inset 0 0 50px rgba(0,0,0,0.5);
        ${props => props.$bg && `
            background-image: linear-gradient(to top, rgba(15,17,16,0.95) 0%, rgba(15,17,16,0.4) 100%), ${props.$bg};
            background-size: cover;
            background-position: center;
        `}
    }
`;

const CardInner = styled.div`
    display: flex;
    width: 100%;
    z-index: 2;

    body[data-arix-layout="row"] & {
        flex-direction: row;
        align-items: center;
        gap: 2rem;
    }
    body[data-arix-layout="grid"] & {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 1.5rem;
    }
    body[data-arix-layout="compact"] & {
        flex-direction: column;
        gap: 1rem;
    }
`;

const InfoColumn = styled.div`
    display: flex;

    body[data-arix-layout="row"] & {
        flex-direction: row;
        align-items: center;
        gap: 1.25rem;
        width: 35%;
    }
    body[data-arix-layout="grid"] & {
        flex-direction: column;
        text-align: center;
        width: 100%;
        align-items: center;
        gap: 0.5rem;
    }
    body[data-arix-layout="compact"] & {
        flex-direction: column;
        text-align: center;
        width: 100%;
        align-items: center;
        gap: 0.5rem;
    }
`;

const StatsColumn = styled.div`
    display: flex;

    body[data-arix-layout="row"] & {
        flex-direction: column;
        gap: 1rem;
        width: 30%;
    }
    body[data-arix-layout="grid"] & {
        flex-direction: column;
        gap: 1rem;
        width: 100%;
    }
    body[data-arix-layout="compact"] & {
        display: none;
    }
`;

const ActionsColumn = styled.div`
    display: flex;

    body[data-arix-layout="row"] & {
        flex-direction: column;
        gap: 1rem;
        width: 35%;
        justify-content: center;
    }
    body[data-arix-layout="grid"] & {
        display: none;
    }
    body[data-arix-layout="compact"] & {
        display: none;
    }
`;

const ServerImage = styled.div<{ $bg: string }>`
    ${tw`flex-shrink-0 bg-gray-800 bg-center bg-cover bg-no-repeat relative`}
    ${({ $bg }) => `background-image: ${$bg};`}
    
    body[data-arix-layout="row"] & {
        width: 100px;
        height: 100px;
        border-radius: 16px;
    }
    body[data-arix-layout="grid"] & {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        margin-bottom: 0.5rem;
    }
    body[data-arix-layout="compact"] & {
        display: none; /* Em compact a imagem já está no fundo do card inteiro */
    }
`;

const ProgressBar = ({ value, max, color = '#2ecc71' }: { value: number, max: number, color?: string }) => {
    const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
    return (
        <div css={tw`w-full bg-[#1e2521] rounded-full h-1.5 mt-1 overflow-hidden`}>
            <div style={{ width: `${percent}%`, backgroundColor: color }} css={tw`h-full rounded-full shadow-[0_0_10px_rgba(46,204,113,0.8)]`} />
        </div>
    );
};

const ManageButton = styled(Link)`
    ${tw`w-full flex items-center justify-center py-2.5 rounded-xl text-sm font-bold text-[#0d120f] transition-all`}
    background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    box-shadow: 0 4px 15px rgba(46, 204, 113, 0.25);

    &:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }
`;

const StatusPill = styled.div<{ $status: ServerPowerState | undefined }>`
    ${tw`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-[#1a201c] border border-[#2c3530] z-10`}
    color: ${({ $status }) => 
        !$status || $status === 'offline' ? '#e74c3c' : 
        $status === 'running' ? '#2ecc71' : '#f1c40f'
    };

    &::before {
        content: '';
        ${tw`w-1.5 h-1.5 rounded-full`}
        background-color: currentColor;
        box-shadow: 0 0 8px currentColor;
        ${({ $status }) => $status === 'running' && tw`animate-pulse`}
    }
`;

type Timer = ReturnType<typeof setInterval>;
let globalIsFirstCard = true;

export default ({ server, className }: { server: Server; className?: string }) => {
    const isFirstCardRef = useRef(globalIsFirstCard);
    useEffect(() => {
        globalIsFirstCard = false;
        return () => { globalIsFirstCard = true; };
    }, []);

    const getEggBackground = (server: any) => {
        if (server.bgImage) return `url(${server.bgImage})`;
        const eggStr = [
            server.name, server.description, server.eggName, server.egg?.name
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (eggStr.includes('minecraft') || eggStr.includes('java')) {
            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-minecraft.png)';
        }
        if (eggStr.includes('fivem') || eggStr.includes('gta')) {
            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-fivem.jpg)';
        }
        if (eggStr.includes('bot') || eggStr.includes('python') || eggStr.includes('node')) {
            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-python.jpg)';
        }
        return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-minecraft.png)';
    };
    const eggBg = getEggBackground(server);

    const interval = useRef<Timer>(null) as React.MutableRefObject<Timer>;
    const [isSuspended, setIsSuspended] = useState(server.status === 'suspended');
    const [stats, setStats] = useState<ServerStats | null>(null);

    const getStats = () => getServerResourceUsage(server.uuid).then(setStats).catch(console.error);

    useEffect(() => {
        setIsSuspended(stats?.isSuspended || server.status === 'suspended');
    }, [stats?.isSuspended, server.status]);

    useEffect(() => {
        if (isSuspended) return;
        getStats().then(() => { interval.current = setInterval(() => getStats(), 30000); });
        return () => { interval.current && clearInterval(interval.current); };
    }, [isSuspended]);

    return (
        <ArixCard className={`server-row ${className || ''}`} $bg={eggBg}>
            {isFirstCardRef.current && <LayoutManager />}
            <StatusPill $status={stats?.status}>
                {stats?.status || 'OFFLINE'}
            </StatusPill>
            
            <CardInner>
                <InfoColumn>
                    <ServerImage $bg={eggBg} />
                    <div css={tw`flex flex-col justify-center`}>
                        <h3 css={tw`text-lg font-black text-white mb-1 truncate max-w-[200px]`}>{server.name}</h3>
                        <p css={tw`text-xs font-semibold text-gray-400 truncate`}>{(server as any).eggName || (server as any).egg?.name || 'Server'}</p>
                    </div>
                </InfoColumn>

                <StatsColumn>
                    <div>
                        <div css={tw`flex items-center gap-2 text-xs font-bold text-gray-200 mb-1`}>
                            <Icon.Cpu size={14} color="#2ecc71" /> CPU: {stats?.cpuUsagePercent?.toFixed(2) || '0.00'}%
                        </div>
                        <ProgressBar value={stats?.cpuUsagePercent || 0} max={server.limits.cpu || 200} />
                    </div>
                    <div>
                        <div css={tw`flex items-center gap-2 text-xs font-bold text-gray-200 mb-1`}>
                            <Icon.Server size={14} color="#2ecc71" /> RAM: {bytesToString(stats?.memoryUsageInBytes || 0)}
                        </div>
                        <ProgressBar value={stats?.memoryUsageInBytes || 0} max={server.limits.memory * 1024 * 1024 || 4000000000} />
                    </div>
                </StatsColumn>

                <ActionsColumn>
                    <ManageButton to={`/server/${server.id}`}>
                        Manage Server
                    </ManageButton>
                </ActionsColumn>
            </CardInner>
        </ArixCard>
    );
};

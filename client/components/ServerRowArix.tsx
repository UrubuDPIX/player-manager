import React, { useEffect, useRef, useState } from 'react';
import tw, { styled, css as tCss } from 'twin.macro';
import * as Icon from 'react-feather';
import { Link } from 'react-router-dom';
import { Server } from '@/api/server/getServer';
import Spinner from '@/components/elements/Spinner';
import { bytesToString, ip } from '@/lib/formatters';
import getServerResourceUsage, { ServerPowerState, ServerStats } from '@/api/server/getServerResourceUsage';
import http from '@/api/http';
import LayoutManager from './LayoutManager';

/* ============================================================
   CARD WRAPPER — tamanhos fixos por layout
   ROW     = 1200 x 160
   GRID    = 600  x 360
   COMPACT = 298  x 358
   ============================================================ */
const ArixCard = styled.div<{ $bg: string }>`
    position: relative;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    background-color: rgba(22, 26, 24, 0.85);
    backdrop-filter: blur(10px);
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
    margin-bottom: 0.75rem;

    &:hover {
        border-color: rgba(46, 204, 113, 0.25);
        box-shadow: 0 0 20px rgba(46, 204, 113, 0.06);
    }

    /* ---------- ROW ---------- */
    body[data-arix-layout="row"] & {
        width: 100%;
        max-width: 1200px;
        height: 160px;
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 0 1.25rem;
        gap: 1.5rem;
    }

    /* ---------- GRID ---------- */
    body[data-arix-layout="grid"] & {
        width: 100%;
        height: 360px;
        display: flex;
        flex-direction: column;
        padding: 1.25rem;
    }

    /* ---------- COMPACT ---------- */
    body[data-arix-layout="compact"] & {
        width: 100%;
        height: 358px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 1rem;
        ${props => props.$bg ? `
            background-image: linear-gradient(to top, rgba(15,17,16,0.95) 0%, rgba(15,17,16,0.2) 60%), ${props.$bg};
            background-size: cover;
            background-position: center;
        ` : ''}
    }
`;

/* ============================================================
   INNER COMPONENTS
   ============================================================ */

const ServerImage = styled.div<{ $bg: string }>`
    flex-shrink: 0;
    background-color: #1a1f1c;
    background-image: ${({ $bg }) => $bg};
    background-size: cover;
    background-position: center;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.06);

    body[data-arix-layout="row"] & {
        width: 120px;
        height: 120px;
    }
    body[data-arix-layout="grid"] & {
        width: 70px;
        height: 70px;
        border-radius: 50%;
    }
    body[data-arix-layout="compact"] & {
        width: 50px;
        height: 50px;
        border-radius: 50%;
    }
`;

const StatusPill = styled.div<{ $status: ServerPowerState | undefined }>`
    position: absolute;
    top: 10px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: rgba(15, 17, 16, 0.85);
    border: 1px solid rgba(255,255,255,0.08);
    z-index: 5;
    color: ${({ $status }) =>
        !$status || $status === 'offline' ? '#e74c3c' :
        $status === 'running' ? '#2ecc71' : '#f1c40f'
    };

    &::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: currentColor;
        box-shadow: 0 0 6px currentColor;
    }
`;

const ProgressBar = ({ value, max, color = '#2ecc71' }: { value: number; max: number; color?: string }) => {
    const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
    return (
        <div style={{ width: '100%', height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: 4 }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: color, transition: 'width 0.6s ease' }} />
        </div>
    );
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
type Timer = ReturnType<typeof setInterval>;
let globalIsFirstCard = true;

export default ({ server, className }: { server: Server; className?: string }) => {
    const isFirstCardRef = useRef(globalIsFirstCard);
    useEffect(() => {
        globalIsFirstCard = false;
        return () => { globalIsFirstCard = true; };
    }, []);

    /* ---- egg background ---- */
    const getEggBg = (s: any): string => {
        if (s.bgImage) return `url(${s.bgImage})`;
        const t = [s.name, s.description, s.eggName, s.egg?.name, s.dockerImage, s.invocation]
            .filter(Boolean).join(' ').toLowerCase();
        if (/minecraft|java|forge|paper|spigot|moon|modpack/.test(t))
            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-minecraft.png)';
        if (/fivem|gta|redm/.test(t))
            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-fivem.jpg)';
        if (/node|js/.test(t))
            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-nodejs.jpg)';
        if (/python|bot|discord/.test(t))
            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-python.jpg)';
        if (/lavalink|music/.test(t))
            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/bg-music.png)';
        return '';
    };
    const eggBg = getEggBg(server);

    /* ---- stats polling ---- */
    const interval = useRef<Timer>(null) as React.MutableRefObject<Timer>;
    const [isSuspended, setIsSuspended] = useState(server.status === 'suspended');
    const [stats, setStats] = useState<ServerStats | null>(null);

    const getStats = () =>
        getServerResourceUsage(server.uuid).then(setStats).catch(console.error);

    useEffect(() => {
        setIsSuspended(stats?.isSuspended || server.status === 'suspended');
    }, [stats?.isSuspended, server.status]);

    useEffect(() => {
        if (isSuspended) return;
        getStats().then(() => {
            interval.current = setInterval(() => getStats(), 30000);
        });
        return () => { interval.current && clearInterval(interval.current); };
    }, [isSuspended]);

    /* ---- power commands ---- */
    const sendPower = (cmd: 'start' | 'restart') => {
        http.post(`/api/client/servers/${server.uuid}/power`, { signal: cmd }).catch(console.error);
    };

    /* ---- helper data ---- */
    const cpuPct = stats?.cpuUsagePercent?.toFixed(1) ?? '0.0';
    const ramStr = bytesToString(stats?.memoryUsageInBytes || 0);
    const diskStr = bytesToString(stats?.diskUsageInBytes || 0);
    const alloc = server.allocations.filter(a => a.isDefault).map(a => `${a.alias || ip(a.ip)}:${a.port}`)[0] || '';
    const eggName = (server as any).eggName || (server as any).egg?.name || 'Server';

    /* ============================================================
       RENDER
       ============================================================ */
    return (
        <ArixCard className={className} $bg={eggBg}>
            {isFirstCardRef.current && <LayoutManager />}
            <StatusPill $status={stats?.status}>
                {stats?.status || 'OFFLINE'}
            </StatusPill>

            {/* --- SERVER IMAGE --- */}
            <ServerImage $bg={eggBg} />

            {/* --- INFO BLOCK --- */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, zIndex: 2 }}>
                <Link to={`/server/${server.id}`} style={{ textDecoration: 'none' }}>
                    <h3 style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {server.name}
                    </h3>
                </Link>
                <span style={{ color: '#888', fontSize: 11, fontWeight: 600 }}>{eggName}</span>
                {alloc && (
                    <span style={{ color: '#666', fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>
                        <Icon.Globe size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} color="#2ecc71" />
                        {alloc}
                    </span>
                )}
            </div>

            {/* --- STATS BLOCK --- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200, flexShrink: 0, zIndex: 2 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#ccc' }}>
                        <Icon.Cpu size={12} color="#2ecc71" /> CPU: {cpuPct}%
                    </div>
                    <ProgressBar value={stats?.cpuUsagePercent || 0} max={server.limits.cpu || 200} />
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#ccc' }}>
                        <Icon.Server size={12} color="#2ecc71" /> Ram: {ramStr}
                    </div>
                    <ProgressBar value={stats?.memoryUsageInBytes || 0} max={server.limits.memory * 1024 * 1024 || 4000000000} />
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#ccc' }}>
                        <Icon.HardDrive size={12} color="#2ecc71" /> Disk: {diskStr}
                    </div>
                    <ProgressBar value={stats?.diskUsageInBytes || 0} max={server.limits.disk * 1024 * 1024 || 10000000000} />
                </div>
            </div>

            {/* --- ACTIONS BLOCK --- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, width: 160, zIndex: 2 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button
                        onClick={(e) => { e.preventDefault(); sendPower('start'); }}
                        style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid #2ecc71', background: 'transparent', color: '#2ecc71', fontSize: 10, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em' }}
                    >
                        ▶ START
                    </button>
                    <button
                        onClick={(e) => { e.preventDefault(); sendPower('restart'); }}
                        style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid #2ecc71', background: 'transparent', color: '#2ecc71', fontSize: 10, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em' }}
                    >
                        ↻ RESTART
                    </button>
                </div>
                <Link
                    to={`/server/${server.id}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0', borderRadius: 10, background: 'linear-gradient(135deg, #27ae60, #2ecc71)', color: '#0d120f', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}
                >
                    Manage Server
                </Link>
            </div>
        </ArixCard>
    );
};

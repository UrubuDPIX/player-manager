import React, { useEffect, useRef, useState } from 'react';
import tw, { styled } from 'twin.macro';
import * as Icon from 'react-feather';
import { Link } from 'react-router-dom';
import { Server } from '@/api/server/getServer';
import { bytesToString, ip } from '@/lib/formatters';
import getServerResourceUsage, { ServerPowerState, ServerStats } from '@/api/server/getServerResourceUsage';
import http from '@/api/http';
import LayoutManager from './LayoutManager';

/* ============================================================
   TAMANHOS EXATOS:
   ROW     = 1200 x 160
   GRID    = 600  x 360  (imagem de fundo, stats overlay no bottom)
   COMPACT = 298  x 358  (imagem de fundo + nome, hover revela stats)
   ============================================================ */

/* ---- STATUS PILL ---- */
const StatusPill = styled.div<{ $status: ServerPowerState | undefined }>`
    position: absolute;
    top: 10px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: rgba(15, 17, 16, 0.8);
    border: 1px solid rgba(255,255,255,0.08);
    z-index: 10;
    color: ${({ $status }) =>
        !$status || $status === 'offline' ? '#e74c3c' :
        $status === 'running' ? '#2ecc71' : '#f1c40f'
    };
    &::before {
        content: '';
        width: 6px; height: 6px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 6px currentColor;
    }
`;

/* ---- PROGRESS BAR ---- */
const ProgressBar = ({ value, max, color = '#2ecc71' }: { value: number; max: number; color?: string }) => {
    const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
    return (
        <div style={{ width: '100%', height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 3 }}>
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

    const [hovered, setHovered] = useState(false);

    /* ---- egg background ---- */
    const getEggBg = (s: any): string => {
        if (s.bgImage) return s.bgImage;
        const t = [s.name, s.description, s.eggName, s.egg?.name, s.dockerImage, s.invocation]
            .filter(Boolean).join(' ').toLowerCase();
        if (/minecraft|java|forge|paper|spigot|moon|modpack/.test(t))
            return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-minecraft.png';
        if (/fivem|gta|redm/.test(t))
            return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-fivem.jpg';
        if (/node|js/.test(t))
            return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-nodejs.jpg';
        if (/python|bot|discord/.test(t))
            return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-python.jpg';
        if (/lavalink|music/.test(t))
            return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/bg-music.png';
        return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-minecraft.png';
    };
    const eggBgUrl = getEggBg(server);
    const eggName = (server as any).eggName || (server as any).egg?.name || 'Server';

    /* ---- stats polling ---- */
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

    const sendPower = (cmd: 'start' | 'restart') => {
        http.post(`/api/client/servers/${server.uuid}/power`, { signal: cmd }).catch(console.error);
    };

    /* ---- data ---- */
    const cpuPct = stats?.cpuUsagePercent?.toFixed(2) ?? '0.00';
    const ramStr = bytesToString(stats?.memoryUsageInBytes || 0);
    const diskStr = bytesToString(stats?.diskUsageInBytes || 0);
    const alloc = server.allocations.filter(a => a.isDefault).map(a => `${a.alias || ip(a.ip)}:${a.port}`)[0] || '';
    const cpuLimit = server.limits.cpu > 0 ? `${server.limits.cpu}%` : '∞';
    const ramLimit = server.limits.memory > 0 ? `${(server.limits.memory / 1024).toFixed(2)} GB` : '∞';
    const diskLimit = server.limits.disk > 0 ? `${(server.limits.disk / 1024).toFixed(2)} GB` : '∞';

    /* ---- layout detection ---- */
    const layout = typeof document !== 'undefined'
        ? document.body.getAttribute('data-arix-layout') || 'row'
        : 'row';

    /* ==========================
       ROW LAYOUT (1200 x 160)
       ========================== */
    const renderRow = () => (
        <div
            className={'server-row'}
            style={{
                position: 'relative',
                width: '100%', maxWidth: 1200, height: 160,
                display: 'flex', flexDirection: 'row', alignItems: 'center',
                margin: '0 auto 12px auto',
                gap: 24, padding: '0 20px',
                background: 'rgba(22, 26, 24, 0.85)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                backdropFilter: 'blur(10px)',
                transition: 'border-color 0.3s ease',
                overflow: 'hidden',
            }}
        >
            <StatusPill $status={stats?.status}>{stats?.status || 'OFFLINE'}</StatusPill>

            {/* Image */}
            <div style={{
                width: 120, height: 120, flexShrink: 0,
                borderRadius: 14,
                backgroundImage: `url(${eggBgUrl})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                border: '1px solid rgba(255,255,255,0.06)',
            }} />

            {/* Info */}
            <div style={{ flex: '0 0 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Link to={`/server/${server.id}`} style={{ textDecoration: 'none' }}>
                    <h3 style={{ color: '#fff', fontWeight: 900, fontSize: 20, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{server.name}</h3>
                </Link>
                <span style={{ color: '#888', fontSize: 11, fontWeight: 600 }}>{eggName}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#1a201c', border: '1px solid #2c3530', borderRadius: 999, padding: '4px 10px', width: 'fit-content', marginTop: 2 }}>
                    <Icon.Globe size={11} color="#2ecc71" />
                    <span style={{ color: '#bbb', fontSize: 10, fontFamily: 'monospace' }}>{alloc}</span>
                </span>
            </div>

            {/* Stats */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#ddd' }}>
                        <Icon.Cpu size={13} color="#2ecc71" /> Cpu: {cpuPct}%
                    </div>
                    <ProgressBar value={stats?.cpuUsagePercent || 0} max={server.limits.cpu || 200} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', fontWeight: 700, marginTop: 2 }}>
                        <span>0%</span><span>{cpuLimit}</span>
                    </div>
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#ddd' }}>
                        <Icon.Server size={13} color="#2ecc71" /> Ram: {ramStr}
                    </div>
                    <ProgressBar value={stats?.memoryUsageInBytes || 0} max={server.limits.memory * 1024 * 1024 || 4000000000} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', fontWeight: 700, marginTop: 2 }}>
                        <span>0 GB</span><span>{ramLimit}</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div style={{ flex: '0 0 180px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={(e) => { e.preventDefault(); sendPower('start'); }} style={{ flex: 1, padding: '5px 0', borderRadius: 999, border: '1px solid #2ecc71', background: 'transparent', color: '#2ecc71', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>▶ START</button>
                    <button onClick={(e) => { e.preventDefault(); sendPower('restart'); }} style={{ flex: 1, padding: '5px 0', borderRadius: 999, border: '1px solid #2ecc71', background: 'transparent', color: '#2ecc71', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>↻ RESTART</button>
                </div>
                <Link to={`/server/${server.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0', borderRadius: 10, background: 'linear-gradient(135deg, #27ae60, #2ecc71)', color: '#0d120f', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>Manage Server</Link>
            </div>
        </div>
    );

    const renderGrid = () => (
        <div
            className={'server-row'}
            style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column',
                width: '100%',
                borderRadius: 14,
                background: 'rgba(22, 26, 24, 0.85)',
                border: '1px solid rgba(46, 204, 113, 0.4)',
                padding: '16px',
                marginBottom: 12,
                transition: 'all 0.3s ease',
            }}
        >
            {/* Top Banner */}
            <div style={{
                position: 'relative',
                width: '100%', height: 110, flexShrink: 0,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundImage: `url(${eggBgUrl})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                border: '1px solid rgba(46, 204, 113, 0.4)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(15,17,16,0.9) 0%, rgba(15,17,16,0.3) 100%)',
                    zIndex: 1,
                }} />
                
                {/* Egg Tag */}
                <span style={{
                    position: 'absolute', top: 10, left: 12, zIndex: 10,
                    padding: '3px 10px', borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                    {eggName.split(' ')[0]}
                </span>

                <StatusPill $status={stats?.status}>{stats?.status || 'OFFLINE'}</StatusPill>

                <h3 style={{ position: 'relative', zIndex: 3, color: '#fff', fontWeight: 900, fontSize: 22, margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>{server.name}</h3>
                <span style={{ position: 'relative', zIndex: 3, color: '#ccc', fontSize: 12, fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{eggName}</span>
            </div>

            {/* Bottom Content */}
            <div style={{ display: 'flex', flex: 1, gap: 24 }}>
                {/* Left side: Stats */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#ddd' }}>
                            <Icon.Cpu size={14} color="#2ecc71" /> Cpu: {cpuPct}%
                        </div>
                        <ProgressBar value={stats?.cpuUsagePercent || 0} max={server.limits.cpu || 200} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', fontWeight: 700, marginTop: 4 }}>
                            <span>0%</span><span>{cpuLimit}</span>
                        </div>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#ddd' }}>
                            <Icon.Server size={14} color="#2ecc71" /> Ram: {ramStr}
                        </div>
                        <ProgressBar value={stats?.memoryUsageInBytes || 0} max={server.limits.memory * 1024 * 1024 || 4000000000} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', fontWeight: 700, marginTop: 4 }}>
                            <span>0 GB</span><span>{ramLimit}</span>
                        </div>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#ddd' }}>
                            <Icon.HardDrive size={14} color="#2ecc71" /> Disk: {diskStr}
                        </div>
                        <ProgressBar value={stats?.diskUsageInBytes || 0} max={server.limits.disk * 1024 * 1024 || 10000000000} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', fontWeight: 700, marginTop: 4 }}>
                            <span>0 GB</span><span>{diskLimit}</span>
                        </div>
                    </div>
                </div>

                {/* Right side: Actions */}
                <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1a201c', border: '1px solid #2c3530', borderRadius: 999, padding: '8px 12px', width: '100%', justifyContent: 'center' }}>
                        <Icon.Globe size={12} color="#2ecc71" />
                        <span style={{ color: '#ccc', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>IP: {alloc}</span>
                    </span>
                    
                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                        <button onClick={(e) => { e.preventDefault(); sendPower('start'); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 0', borderRadius: 999, border: '1px solid #2ecc71', background: 'transparent', color: '#2ecc71', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>
                            <Icon.PlayCircle size={12} /> START
                        </button>
                        <button onClick={(e) => { e.preventDefault(); sendPower('restart'); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 0', borderRadius: 999, border: '1px solid #2ecc71', background: 'transparent', color: '#2ecc71', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>
                            <Icon.RefreshCw size={12} /> RESTART
                        </button>
                    </div>
                    
                    <Link to={`/server/${server.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', borderRadius: 8, background: 'linear-gradient(135deg, #27ae60, #2ecc71)', color: '#0d120f', fontSize: 13, fontWeight: 800, textDecoration: 'none', width: '100%' }}>Manage Server</Link>
                </div>
            </div>
        </div>
    );

    /* ==========================
       COMPACT LAYOUT (298 x 358)
       Card com imagem + nome.
       Ao passar o mouse: revela stats
       ========================== */
    const renderCompact = () => (
        <div
            className={'server-row'}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: 'relative',
                width: '100%', height: 358,
                borderRadius: 14,
                overflow: 'hidden',
                backgroundImage: `url(${eggBgUrl})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                border: '1px solid rgba(46, 204, 113, 0.4)',
                marginBottom: 12,
                cursor: 'pointer',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
            }}
        >
            {/* Dark gradient base */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(15,17,16,0.85) 0%, rgba(15,17,16,0.2) 50%, transparent 100%)',
                zIndex: 1,
            }} />

            {/* Egg Tag (top left) */}
            <span style={{
                position: 'absolute', top: 10, left: 12, zIndex: 10,
                padding: '3px 8px', borderRadius: 6,
                background: 'rgba(46, 204, 113, 0.15)', border: '1px solid rgba(46, 204, 113, 0.3)',
                color: '#2ecc71', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
                {eggName.split(' ')[0]}
            </span>

            <StatusPill $status={stats?.status}>{stats?.status || 'OFFLINE'}</StatusPill>

            {/* Server name + egg (center of card, always visible) */}
            <div style={{
                position: 'absolute',
                left: 0, right: 0,
                zIndex: 3,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '0 16px',
                textAlign: 'center' as const,
                bottom: hovered ? 'unset' : 30,
                top: hovered ? 10 : 'unset',
                transition: 'all 0.3s ease',
            }}>
                <h3 style={{ color: '#fff', fontWeight: 900, fontSize: 20, margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>{server.name}</h3>
                <span style={{ color: '#ccc', fontSize: 11, fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{eggName}</span>
            </div>

            {/* HOVER: Stats overlay que aparece */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 5,
                background: 'rgba(15, 17, 16, 0.92)',
                display: 'flex', flexDirection: 'column',
                padding: '50px 16px 16px 16px',
                gap: 4,
                opacity: hovered ? 1 : 0,
                transition: 'opacity 0.3s ease',
                pointerEvents: hovered ? 'auto' : 'none',
            }}>
                {/* Name */}
                <h3 style={{ color: '#fff', fontWeight: 900, fontSize: 16, margin: 0, marginBottom: 6 }}>{server.name}</h3>

                {/* IP */}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#1a201c', border: '1px solid #2c3530', borderRadius: 999, padding: '5px 12px', width: 'fit-content', marginBottom: 8 }}>
                    <Icon.Globe size={11} color="#2ecc71" />
                    <span style={{ color: '#bbb', fontSize: 10, fontFamily: 'monospace' }}>{alloc}</span>
                </span>

                {/* CPU */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#ccc' }}>
                        <Icon.Cpu size={12} color="#2ecc71" /> Cpu: {cpuPct}%
                    </div>
                    <ProgressBar value={stats?.cpuUsagePercent || 0} max={server.limits.cpu || 200} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#666', fontWeight: 700, marginTop: 1 }}>
                        <span>0%</span><span>{cpuLimit}</span>
                    </div>
                </div>

                {/* RAM */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#ccc' }}>
                        <Icon.Server size={12} color="#2ecc71" /> Ram: {ramStr}
                    </div>
                    <ProgressBar value={stats?.memoryUsageInBytes || 0} max={server.limits.memory * 1024 * 1024 || 4000000000} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#666', fontWeight: 700, marginTop: 1 }}>
                        <span>0 GB</span><span>{ramLimit}</span>
                    </div>
                </div>

                {/* DISK */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#ccc' }}>
                        <Icon.HardDrive size={12} color="#2ecc71" /> Disk: {diskStr}
                    </div>
                    <ProgressBar value={stats?.diskUsageInBytes || 0} max={server.limits.disk * 1024 * 1024 || 10000000000} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#666', fontWeight: 700, marginTop: 1 }}>
                        <span>0 GB</span><span>{diskLimit}</span>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                    <button onClick={(e) => { e.preventDefault(); sendPower('start'); }} style={{ flex: 1, padding: '5px 0', borderRadius: 999, border: '1px solid #2ecc71', background: 'transparent', color: '#2ecc71', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>▶ START</button>
                    <button onClick={(e) => { e.preventDefault(); sendPower('restart'); }} style={{ flex: 1, padding: '5px 0', borderRadius: 999, border: '1px solid #2ecc71', background: 'transparent', color: '#2ecc71', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>↻ RESTART</button>
                </div>
                <Link to={`/server/${server.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 0', borderRadius: 10, background: 'linear-gradient(135deg, #27ae60, #2ecc71)', color: '#0d120f', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>Manage Server</Link>
            </div>
        </div>
    );

    /* ---- Listen to layout changes ---- */
    const [currentLayout, setCurrentLayout] = useState(() => document.body.getAttribute('data-arix-layout') || localStorage.getItem('arix-layout') || 'row');
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setCurrentLayout(document.body.getAttribute('data-arix-layout') || 'row');
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-arix-layout'] });
        return () => observer.disconnect();
    }, []);

    return (
        <>
            {isFirstCardRef.current && <LayoutManager />}
            {currentLayout === 'row' && renderRow()}
            {currentLayout === 'grid' && renderGrid()}
            {currentLayout === 'compact' && renderCompact()}
        </>
    );
};

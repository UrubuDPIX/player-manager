import React, { useEffect, useRef, useState } from 'react';
import tw, { styled } from 'twin.macro';
import * as Icon from 'react-feather';
import { Link } from 'react-router-dom';
import { Server } from '@/api/server/getServer';
import Spinner from '@/components/elements/Spinner';
import { bytesToString, ip } from '@/lib/formatters';
import getServerResourceUsage, { ServerPowerState, ServerStats } from '@/api/server/getServerResourceUsage';
import http from '@/api/http';

const ArixCard = styled.div`
    ${tw`relative flex flex-col xl:flex-row w-full bg-[#161a18] rounded-[20px] overflow-hidden mb-6`}
    border: 1px solid #1e2822;
    transition: all 0.3s ease;
    min-height: 180px;
    padding: 1.5rem;

    &:hover {
        border-color: #2ecc71;
        box-shadow: 0 0 25px rgba(46, 204, 113, 0.08);
    }
`;

const ServerImage = styled.div<{ $bg: string }>`
    ${tw`w-32 h-32 rounded-2xl flex-shrink-0 bg-gray-800 bg-center bg-cover bg-no-repeat relative`}
    ${({ $bg }) => `background-image: ${$bg};`}
    box-shadow: 0 8px 20px rgba(0,0,0,0.5);
    
    &::after {
        content: '';
        ${tw`absolute inset-0 rounded-2xl`}
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
    }
`;

const ProgressBar = ({ value, max, color = '#2ecc71' }: { value: number, max: number, color?: string }) => {
    const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
    return (
        <div css={tw`w-full bg-[#1e2521] rounded-full h-1.5 mt-2 overflow-hidden`}>
            <div style={{ width: \`\${percent}%\`, backgroundColor: color }} css={tw`h-full rounded-full shadow-[0_0_10px_rgba(46,204,113,0.8)]`} />
        </div>
    );
};

const ActionButton = styled.button<{ $type?: 'start' | 'restart' | 'stop' }>`
    ${tw`flex items-center justify-center gap-2 px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all`}
    background: transparent;
    border: 1px solid ${({ $type }) => $type === 'stop' ? '#e74c3c' : '#2ecc71'};
    color: ${({ $type }) => $type === 'stop' ? '#e74c3c' : '#2ecc71'};
    flex: 1;

    &:hover {
        background: ${({ $type }) => $type === 'stop' ? 'rgba(231, 76, 60, 0.15)' : 'rgba(46, 204, 113, 0.15)'};
        transform: translateY(-1px);
    }
    &:active {
        transform: translateY(1px);
    }
`;

const ManageButton = styled(Link)`
    ${tw`w-full flex items-center justify-center py-2.5 rounded-xl text-sm font-bold text-[#0d120f] transition-all mt-4`}
    background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    box-shadow: 0 4px 15px rgba(46, 204, 113, 0.25);

    &:hover {
        opacity: 0.9;
        box-shadow: 0 6px 20px rgba(46, 204, 113, 0.4);
        transform: translateY(-1px);
    }
`;

const StatusPill = styled.div<{ $status: ServerPowerState | undefined }>`
    ${tw`absolute top-5 right-5 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-[#1a201c] border border-[#2c3530]`}
    color: ${({ $status }) => 
        !$status || $status === 'offline' ? '#e74c3c' : 
        $status === 'running' ? '#2ecc71' : '#f1c40f'
    };
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);

    &::before {
        content: '';
        ${tw`w-2 h-2 rounded-full`}
        background-color: currentColor;
        box-shadow: 0 0 8px currentColor;
        ${({ $status }) => $status === 'running' && tw`animate-pulse`}
    }
`;

type Timer = ReturnType<typeof setInterval>;

export default ({ server, className }: { server: Server; className?: string }) => {
    const getEggBackground = (server: any) => {
        if (server.bgImage) return \`url(\${server.bgImage})\`;
        const eggStr = [
            server.name, server.description,
            server.eggName, server.egg_name, 
            server.egg?.name, server.egg,
            server.nestName, server.nest_name, 
            server.nest?.name, server.nest,
            server.dockerImage, server.invocation
        ].filter(Boolean).join(' ').toLowerCase();
        if (eggStr.includes('minecraft') || eggStr.includes('java') || eggStr.includes('modpack') || eggStr.includes('forge') || eggStr.includes('paper') || eggStr.includes('spigot') || eggStr.includes('moon')) {
            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-minecraft.png)';
        }
        if (eggStr.includes('fivem') || eggStr.includes('gta') || eggStr.includes('redm')) {
            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-fivem.jpg)';
        }
        if (eggStr.includes('node') || eggStr.includes('js')) {
            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-nodejs.jpg)';
        }
        if (eggStr.includes('python') || eggStr.includes('bot') || eggStr.includes('discord')) {
            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-python.jpg)';
        }
        if (eggStr.includes('lavalink') || eggStr.includes('music')) {
            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/bg-music.png)';
        }
        return '';
    };
    const eggBg = getEggBackground(server);

    const interval = useRef<Timer>(null) as React.MutableRefObject<Timer>;
    const [isSuspended, setIsSuspended] = useState(server.status === 'suspended');
    const [stats, setStats] = useState<ServerStats | null>(null);

    const getStats = () =>
        getServerResourceUsage(server.uuid)
            .then((data) => setStats(data))
            .catch((error) => console.error(error));

    useEffect(() => {
        setIsSuspended(stats?.isSuspended || server.status === 'suspended');
    }, [stats?.isSuspended, server.status]);

    useEffect(() => {
        if (isSuspended) return;
        getStats().then(() => {
            interval.current = setInterval(() => getStats(), 30000);
        });
        return () => {
            interval.current && clearInterval(interval.current);
        };
    }, [isSuspended]);

    const sendPowerCommand = (command: 'start' | 'restart') => {
        http.post(\`/api/client/servers/\${server.uuid}/power\`, { signal: command }).catch(console.error);
    };

    return (
        <ArixCard className={className}>
            <StatusPill $status={stats?.status}>
                {stats?.status || 'OFFLINE'}
            </StatusPill>
            
            <div css={tw`flex flex-col xl:flex-row w-full gap-8`}>
                
                {/* 1. EGG INFO COLUMN */}
                <div css={tw`flex flex-row items-center xl:items-start gap-5 xl:w-[35%]`}>
                    <ServerImage $bg={eggBg} />
                    <div css={tw`flex flex-col justify-center h-full py-1`}>
                        <h3 css={tw`text-2xl font-black text-white mb-1 tracking-tight`}>{server.name}</h3>
                        <p css={tw`text-xs font-semibold text-gray-400 mb-3`}>{server.eggName || 'Minecraft Server'}</p>
                        <div css={tw`flex gap-2 mb-3`}>
                            <span css={tw`px-2.5 py-1 rounded bg-[#1e2521] text-[#2ecc71] text-[10px] font-black border border-[#2c3530] uppercase tracking-wider`}>
                                {server.eggName?.split(' ')[0] || 'SERVER'}
                            </span>
                        </div>
                        <div css={tw`flex items-center gap-2 px-3.5 py-2 bg-[#1a201c] rounded-full border border-[#2c3530]`}>
                            <Icon.Globe size={13} color="#2ecc71" />
                            <span css={tw`text-[11px] font-bold text-gray-300 tracking-wide`}>
                                IP: {server.allocations.filter(a => a.isDefault).map(a => \`\${a.alias || ip(a.ip)}:\${a.port}\`)[0]}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. CPU & RAM COLUMN */}
                <div css={tw`flex flex-col justify-center gap-6 xl:w-[30%]`}>
                    {/* CPU */}
                    <div>
                        <div css={tw`flex justify-between items-center mb-1`}>
                            <div css={tw`flex items-center gap-2 text-[13px] font-bold text-gray-200`}>
                                <Icon.Cpu size={15} color="#2ecc71" />
                                Cpu : {stats?.cpuUsagePercent?.toFixed(2) || '0.00'}%
                            </div>
                        </div>
                        <ProgressBar value={stats?.cpuUsagePercent || 0} max={server.limits.cpu || 200} />
                        <div css={tw`flex justify-between text-[11px] text-gray-400 font-bold mt-2`}>
                            <span>0%</span>
                            <span>{server.limits.cpu > 0 ? \`\${server.limits.cpu}%\` : '∞'}</span>
                        </div>
                    </div>

                    {/* RAM */}
                    <div>
                        <div css={tw`flex justify-between items-center mb-1`}>
                            <div css={tw`flex items-center gap-2 text-[13px] font-bold text-gray-200`}>
                                <Icon.Server size={15} color="#2ecc71" />
                                Ram : {bytesToString(stats?.memoryUsageInBytes || 0)}
                            </div>
                        </div>
                        <ProgressBar value={stats?.memoryUsageInBytes || 0} max={server.limits.memory * 1024 * 1024 || 4000000000} />
                        <div css={tw`flex justify-between text-[11px] text-gray-400 font-bold mt-2`}>
                            <span>0 GB</span>
                            <span>{server.limits.memory > 0 ? \`\${(server.limits.memory / 1024).toFixed(2)} GB\` : '∞'}</span>
                        </div>
                    </div>
                </div>

                {/* 3. DISK & ACTIONS COLUMN */}
                <div css={tw`flex flex-col justify-center gap-4 xl:w-[35%]`}>
                    {/* DISK */}
                    <div css={tw`mb-1`}>
                        <div css={tw`flex justify-between items-center mb-1`}>
                            <div css={tw`flex items-center gap-2 text-[13px] font-bold text-gray-200`}>
                                <Icon.HardDrive size={15} color="#2ecc71" />
                                DISK : {bytesToString(stats?.diskUsageInBytes || 0)}
                            </div>
                        </div>
                        <ProgressBar value={stats?.diskUsageInBytes || 0} max={server.limits.disk * 1024 * 1024 || 10000000000} />
                        <div css={tw`flex justify-between text-[11px] text-gray-400 font-bold mt-2`}>
                            <span>0 GB</span>
                            <span>{server.limits.disk > 0 ? \`\${(server.limits.disk / 1024).toFixed(2)} GB\` : '∞'}</span>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div css={tw`flex justify-between gap-4 mt-2`}>
                        <ActionButton onClick={(e) => { e.preventDefault(); sendPowerCommand('start'); }}>
                            <Icon.Play size={14} /> START
                        </ActionButton>
                        <ActionButton onClick={(e) => { e.preventDefault(); sendPowerCommand('restart'); }}>
                            <Icon.RefreshCw size={14} /> RESTART
                        </ActionButton>
                    </div>

                    <ManageButton to={\`/server/\${server.id}\`}>
                        Manage Server
                    </ManageButton>
                </div>

            </div>
        </ArixCard>
    );
};

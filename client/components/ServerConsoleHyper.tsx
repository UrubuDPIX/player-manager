import React, { memo, useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import Can from '@/components/elements/Can';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import isEqual from 'react-fast-compare';
import Spinner from '@/components/elements/Spinner';
import Features from '@feature/Features';
import Console from '@/components/server/console/Console';
import StatGraphs from '@/components/server/console/StatGraphs';
import PowerButtons from '@/components/server/console/PowerButtons';
import { Alert } from '@/components/elements/alert';
import tw, { styled } from 'twin.macro';
import { bytesToString, ip as formatIp, mbToBytes } from '@/lib/formatters';
import getServerResourceUsage, { ServerPowerState, ServerStats } from '@/api/server/getServerResourceUsage';
import * as Icon from 'react-feather';
import useSWR from 'swr';
import http from '@/api/http';
import { formatDistanceToNow } from 'date-fns';

const StatusIndicator = styled.div<{ $status: ServerPowerState | undefined }>`
    ${tw`w-2 h-2 rounded-full mr-2`};
    ${(props) => (!props.$status || props.$status === 'offline' ? tw`bg-red-500` : props.$status === 'running' ? tw`bg-green-500` : tw`bg-yellow-500`)};
`;

// Widget components for Activity
const ActivityLogWidget = () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { data, error } = useSWR(`/api/client/servers/${uuid}/activity`, async (url) => {
        const { data } = await http.get(url);
        return data.data; // assuming paginated response
    });

    if (!data) return <div className="p-4 text-center text-gray-400"><Spinner size={'small'} /></div>;

    return (
        <div className="flex flex-col space-y-2 p-2">
            {data.slice(0, 3).map((activity: any, index: number) => (
                <div key={index} className="flex flex-col bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                    <div className="flex items-center text-xs text-gray-300 mb-1">
                        <Icon.User className="w-3 h-3 mr-1" />
                        <span className="font-semibold text-gray-100 mr-2">{activity.attributes.user?.username || 'System'}</span>
                        <span className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded text-[10px]">
                            {activity.attributes.event}
                        </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                        {activity.attributes.properties?.useragent || 'No details'}
                    </p>
                    <span className="text-[10px] text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(activity.attributes.timestamp), { addSuffix: true })}
                    </span>
                </div>
            ))}
        </div>
    );
};

const ServerConsoleHyper = () => {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const name = server.name;
    const description = server.description;
    const isInstalling = ServerContext.useStoreState((state) => state.server.isInstalling);
    const isTransferring = server.isTransferring;
    const eggFeatures = server.eggFeatures;
    const isNodeUnderMaintenance = server.isNodeUnderMaintenance;
    
    const [stats, setStats] = useState<ServerStats | null>(null);
    const status = ServerContext.useStoreState((state) => state.status.value);

    // Fetch stats for the header widget
    useEffect(() => {
        const interval = setInterval(() => {
            getServerResourceUsage(server.uuid).then((data) => setStats(data)).catch(() => setStats(null));
        }, 5000);
        getServerResourceUsage(server.uuid).then((data) => setStats(data)).catch(() => setStats(null));
        return () => clearInterval(interval);
    }, [server.uuid]);

    const cpuLimit = server.limits.cpu === 0 ? 100 : server.limits.cpu;
    const ramLimit = server.limits.memory === 0 ? 0 : server.limits.memory;
    const diskLimit = server.limits.disk === 0 ? 0 : server.limits.disk;

    const cpuPercent = stats ? ((stats.cpuUsage / cpuLimit) * 100).toFixed(2) : '0.00';
    const ramPercent = stats && ramLimit > 0 ? ((stats.memoryUsageInBytes / mbToBytes(ramLimit)) * 100).toFixed(2) : '0.00';
    const diskPercent = stats && diskLimit > 0 ? ((stats.diskUsageInBytes / mbToBytes(diskLimit)) * 100).toFixed(2) : '0.00';

    const getEggBg = () => {
        const eggStr = [server.eggName, server.egg_name, server.name, server.description, server.nestName].join(' ').toLowerCase();
        if (eggStr.includes('minecraft') || eggStr.includes('java') || eggStr.includes('paper') || eggStr.includes('forge') || eggStr.includes('spigot')) {
            return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-minecraft.png';
        }
        if (eggStr.includes('fivem') || eggStr.includes('redm') || eggStr.includes('gta')) {
            return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-fivem.jpg';
        }
        if (eggStr.includes('node') || eggStr.includes('js') || eggStr.includes('discord')) {
            return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-node.jpg';
        }
        if (eggStr.includes('python') || eggStr.includes('bot')) {
            return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-python.jpg';
        }
        return 'https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-minecraft.png';
    };

    return (
        <ServerContentBlock title={'Workspace'} showFlashKey={'console:events'}>
            {(isNodeUnderMaintenance || isInstalling || isTransferring) && (
                <Alert type={'warning'} className={'mb-4'}>
                    {isNodeUnderMaintenance
                        ? 'The node of this server is currently under maintenance and all actions are unavailable.'
                        : isInstalling
                        ? 'This server is currently running its installation process and most actions are unavailable.'
                        : 'This server is currently being transferred to another node and all actions are unavailable.'}
                </Alert>
            )}

            {/* Hyper Workspace Header */}
            <div className="mb-4">
                <div className="flex items-center mb-2">
                    <Icon.Grid className="w-5 h-5 mr-2 text-indigo-400" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-50">Workspace</h1>
                        <p className="text-xs text-gray-400">Build your own server overview from widgets.</p>
                    </div>
                </div>
            </div>

            {/* Large Server Card Widget */}
            <div className="bg-gray-800 border border-indigo-500/30 rounded-xl mb-4 overflow-hidden shadow-lg shadow-indigo-900/10 flex flex-col md:flex-row relative">
                {/* Background glow overlay */}
                <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: `url(${getEggBg()})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(8px)' }} />
                
                {/* Left: Info */}
                <div className="p-4 flex items-center w-full md:w-1/3 z-10 border-b md:border-b-0 md:border-r border-gray-700/50">
                    <div className="w-16 h-16 rounded-lg shadow-md bg-gray-900 border border-gray-700 overflow-hidden shrink-0 mr-4">
                        <img src={getEggBg()} alt="Server Bg" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-50">{name}</h2>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 mb-2 inline-block">
                            {server.eggName || 'SERVER'}
                        </span>
                        <div className="flex items-center text-xs text-gray-400 bg-gray-900/50 px-2 py-1 rounded-full border border-gray-700/50 w-max">
                            <Icon.Share2 className="w-3 h-3 mr-1 text-indigo-400" />
                            IP : {server.allocations.filter(a => a.isDefault).map(a => formatIp(a.alias || a.ip) + ':' + a.port).join(', ')}
                        </div>
                    </div>
                </div>

                {/* Middle: CPU/RAM */}
                <div className="p-4 flex flex-col justify-center w-full md:w-1/3 z-10 border-b md:border-b-0 md:border-r border-gray-700/50 space-y-3">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="flex items-center text-gray-300"><Icon.Cpu className="w-3 h-3 mr-1 text-indigo-400" /> Cpu : {stats ? cpuPercent : '0.00'}%</span>
                        </div>
                        <div className="w-full bg-gray-900 rounded-full h-1.5 border border-gray-700/50 overflow-hidden">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(parseFloat(cpuPercent), 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                            <span>0%</span>
                            <span>{cpuLimit === 100 ? 'No Limit' : `${cpuLimit}%`}</span>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="flex items-center text-gray-300"><Icon.HardDrive className="w-3 h-3 mr-1 text-indigo-400" /> Ram : {stats ? bytesToString(stats.memoryUsageInBytes) : '0 MB'}</span>
                        </div>
                        <div className="w-full bg-gray-900 rounded-full h-1.5 border border-gray-700/50 overflow-hidden">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(parseFloat(ramPercent), 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                            <span>0 GB</span>
                            <span>{ramLimit === 0 ? 'No Limit' : bytesToString(mbToBytes(ramLimit))}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Disk & Controls */}
                <div className="p-4 flex flex-col justify-between w-full md:w-1/3 z-10">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="flex items-center text-gray-300"><Icon.Database className="w-3 h-3 mr-1 text-indigo-400" /> DISK : {stats ? bytesToString(stats.diskUsageInBytes) : '0 MB'}</span>
                            <div className="flex items-center bg-gray-900/80 px-2 py-0.5 rounded-full border border-gray-700">
                                <StatusIndicator $status={status} />
                                <span className="text-[10px] uppercase font-bold text-gray-300">{status || 'OFFLINE'}</span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-900 rounded-full h-1.5 border border-gray-700/50 overflow-hidden">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(parseFloat(diskPercent), 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                            <span>0 GB</span>
                            <span>{diskLimit === 0 ? 'No Limit' : bytesToString(mbToBytes(diskLimit))}</span>
                        </div>
                    </div>

                    <div className="flex space-x-2 mt-4 self-end">
                        <Can action={['control.start', 'control.stop', 'control.restart']} matchAny>
                            <PowerButtons className="flex space-x-2" />
                        </Can>
                    </div>
                </div>
            </div>

            {/* Config Bar */}
            <div className="flex items-center justify-between bg-gray-800/80 border border-gray-700/50 rounded-lg p-3 mb-4 backdrop-blur">
                <div className="flex space-x-2">
                    <button className="flex items-center px-3 py-1.5 text-xs text-gray-300 bg-gray-900 hover:bg-gray-700 rounded-md border border-gray-600 transition">
                        <Icon.Download className="w-3 h-3 mr-1" /> Export
                    </button>
                    <button className="flex items-center px-3 py-1.5 text-xs text-gray-300 bg-gray-900 hover:bg-gray-700 rounded-md border border-gray-600 transition">
                        <Icon.Upload className="w-3 h-3 mr-1" /> Import
                    </button>
                </div>
                <div className="flex space-x-2">
                    <button className="flex items-center px-3 py-1.5 text-xs text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-md border border-green-500/50 transition">
                        <Icon.Edit2 className="w-3 h-3 mr-1" /> Edit Mode
                    </button>
                    <button className="flex items-center px-3 py-1.5 text-xs text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-md border border-indigo-500/50 transition">
                        <Icon.Layers className="w-3 h-3 mr-1" /> Components
                    </button>
                    <button className="flex items-center px-3 py-1.5 text-xs text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-md border border-purple-500/50 transition">
                        <Icon.Save className="w-3 h-3 mr-1" /> Save As Preset
                    </button>
                </div>
            </div>

            {/* Main Console & Widgets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {/* Left: Console Window */}
                <div className="lg:col-span-2 flex flex-col bg-gray-800/80 border border-indigo-500/30 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between p-2 bg-gray-900/50 border-b border-gray-700/50">
                        <div className="flex items-center space-x-2">
                            <span className="flex items-center px-2 py-1 text-xs text-green-400 bg-green-500/10 rounded-full border border-green-500/30">
                                <Icon.Menu className="w-3 h-3 mr-1" /> Wrap
                            </span>
                            <span className="flex items-center px-2 py-1 text-xs text-gray-300 bg-gray-800 rounded-full border border-gray-600">
                                - <span className="mx-2">13px</span> +
                            </span>
                        </div>
                        <div className="flex space-x-2 text-indigo-400">
                            <Icon.Square className="w-4 h-4 cursor-pointer hover:text-indigo-300" />
                            <Icon.Copy className="w-4 h-4 cursor-pointer hover:text-indigo-300" />
                            <Icon.ExternalLink className="w-4 h-4 cursor-pointer hover:text-indigo-300" />
                            <Icon.Maximize2 className="w-4 h-4 cursor-pointer hover:text-indigo-300" />
                        </div>
                    </div>
                    {/* Console Output Area (Styled within Pterodactyl's native Console component) */}
                    <div className="flex-1 relative min-h-[350px]">
                        <Spinner.Suspense>
                            <Console />
                        </Spinner.Suspense>
                    </div>
                </div>

                {/* Right: Info Widgets */}
                <div className="lg:col-span-1 flex flex-col space-y-4">
                    {/* Big Action Buttons (Like Hyper) */}
                    <div className="grid grid-cols-2 gap-3">
                         <Can action={['control.start', 'control.stop', 'control.restart']} matchAny>
                            <PowerButtons className="flex space-x-2 w-full [&>button]:flex-1" />
                        </Can>
                    </div>

                    {/* Server Info Chips */}
                    <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center bg-gray-800/80 border border-gray-700 rounded-lg p-3">
                            <div className="bg-indigo-500/20 p-2 rounded-lg mr-3">
                                <Icon.Wifi className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-100 text-sm">{server.allocations.filter(a => a.isDefault).map(a => formatIp(a.alias || a.ip) + ':' + a.port).join(', ')}</h3>
                                <p className="text-xs text-indigo-400">Address</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center bg-gray-800/80 border border-gray-700 rounded-lg p-3">
                                <div className="bg-purple-500/20 p-2 rounded-lg mr-2">
                                    <Icon.Server className="w-4 h-4 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-100 text-xs truncate max-w-[80px]">{server.node}</h3>
                                    <p className="text-[10px] text-purple-400">Node</p>
                                </div>
                            </div>
                            <div className="flex items-center bg-gray-800/80 border border-gray-700 rounded-lg p-3">
                                <div className="bg-green-500/20 p-2 rounded-lg mr-2">
                                    <Icon.Hash className="w-4 h-4 text-green-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-100 text-xs">{server.id}</h3>
                                    <p className="text-[10px] text-green-400">Server ID</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity Log Widget */}
                    <div className="bg-gray-800/80 border border-gray-700 rounded-lg overflow-hidden flex-1 flex flex-col">
                        <div className="flex justify-between items-center bg-gray-900/50 p-2 border-b border-gray-700/50">
                            <span className="flex items-center text-xs font-bold text-gray-300">
                                <Icon.Activity className="w-3 h-3 mr-1 text-indigo-400" /> Activity Log
                            </span>
                            <span className="text-[10px] text-indigo-400 cursor-pointer hover:underline">View all →</span>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[250px]">
                            <ActivityLogWidget />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Graph Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Spinner.Suspense>
                    <StatGraphs />
                </Spinner.Suspense>
            </div>
            
            <Features enabled={eggFeatures} />
        </ServerContentBlock>
    );
};

export default memo(ServerConsoleHyper, isEqual);

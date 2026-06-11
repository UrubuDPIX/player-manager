import http from '@/api/http';
import axios from 'axios';

export interface UserCacheEntry {
  name: string;
  uuid: string;
  expiresOn: string;
}

export const getUserCache = async (uuid: string): Promise<UserCacheEntry[]> => {
  try {
    const { data } = await http.get(`/api/client/servers/${uuid}/files/contents`, {
      params: { file: 'usercache.json' },
    });
    
    // Sometimes the data comes as a string, sometimes as JSON depending on axios parsing
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    
    return data;
  } catch (error) {
    console.error('Failed to fetch usercache.json:', error);
    return [];
  }
};

export const getPlayerDataUrl = async (uuid: string, playerUuid: string, worldName: string = 'world'): Promise<string> => {
  const { data } = await http.get(`/api/client/servers/${uuid}/files/download`, {
    params: { file: `${worldName}/playerdata/${playerUuid}.dat` },
  });
  
  return data.attributes.url;
};

export const getPlayerStats = async (uuid: string, playerUuid: string, worldName: string = 'world'): Promise<any> => {
  try {
    const { data } = await http.get(`/api/client/servers/${uuid}/files/contents`, {
      params: { file: `${worldName}/stats/${playerUuid}.json` },
    });
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    console.error('Failed to get player stats:', error);
    return null;
  }
};

export const listPlayerData = async (uuid: string, worldName: string = 'world'): Promise<{ files: any[], serverTime: number }> => {
  try {
    const res = await http.get(`/api/client/servers/${uuid}/files/list`, {
      params: { directory: `${worldName}/playerdata` },
    });
    const serverTime = res.headers.date ? new Date(res.headers.date).getTime() : Date.now();
    return { files: res.data.data, serverTime };
  } catch (error) {
    console.error('Failed to list playerdata:', error);
    return { files: [], serverTime: Date.now() };
  }
};

export const sendCommand = async (uuid: string, command: string): Promise<void> => {
  await http.post(`/api/client/servers/${uuid}/command`, { command });
};

export const getServerLog = async (uuid: string): Promise<string> => {
  try {
    const { data } = await http.get(`/api/client/servers/${uuid}/files/contents`, {
      params: { file: 'logs/latest.log' },
      responseType: 'text'
    });
    return typeof data === 'string' ? data : '';
  } catch (error) {
    console.error('Failed to fetch latest.log:', error);
    return '';
  }
};

export const uploadFile = async (uuid: string, directory: string, fileName: string, fileContent: Blob | Buffer | Uint8Array): Promise<void> => {
  try {
    const { data } = await http.get(`/api/client/servers/${uuid}/files/upload`);
    const uploadUrl = data.attributes.url;

    const formData = new FormData();
    const fileBlob = fileContent instanceof Blob ? fileContent : new Blob([fileContent], { type: 'application/octet-stream' });
    formData.append('files', fileBlob, fileName);

    await axios.post(`${uploadUrl}&directory=${encodeURIComponent(directory)}`, formData);
  } catch (error) {
    console.error('Failed to upload file:', error);
    throw error;
  }
};

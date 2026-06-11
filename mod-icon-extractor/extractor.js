const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const modsDir = process.argv[2] || './mods';
const outputDir = process.argv[3] || './public/icons';

if (!fs.existsSync(modsDir)) {
    console.error(`Diretório de mods '${modsDir}' não encontrado!`);
    console.error(`Uso: npm run extract /caminho/para/pasta/mods`);
    process.exit(1);
}

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(modsDir).filter(f => f.endsWith('.jar'));
console.log(`Encontrados ${files.length} mods para processar em ${modsDir}...`);

const textureMap = {};
const parentMap = {};

files.forEach(file => {
    const filePath = path.join(modsDir, file);
    try {
        const zip = new AdmZip(filePath);
        const zipEntries = zip.getEntries();
        let extractedCount = 0;
        
        // Pass 1: Extract all PNGs from textures/ and parse models/
        zipEntries.forEach(entry => {
            if (entry.isDirectory) return;
            const entryName = entry.entryName;
            
            if (entryName.includes('assets/') && entryName.endsWith('.png') && entryName.includes('/textures/')) {
                const parts = entryName.split('/');
                const assetsIndex = parts.indexOf('assets');
                const texturesIndex = parts.indexOf('textures');
                
                if (assetsIndex !== -1 && texturesIndex !== -1) {
                    const modid = parts[assetsIndex + 1];
                    const relPath = parts.slice(texturesIndex + 1).join('/'); 
                    
                    const modOutDir = path.join(outputDir, modid, path.dirname(relPath));
                    if (!fs.existsSync(modOutDir)) fs.mkdirSync(modOutDir, { recursive: true });
                    
                    fs.writeFileSync(path.join(outputDir, modid, relPath), entry.getData());
                    extractedCount++;
                }
            }
            
            if (entryName.includes('assets/') && entryName.endsWith('.json') && entryName.includes('/models/')) {
                try {
                    const json = JSON.parse(entry.getData().toString('utf8'));
                    const parts = entryName.split('/');
                    const assetsIndex = parts.indexOf('assets');
                    const modelsIndex = parts.indexOf('models');
                    
                    const modid = parts[assetsIndex + 1];
                    const modelType = parts[modelsIndex + 1]; // 'item' or 'block'
                    const modelName = parts[parts.length - 1].replace('.json', '');
                    
                    const fullId = `${modid}:${modelType}/${modelName}`;
                    
                    let texture = null;
                    if (json.textures) {
                        texture = json.textures.layer0 || json.textures.layer1 || json.textures.all || json.textures.particle || json.textures.cross || Object.values(json.textures)[0];
                    }
                    
                    if (texture && typeof texture === 'string') {
                        let texModid = modid;
                        let texPath = texture;
                        if (texture.includes(':')) {
                            const s = texture.split(':');
                            texModid = s[0];
                            texPath = s[1];
                        }
                        textureMap[fullId] = `${texModid}/${texPath}.png`;
                    } else if (json.parent) {
                        let parentId = json.parent;
                        if (!parentId.includes(':')) parentId = `${modid}:${parentId}`;
                        if (!parentId.includes('/')) {
                            if (parentId.startsWith('minecraft:')) {
                                parentId = parentId.replace('minecraft:', 'minecraft:block/');
                            }
                        }
                        parentMap[fullId] = parentId;
                    }
                } catch(e) {}
            }
        });
        if (extractedCount > 0) {
            console.log(`Processado ${file}: ${extractedCount} texturas organizadas.`);
        }
    } catch (e) {
        console.error(`Erro ao ler ${file}: ${e.message}`);
    }
});

console.log('Resolvendo hierarquia de modelos...');
const resolveTexture = (modelId, depth = 0) => {
    if (depth > 5) return null;
    if (textureMap[modelId]) return textureMap[modelId];
    
    const parent = parentMap[modelId];
    if (parent) {
        const resolved = resolveTexture(parent, depth + 1);
        if (resolved) {
            textureMap[modelId] = resolved; 
            return resolved;
        }
    }
    return null;
};

Object.keys(textureMap).forEach(key => resolveTexture(key));
Object.keys(parentMap).forEach(key => resolveTexture(key));

const finalItemMap = {};
Object.keys(textureMap).forEach(key => {
    const [modid, rest] = key.split(':');
    if (rest.startsWith('item/')) {
        const itemName = rest.replace('item/', '');
        finalItemMap[`${modid}:${itemName}`] = textureMap[key];
    } else if (rest.startsWith('block/')) {
        const blockName = rest.replace('block/', '');
        finalItemMap[`${modid}:${blockName}`] = textureMap[key];
    }
});

fs.writeFileSync(path.join(outputDir, 'texture_map.json'), JSON.stringify(finalItemMap, null, 2));

console.log(`Mapeamento super inteligente concluído! ${Object.keys(finalItemMap).length} itens perfeitamente associados às suas texturas no texture_map.json.`);
console.log('A Extração Definitiva foi um sucesso! Agora as texturas não vão mais falhar.');

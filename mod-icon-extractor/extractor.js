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

files.forEach(file => {
    const filePath = path.join(modsDir, file);
    try {
        const zip = new AdmZip(filePath);
        const zipEntries = zip.getEntries();
        
        let extractedCount = 0;
        zipEntries.forEach(entry => {
            // Verifica se é uma textura de item (ou bloco que também seja usado como item)
            if (!entry.isDirectory && entry.entryName.includes('assets/') && entry.entryName.endsWith('.png') && (entry.entryName.includes('/textures/item/') || entry.entryName.includes('/textures/block/'))) {
                const parts = entry.entryName.split('/');
                const assetsIndex = parts.indexOf('assets');
                
                if (assetsIndex !== -1 && parts.length > assetsIndex + 1) {
                    const modid = parts[assetsIndex + 1];
                    let fileName = parts[parts.length - 1];
                    
                    const modOutDir = path.join(outputDir, modid);
                    if (!fs.existsSync(modOutDir)) fs.mkdirSync(modOutDir, { recursive: true });
                    
                    fs.writeFileSync(path.join(modOutDir, fileName), entry.getData());
                    extractedCount++;
                }
            }
        });
        if (extractedCount > 0) {
            console.log(`Extraídas ${extractedCount} texturas de ${file}`);
        }
    } catch (e) {
        console.error(`Erro ao ler ${file}: ${e.message}`);
    }
});

console.log('Extração concluída com sucesso!');
console.log('Execute "npm start" para ligar o servidor de imagens.');

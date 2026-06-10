const http = require('http');
const https = require('https');

const urls = [
    'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.1/items/birch_button.png',
    'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.1/blocks/birch_button.png',
    'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.1/assets/minecraft/textures/item/birch_button.png',
    'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.1/assets/minecraft/textures/block/birch_button.png',
    'https://minecraft-api.vercel.app/api/items/birch_button',
    'https://api.modrinth.com/v2/project/birch_button/icon',
    'https://minecraft-api.com/api/items/birch_button',
    'https://mcapi.net/api/image/item/birch_button',
];

urls.forEach(url => {
    https.get(url, (res) => {
        console.log(`[${res.statusCode}] ${url}`);
    }).on('error', (err) => {
        console.log(`[ERR] ${url}`);
    });
});

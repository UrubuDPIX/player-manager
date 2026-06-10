const https = require('https');

const urls = [
    'https://nmsr.nickac.dev/api/render/fullbody/42cdf406-d4d0-498e-9927-6603208dc85c',
    'https://nmsr.nickac.dev/fullbody/42cdf406-d4d0-498e-9927-6603208dc85c',
    'https://nmsr.nickac.dev/api/fullbody/42cdf406-d4d0-498e-9927-6603208dc85c',
];

urls.forEach(url => {
    https.get(url, (res) => {
        console.log(`[${res.statusCode}] ${url}`);
    }).on('error', (err) => {
        console.log(`[ERR] ${url}`);
    });
});

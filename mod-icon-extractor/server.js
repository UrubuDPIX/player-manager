const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve the extracted icons directory
app.use('/icons', express.static(path.join(__dirname, 'public/icons')));

// Add a default fallback texture if image is not found
app.use('/icons/*', (req, res) => {
    // If the specific icon wasn't found, you can return a default transparent image or 404
    res.status(404).send('Not found');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`🚀 Servidor de ícones rodando com sucesso!`);
    console.log(`URL Base: http://localhost:${PORT}/icons`);
    console.log(`Coloque essa URL base nas configurações ou no código.`);
    console.log(`=============================================`);
});

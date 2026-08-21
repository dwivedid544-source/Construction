const fs = require('fs');
const path = require('path');

const modelsDir = __dirname;
const loadedModels = {};

fs.readdirSync(modelsDir).forEach(file => {
    if (file !== 'index.js' && file.endsWith('.js')) {
        try {
            const model = require(path.join(modelsDir, file));
            const modelName = file.replace(/\.(model\.)?js$/, '');
            loadedModels[modelName] = model;
        } catch (e) {
            console.error(`[Models] Error preloading ${file}:`, e.message);
        }
    }
});

module.exports = loadedModels;

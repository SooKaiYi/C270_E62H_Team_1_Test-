const fs = require('fs/promises');
const path = require('path');

const dataDirectory = path.join(__dirname, '..', 'data');

function getDataPath(fileName) {
    return path.join(dataDirectory, fileName);
}

async function readJson(fileName, fallbackValue = []) {
    try {
        const fileContent = await fs.readFile(getDataPath(fileName), 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return fallbackValue;
        }

        console.error(`Unable to read ${fileName}:`, error.message);
        throw new Error('Unable to load local data. Please try again.');
    }
}

async function writeJson(fileName, data) {
    try {
        await fs.mkdir(dataDirectory, { recursive: true });
        const fileContent = JSON.stringify(data, null, 4);
        await fs.writeFile(getDataPath(fileName), `${fileContent}\n`, 'utf8');
    } catch (error) {
        console.error(`Unable to write ${fileName}:`, error.message);
        throw new Error('Unable to save local data. Please try again.');
    }
}

module.exports = {
    readJson,
    writeJson
};

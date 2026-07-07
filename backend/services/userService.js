const { readJson } = require('./jsonFileService');

async function findUserByEmail(email) {
    const users = await readJson('users.json');
    const normalizedEmail = String(email || '').trim().toLowerCase();

    return users.find((user) => user.email.toLowerCase() === normalizedEmail) || null;
}

module.exports = {
    findUserByEmail
};

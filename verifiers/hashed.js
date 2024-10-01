const bycrypt = require("bcrypt");

const saltRounds = 10;

async function hashingPassword(orgPassword)
{
    return bycrypt.hash(orgPassword, saltRounds);
}

module.exports =
{
    hashingPassword
};
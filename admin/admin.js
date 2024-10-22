const mysql = require('mysql2/promise');
const bycrypt = require('bcrypt');
const config = require("../config/db/moveout.js");
const hashed = require("../verifiers/hashed.js")

async function createAdminAccountIfNotExists()
{
    const db = await mysql.createConnection(config);
    const adminEmail = 'moveoutthomas@gmail.com';
    const adminPassword = 'MoveOut123!'
    //Problem med procedures använd direkta commando nu men ändra till procedure sen
    const [rows] = await db.query('SELECT email FROM register WHERE email = ?', [adminEmail]);

    if(rows.length === 0)
    {
        const hashedPassword = await hashed.hashingPassword(adminPassword);
        const sql = `INSERT INTO register (email, user_password, verified, is_active, is_admin) VALUES (?, ?, TRUE, TRUE, TRUE)`;
        await db.query(sql, [adminEmail, hashedPassword]);
        console.log('admin account was created');
    }
    else{
        console.log('Admin account already exists')
    }
}

createAdminAccountIfNotExists();

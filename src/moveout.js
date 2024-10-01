"use strict";
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const bcrypt = require('bcrypt');

// Load configuration from eshop.json
const config = require("../config/db/eshop.json");
const hashed = require("../verifiers/hashed.js")

// Check if SSL is enabled and the CA certificate is specified
if (config.ssl && config.ssl.ca) {
    // Resolve the correct path to the CA certificate and read its content
    config.ssl.ca = fs.readFileSync(path.join(__dirname, '../', config.ssl.ca));
}

require("console.table");

// Function to register a new user in the database
async function registerUser(data, verificationToken) {
    const db = await mysql.createConnection(config);
    let sql = `CALL user_register_data(?, ?, ?)`;
    const hashedPassword = await hashed.hashingPassword(data.f_user_password);
    await db.query(sql, [data.f_email, hashedPassword, verificationToken]);
    await db.end();
}



async function userVerificationByToken(verificationToken)
{
    const db = await mysql.createConnection(config);
    let sql = `CALL user_verification_by_token(?)`
    await db.query(sql, [verificationToken]);
    await db.end();
}


async function userLogIn(email, userPassword)
{
   /*  console.log("being callaed UserLogin");
    console.log("user password;", userPassword)
    console.log("Email:", email); */
    let db;
    try {
        //console.log("helllllo");
        db = await mysql.createConnection(config);
        const sql = `CALL retrieve_hashed_password(?)`;
        const [rows, fields] = await db.execute(sql, [email]);
        const hashedPassword = rows[0][0].user_password;
        console.log("Hashedpassword", hashedPassword);
        if (!hashedPassword) {
            return { success: false, message: "Invalid email or password" };
        }

        const isPasswordMatched = await bcrypt.compare(userPassword, hashedPassword);
        //console.log("ispasswordmatched", isPasswordMatched);
        if (isPasswordMatched) {
            return { success: true, message: "Successful login" };
        } else {
            return { success: false, message: "Invalid email or password" };
        }
    } catch (error) {
        console.error("Error during user login:", error);
        throw error; // Propagate the error for further handling
    } finally {
        // Ensure the database connection is closed
        if (db && db.end) await db.end();
    }
}

async function isEmailVerified(email)
{
    //console.log("isemialverfied is called");
    let db;
    try{
        db = await mysql.createConnection(config);
        let sql = `CALL is_email_verified(?)`
        const [rows, fields] = await db.execute(sql, [email]);
        const isEmailVerified = rows[0][0].verified;
        //console.log("Email Verified:", isEmailVerified);
        if(isEmailVerified)
        {
            return {success: true, message: "Email is verified"};
        }
        else{
            return {success: false, message: "Email is not verified"};
        }

    } catch (error) {
        throw error; // Propagate the error for further handling
    } finally {
        // Ensure the database connection is closed
        if (db && db.end) await db.end();
    }
}



async function isEmailReg(registerEmail) {
    const errors = {};
    let db;
    try {
        db = await mysql.createConnection(config);
        await db.query('CALL check_email_exists(?, @exists)', [registerEmail]);
        const [rows] = await db.query('SELECT @exists AS email_exists');
        if (rows[0].email_exists) {
            errors.ifEmailReg = 'An account already exists with this email';
        }

    } catch (error) {
        errors.general = 'error occurred, isEmailReg';
    }
    finally {
        // Säkerställ att databaskopplingen stängs
        if (db && db.end) await db.end();
    }
    return errors;
}



module.exports = {
    "registerUser": registerUser,
    userVerificationByToken,
    userLogIn,
    isEmailVerified,
    isEmailReg
};

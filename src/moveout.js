"use strict";
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const bcrypt = require('bcrypt');


const config = require("../config/db/moveout.js");
const hashed = require("../verifiers/hashed.js")

// Check if SSL is enabled and the CA certificate is specified
if (config.ssl && config.ssl.ca) {
    // Resolve the correct path to the CA certificate and read its content
    config.ssl.ca = fs.readFileSync(path.join(__dirname, '../', config.ssl.ca));
}

require("console.table");


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


/* async function insert_info_qr_code(email, userInput)
{
    const db = await mysql.createConnection(config);
    let sql = `CALL insert_to_qr_code(?, ?, ?, ?)`

    let textContent = null;
    let imagePath = null;
    let audioPath = null;
    console.log("async userInput :", userInput);
    console.log("async userInput.f_text_content :", userInput.f_text_content);
    //lägg till fler statements för imagePath och audioPath.
    //Just nu så testar jag bara för textContent.
    if(userInput.textContent)
    {
        textContent = userInput.textContent;
    }

    const [rows] = await db.query(sql, [email, textContent, imagePath, audioPath]);
    const labelId = rows[0][0].label_id;
    await db.end();

    return labelId;
}
 */

// moveout.js
async function insert_info_qr_code(email, textContent) {
    const db = await mysql.createConnection(config);
    let sql = `CALL insert_to_qr_code(?, ?)`;

    // Execute the stored procedure and get the label_id.
    const [rows] = await db.query(sql, [email, textContent]);
    const labelId = rows[0][0].label_id;
    await db.end();

    return labelId;
}

async function get_label_by_id(labelId) {
    const db = await mysql.createConnection(config);
    const sql = `SELECT * FROM qr_code_labels WHERE label_id = ?`;

    const [rows] = await db.query(sql, [labelId]);
    await db.end();

    return rows[0];
}


module.exports = {
    "registerUser": registerUser,
    userVerificationByToken,
    userLogIn,
    isEmailVerified,
    isEmailReg,
    insert_info_qr_code,
    get_label_by_id
};

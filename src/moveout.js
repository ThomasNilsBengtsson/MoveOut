"use strict";
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const bcrypt = require('bcrypt');


const config = require("../config/db/moveout.js");
const hashed = require("../verifiers/hashed.js")


if (config.ssl && config.ssl.ca) {

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

    let db;
    try {
    
        db = await mysql.createConnection(config);
        const sql = `CALL retrieve_hashed_password(?)`;
        const [rows, fields] = await db.execute(sql, [email]);
        const hashedPassword = rows[0][0].user_password;
        console.log("Hashedpassword", hashedPassword);
        if (!hashedPassword) {
            return { success: false, message: "Invalid email or password" };
        }

        const isPasswordMatched = await bcrypt.compare(userPassword, hashedPassword);
       
        if (isPasswordMatched) {
            return { success: true, message: "Successful login" };
        } else {
            return { success: false, message: "Invalid email or password" };
        }
    } catch (error) {
        console.error("Error during user login:", error);
        throw error; 
    } finally {
      
        if (db && db.end) await db.end();
    }
}

async function isEmailVerified(email)
{
  
    let db;
    try{
        db = await mysql.createConnection(config);
        let sql = `CALL is_email_verified(?)`
        const [rows, fields] = await db.execute(sql, [email]);
        const isEmailVerified = rows[0][0].verified;
        async function markLabelAsUnverified(email) {
            const db = await mysql.createConnection(config);
            const sql = `CALL get_labels_by_user(?)`;
            const [rows] = await db.query(sql, [email]);
            await db.end();
            return rows[0][0];
        }
        
        if(isEmailVerified)
        {
            return {success: true, message: "Email is verified"};
        }
        else{
            return {success: false, message: "Email is not verified"};
        }

    } catch (error) {
        throw error; 
    } finally {
      
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
       
        if (db && db.end) await db.end();
    }
    return errors;
}



async function insert_info_qr_code(email, textContent, imagePath, audioPath, isLabelPrivate) {
    const db = await mysql.createConnection(config);
    const sql = `CALL insert_to_qr_code(?, ?, ?, ?, ?)`;

    
    const [rows] = await db.query(sql, [email, textContent, imagePath, audioPath, isLabelPrivate ]);
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


async function insert_verification_code_label(labelId, verificationCode)
{
    const db = await mysql.createConnection(config);
    const sql = `CALL insert_label_verification_code(?, ?)`;
    await db.query(sql,[labelId, verificationCode]);
    await db.end();
}



async function is_user_label_code_verified(labelId, verificationCode) {
    const db = await mysql.createConnection(config);
    const sql = `CALL validate_verification_code_label(?, ?)`;

    let [rows] = await db.query(sql, [labelId, verificationCode]);
    await db.end();

    if (rows && rows[0] && rows[0][0]) {
        const count = rows[0][0]['result']; 
        return count > 0;
    } else {
        return false;
    }
}


async function markLabelAsVerified(labelId) {
    const db = await mysql.createConnection(config);
    const sql = `CALL user_verified_label_code(?)`;
    await db.query(sql, [labelId]);
    await db.end();
}

async function markLabelAsUnverified(labelId) {
    const db = await mysql.createConnection(config);
    const sql = `CALL unverify_user_code_label(?)`;
    await db.query(sql, [labelId]);
    await db.end();
}

async function getSpecificLabelByUser(labelId, email) {
    const db = await mysql.createConnection(config);
    const sql = `CALL get_specific_label_by_user(?, ?)`;
    const [rows] = await db.query(sql, [labelId, email]);
    await db.end();
    return rows[0][0];
}


async function getLabelsByUser(email) {
    const db = await mysql.createConnection(config);
    const sql = `CALL get_labels_by_user(?)`;
    const [rows] = await db.query(sql, [email]);
    await db.end();
    return rows[0];
}

async function deleteLabel(labelId) {
    const db = await mysql.createConnection(config);
    const sql = `CALL delete_label(?)`;
    
   
    const [rows] = await db.query(sql, [labelId]);
    await db.end();
    
    if (rows && rows[0] && rows[0].message) {
        return rows[0].message;
    } else {
        return 'No message returned from procedure.';
    }
}



async function updateLabel(labelId, { text_content, image_path, audio_path, is_label_private }) {
    const db = await mysql.createConnection(config);
    const sql = `CALL update_label(?, ?, ?, ?, ?)`;
    const [result] = await db.query(sql, [
        labelId,
        text_content,
        JSON.stringify(image_path),
        JSON.stringify(audio_path), 
        is_label_private
    ]);
    await db.end();
    return result;
}



module.exports = {
    "registerUser": registerUser,
    userVerificationByToken,
    userLogIn,
    isEmailVerified,
    isEmailReg,
    insert_info_qr_code,
    get_label_by_id,
    insert_verification_code_label,
    is_user_label_code_verified,
    markLabelAsVerified,
    markLabelAsUnverified,
    getSpecificLabelByUser,
    getLabelsByUser,
    deleteLabel,
    updateLabel
    
};

"use strict";
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const bcrypt = require('bcrypt');
const qrFunctions = require("../utils/generateQR.js");
const { getTotalStorageUsed } = require('../utils/userStorageData.js');
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

async function insertGoogleRegister(email, password, verify, googleAccount) {
    const db = await mysql.createConnection(config);
    let sql = `CALL insert_google_register(?, ?, ?)`;
    await db.query(sql, [email, password, verify, googleAccount]);
    await db.end();
}


async function isGoogleRegistered(email) {
    const db = await mysql.createConnection(config);
    let sql = `CALL is_google_registered(?)`;
    const [results] = await db.query(sql, [email]);
    await db.end();
    if (results && results[0]) {
        const googleRegistered = results[0].google_registered;
        return googleRegistered === 1;
    } else {
        return false;
    }
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

       
        if (!rows[0] || !rows[0][0]) {
            return { success: false, message: "Invalid email or password" };
        }

        const hashedPassword = rows[0][0].user_password;
       
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

async function isAdmin(email) {
    const db = await mysql.createConnection(config);
    let sql = `CALL get_admin_status(?)`;
    const [rows] = await db.query(sql, [email]);
    await db.end();
   if (rows && rows[0] && rows[0].length > 0) {
    return rows[0][0].is_admin === 1;
}
return false; 
    return false;
}

async function isEmailVerified(email)
{
  
    let db;
    try{
        db = await mysql.createConnection(config);
        let sql = `CALL is_email_verified(?)`
        const [rows, fields] = await db.execute(sql, [email]);

        const isEmailVerified = rows[0][0].verified;
        

        if(isEmailVerified)
        {
            return {success: true, message: "Email is verified"};
        }
        else{
            console.log("errrror");
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

async function check_if_label_name_exists(email, labelName) {
    const db = await mysql.createConnection(config);
    try {
        const checkLabelName = `CALL check_if_label_name_exists(?, ?)`;
        const [existingLabel] = await db.query(checkLabelName, [labelName, email]);

        if (existingLabel && existingLabel[0] && existingLabel[0][0]) {
            const count = existingLabel[0][0]["label_count"];
            return count > 0; 
        }
        return false;
    } finally {
        await db.end(); 
    }
}

async function insert_info_qr_code(email, labelName, textContent, imagePath, audioPath, isLabelPrivate) {
    const db = await mysql.createConnection(config);
    const sql = `CALL insert_to_qr_code(?, ?, ?, ?, ?, ?)`;

    
    const [rows] = await db.query(sql, [email, labelName, textContent, imagePath, audioPath, isLabelPrivate ]);
    const labelId = rows[0][0].label_id;
    await db.end();

    return labelId;
}

async function getLabelIdByName(labelName, email) {
    const db = await mysql.createConnection(config);
    const sql = `CALL get_label_id_by_name(?, ?)`;
    const [rows] = await db.query(sql, [labelName, email]);
    await db.end();
    return rows[0];
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
        image_path,
        audio_path, 
        is_label_private
    ]);
    await db.end();
    return result;
}

async function shareLabel(labelId, labelName, senderEmail, recipientEmail, backgroundImagePath) {

        const db = await mysql.createConnection(config);
        const sql = `CALL share_label(?, ?, ?, ?, ?)`;
        await db.query(sql, [labelId, labelName, senderEmail, recipientEmail, backgroundImagePath]);
        await db.end();
}

async function getSharedLabels(recipientEmail) {
    const db = await mysql.createConnection(config);
    const [rows] = await db.query('CALL get_shared_labels(?)', [recipientEmail]);
    await db.end();
    return rows[0]; 
}

async function deleteSharedLabel(sharedId) {
    const db = await mysql.createConnection(config);
    try {
        await db.query('CALL delete_shared_label(?)', [sharedId]);
    } finally {
        await db.end();
    }
}

async function acceptSharedLabel(sharedId, recipientEmail) {
    const db = await mysql.createConnection(config);
    try {
       
        const [rows] = await db.query('CALL get_shared_label_details(?)', [sharedId]);
        const sharedLabel = rows[0][0];  

        if (!sharedLabel) {
            throw new Error('Shared label not found.');
        }

       
        let imagePaths = [];
        let audioPaths = [];
        if (sharedLabel.image_path) {
            if (typeof sharedLabel.image_path === 'string') {
                try {
                    let parsedPaths = JSON.parse(sharedLabel.image_path);
        
                    if (Array.isArray(parsedPaths) && Array.isArray(parsedPaths[0])) {
                        parsedPaths = parsedPaths.flat();
                    }
        
                    imagePaths = parsedPaths;
                } catch (e) {
                    console.error('Error parsing image path:', e);
                    if (sharedLabel.image_path.startsWith('/')) {
                        imagePaths = [sharedLabel.image_path];
                    } else {
                        console.error('Invalid image path format:', sharedLabel.image_path);
                    }
                }
            } else if (Array.isArray(sharedLabel.image_path)) {
                imagePaths = sharedLabel.image_path;
            } else {
                console.error('Unexpected format for image path:', sharedLabel.image_path);
            }
        }
        if (sharedLabel.audio_path) {
            if (typeof sharedLabel.audio_path === 'string') {
                try {
                    let parsedPaths = JSON.parse(sharedLabel.audio_path);
        
                    if (Array.isArray(parsedPaths) && Array.isArray(parsedPaths[0])) {
                        parsedPaths = parsedPaths.flat();
                    }
                    audioPaths = parsedPaths;
                } catch (e) {
                    console.error('Error parsing audio path:', e);
                    if (sharedLabel.audio_path.startsWith('/')) {
                        audioPaths = [sharedLabel.audio_path];
                    } else {
                        console.error('Invalid audio path format:', sharedLabel.audio_path);
                    }
                }
            } else if (Array.isArray(sharedLabel.audio_path)) {
                audioPaths = sharedLabel.audio_path;
            } else {
                console.error('Unexpected format for audio path:', sharedLabel.audio_path);
            }
        }
     
        const baseDir = path.resolve(__dirname, '../public');
        const recipientImageDir = path.join(baseDir, 'uploads', 'images', recipientEmail);
        const recipientAudioDir = path.join(baseDir, 'uploads', 'audio', recipientEmail);

        
        if (!fs.existsSync(recipientImageDir)) {
            fs.mkdirSync(recipientImageDir, { recursive: true });
        }
        if (!fs.existsSync(recipientAudioDir)) {
            fs.mkdirSync(recipientAudioDir, { recursive: true });
        }

        let newImagePaths = [];
        let newAudioPaths = [];

        for (const imagePath of imagePaths) {
            if (typeof imagePath === 'string') {
                const oldImagePath = path.join(baseDir, imagePath);
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const newImagePath = path.join('uploads', 'images', recipientEmail, uniqueSuffix + path.extname(imagePath));
                const targetImagePath = path.join(baseDir, newImagePath);
                fs.copyFileSync(oldImagePath, targetImagePath);
                newImagePaths.push('/' + newImagePath);
            }
        }

        for (const audioPath of audioPaths) {
            if (typeof audioPath === 'string') {
                const oldAudioPath = path.join(baseDir, audioPath);
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const newAudioPath = path.join('uploads', 'audio', recipientEmail, uniqueSuffix + path.extname(audioPath));
                const targetAudioPath = path.join(baseDir, newAudioPath);
                fs.copyFileSync(oldAudioPath, targetAudioPath);
                newAudioPaths.push('/' + newAudioPath);
            }
        }

        if (Array.isArray(newImagePaths) && Array.isArray(newImagePaths[0])) {
            newImagePaths = newImagePaths.flat();
        }
        if (Array.isArray(newAudioPaths) && Array.isArray(newAudioPaths[0])) {
            newAudioPaths = newAudioPaths.flat();
        }
        
        const imagePathsJson = JSON.stringify(newImagePaths).replace(/\\/g, '');
        const audioPathsJson = JSON.stringify(newAudioPaths).replace(/\\/g, '');
        
        const[result] = await db.query('CALL accept_shared_label(?, ?, ?, ?, ?, ?, ?)', [
            recipientEmail,
            sharedLabel.label_name,
            sharedLabel.text_content,
            imagePathsJson,
            audioPathsJson,
            sharedLabel.content_type,
            sharedLabel.background_image_path 
        ]);

        const newLabelId = result[0][0].newLabelId;
        const newLabelName = result[0][0].newLabelName;
        const backgroundImagePath = result[0][0].backgroundImagePath;

        return {
            newLabelId,
            newLabelName,
            backgroundImagePath
        };

    } catch (error) {
        console.error('Error accepting shared label:', error);
    } finally {
        await db.end();
    }
}

async function doesEmailExist(email) {
    let db;
    try {
        db = await mysql.createConnection(config);

        const [rows] = await db.query('CALL check_email_exists(?, @exists)', [email]);
        const [result] = await db.query('SELECT @exists AS email_exists');
        return result.length > 0 && result[0].email_exists === 1;

    } catch (error) {
        console.error('Error checking email existence:', error);
        return false; 
    } finally {
        if (db && db.end) await db.end();
    }
}

async function deactivateAccount(email)
{
    const db = await mysql.createConnection(config);
    const sql = `CALL deactivate_account(?)`;
    const [rows] = await db.query(sql, [email]);

    if (rows[0].account_that_deactivated === 0)
    {
        throw new Error('No account with this email was found');
    }

    await db.end();
}

async function accountDeactivationStatus(email)
{
    const db = await mysql.createConnection(config);
    await db.query('CALL account_deactivation_status(?, @account_status)', [email]);
    const [rows] = await db.query('SELECT @account_status AS is_active');
    await db.end();
    return rows[0].is_active === 1;
 
}

async function deleteAccount(email)
{
    const db = await mysql.createConnection(config);
    const sql = `CALL delete_user_account(?)`;
    await db.query(sql, [email]);

    const baseDir = path.resolve(__dirname, '../public');

    const userImageDir = path.join(baseDir, 'uploads/images', email);
    const userAudioDir = path.join(baseDir, 'uploads/audio', email);
    const userLabelsDir = path.join(baseDir, 'labels', email);

    function deleteDirectory(dirPath) {
        if (fs.existsSync(dirPath)) {
            fs.readdirSync(dirPath).forEach((file) => {
                const currentPath = path.join(dirPath, file);
                if (fs.lstatSync(currentPath).isDirectory()) {
                    deleteDirectory(currentPath);
                } else {
                    fs.unlinkSync(currentPath);
                }
            });
            fs.rmdirSync(dirPath); 
        }
    }
    deleteDirectory(userImageDir);
    deleteDirectory(userAudioDir);
    deleteDirectory(userLabelsDir);
}

async function insertDeleteToken(email, deleteToken, deleteTokenExpires)
{
    const db = await mysql.createConnection(config);
    const sql = `CALL insert_delete_token(?, ?, ?)`;
    await db.query(sql, [email, deleteToken, deleteTokenExpires]);
    await db.end();
}

async function verifyDeleteToken(token) {
    const db = await mysql.createConnection(config);
    const sql = `CALL verify_delete_token(?)`;
    const [rows] = await db.query(sql, [token]);

    await db.end();

    if (rows.length > 0 && rows[0].length > 0) {
        return rows[0][0].email;
    } else {
        return null; 
    }

}

async function updateLastLogin(email) {
    const db = await mysql.createConnection(config);
    const sql = `CALL update_last_login(?)`;
    await db.query(sql, [email]);
    await db.end();
}

async function getInactiveUsers() {
    const db = await mysql.createConnection(config);
    const [rows] = await db.query('CALL get_inactive_users()');
    return rows[0];  
}

async function getAllUsers()
{
    const db = await mysql.createConnection(config);
    const [rows] = await db.query('CALL get_all_users()');
    await db.end();
    return rows[0];
}

async function getNonAdminUsers() {
    const db = await mysql.createConnection(config);
    const sql = 'CALL get_non_admin_users()';
    const [rows] = await db.query(sql);
    await db.end();
    return rows[0];
}

async function accountActivationToggle(email, isActive) {
    
        const db = await mysql.createConnection(config);
        let query;
        if (isActive) {
            query = 'CALL activate_account(?)';
        } else {
            query = 'CALL deactivate_account(?)';
        }
        await db.query(query, [email]);
        await db.end();

}

async function getUsersWithStorageData() {
    const db = await mysql.createConnection(config);
    const sql = 'CALL get_non_admin_users()';
    const [users] = await db.query(sql);
    await db.end();

    for (const user of users[0]) {
        user.total_storage_used = await getTotalStorageUsed(user.email); 
    }

    return users[0];
}

async function updateBackgroundImage(labelId, email, backgroundImagePath) {
    const db = await mysql.createConnection(config);
   
    const sql = `CALL update_background_image(?, ?, ?)`;
    await db.query(sql, [labelId, email, backgroundImagePath]);

    await db.end();
}

async function getBackgroundImage(labelId, email) {
    const db = await mysql.createConnection(config);

    const sql = `CALL get_background_image(?, ?)`;
    const [rows] = await db.query(sql, [labelId, email]);

    if (rows[0].length === 0) {
        throw new Error('No label with this label ID and email was found.');
    }

    const backgroundImagePath = rows[0][0].background_image_path;
    await db.end();
    return backgroundImagePath;

}

async function updateLabelFilePaths(labelId, image_path, audio_path) {
    const db = await mysql.createConnection(config);
    const sql = `CALL update_label_file_paths(?, ?, ?)`;
    const [result] = await db.query(sql, [labelId, image_path, audio_path]);
    await db.end();
    return result;
}

module.exports = {
    "registerUser": registerUser,
    insertGoogleRegister,
    isGoogleRegistered,
    userVerificationByToken,
    userLogIn,
    isAdmin,
    isEmailVerified,
    isEmailReg,
    check_if_label_name_exists,
    insert_info_qr_code,
    getLabelIdByName,
    get_label_by_id,
    insert_verification_code_label,
    is_user_label_code_verified,
    markLabelAsVerified,
    markLabelAsUnverified,
    getSpecificLabelByUser,
    getLabelsByUser,
    deleteLabel,
    updateLabel,
    shareLabel,
    getSharedLabels,
    deleteSharedLabel,
    acceptSharedLabel,
    doesEmailExist,
    deactivateAccount,
    accountDeactivationStatus,
    deleteAccount,
    insertDeleteToken,
    verifyDeleteToken,
    updateLastLogin,
    getInactiveUsers,
    getAllUsers,
    getNonAdminUsers,
    accountActivationToggle,
    getUsersWithStorageData,
    updateBackgroundImage,
    getBackgroundImage,
    updateLabelFilePaths
};

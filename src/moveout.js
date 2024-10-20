"use strict";
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const bcrypt = require('bcrypt');
const qrFunctions = require("../utils/generateQR.js");

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

        // Check if the email exists in the database
        if (!rows[0] || !rows[0][0]) {
            return { success: false, message: "Invalid email or password" };
        }

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

/* async function isUserExists(email) {
    let db;
    try {
        // Create a database connection
        db = await mysql.createConnection(config);

        // Define the SQL query to use the existing stored procedure
        const sql = `CALL check_email_exists(?)`;
        
        // Execute the SQL query
        const [rows, fields] = await db.execute(sql, [email]);
        
        // Check if a user was found
        if (rows[0] && rows[0][0]) {
            return { success: true, message: "User exists" };
        } else {
            return { success: false, message: "User not found" };
        }

    } catch (error) {
        console.error("Error during user existence check:", error);
        throw error;  // Throwing the error to be caught by the caller
    } finally {
        // Ensure the database connection is closed
        if (db && db.end) await db.end();
    }
} */



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

        console.log("Existing label result: ", existingLabel); // Log to verify the structure

        if (existingLabel && existingLabel[0] && existingLabel[0][0]) {
            const count = existingLabel[0][0]["label_count"];
            return count > 0; // Returns true if the label name exists, false otherwise
        }
        return false; // If no data is found, the label does not exist
    } finally {
        await db.end(); // Ensure the database connection is closed
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
        JSON.stringify(image_path),
        JSON.stringify(audio_path), 
        is_label_private
    ]);
    await db.end();
    return result;
}

async function shareLabel(labelId, labelName, senderEmail, recipientEmail) {

        const db = await mysql.createConnection(config);
        const sql = `CALL share_label(?, ?, ?, ?)`;
        await db.query(sql, [labelId, labelName, senderEmail, recipientEmail]);
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
        // Step 1: Get the shared label information
        const [rows] = await db.query('CALL get_shared_label_details(?)', [sharedId]);
        const sharedLabel = rows[0][0];  // Assuming the procedure returns the shared label details

        if (!sharedLabel) {
            throw new Error('Shared label not found.');
        }

        // Parse image and audio paths if they exist
        let imagePaths = [];
        let audioPaths = [];

        if (sharedLabel.image_path) {
            try {
                // Try to parse as JSON array
                imagePaths = JSON.parse(sharedLabel.image_path);
            } catch (e) {
                // If parsing fails, assume it's a single path
                imagePaths = [sharedLabel.image_path];
            }
        }

        if (sharedLabel.audio_path) {
            try {
                // Try to parse as JSON array
                audioPaths = JSON.parse(sharedLabel.audio_path);
            } catch (e) {
                // If parsing fails, assume it's a single path
                audioPaths = [sharedLabel.audio_path];
            }
        }

        // Generate new paths for User B using the same logic from Multer
        const baseDir = path.resolve(__dirname, '../public');
        const recipientImageDir = path.join(baseDir, 'uploads', 'images', recipientEmail);
        const recipientAudioDir = path.join(baseDir, 'uploads', 'audio', recipientEmail);

        // Ensure user directories exist
        if (!fs.existsSync(recipientImageDir)) {
            fs.mkdirSync(recipientImageDir, { recursive: true });
        }
        if (!fs.existsSync(recipientAudioDir)) {
            fs.mkdirSync(recipientAudioDir, { recursive: true });
        }

        // Copy files and generate new paths
        let newImagePaths = [];
        let newAudioPaths = [];

        if (imagePaths.length > 0) {
            imagePaths.forEach(imagePath => {
                const oldImagePath = path.join(baseDir, imagePath);
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const newImagePath = path.join('uploads', 'images', recipientEmail, uniqueSuffix + path.extname(imagePath));
                const targetImagePath = path.join(baseDir, newImagePath);
                fs.copyFileSync(oldImagePath, targetImagePath);
                newImagePaths.push('/' + newImagePath);
            });
        }

        if (audioPaths.length > 0) {
            audioPaths.forEach(audioPath => {
                const oldAudioPath = path.join(baseDir, audioPath);
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const newAudioPath = path.join('uploads', 'audio', recipientEmail, uniqueSuffix + path.extname(audioPath));
                const targetAudioPath = path.join(baseDir, newAudioPath);
                fs.copyFileSync(oldAudioPath, targetAudioPath);
                newAudioPaths.push("/" + newAudioPath);
            });
        }

        // Insert the new label record into the qr_code_labels table for User B
        const[result] = await db.query('CALL accept_shared_label(?, ?, ?, ?, ?, ?)', [
            recipientEmail,
            sharedLabel.label_name,
            sharedLabel.text_content,
            JSON.stringify(newImagePaths),
            JSON.stringify(newAudioPaths),
            sharedLabel.content_type
        ]);

        const newLabelId = result[0][0].newLabelId;
        const newLabelName = result[0][0].newLabelName;


        return {
            newLabelId,
            newLabelName
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
        // Establish database connection
        db = await mysql.createConnection(config);

        const [rows] = await db.query('CALL check_email_exists(?, @exists)', [email]);

        const [result] = await db.query('SELECT @exists AS email_exists');

        return result.length > 0 && result[0].email_exists === 1;

    } catch (error) {
        console.error('Error checking email existence:', error);
        return false; // Assume false if there's an error
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



module.exports = {
    "registerUser": registerUser,
    insertGoogleRegister,
    isGoogleRegistered,
    userVerificationByToken,
    userLogIn,
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
    getInactiveUsers
};

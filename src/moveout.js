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

async function shareLabel(labelId, senderEmail, recipientEmail) {

        const db = await mysql.createConnection(config);
        const sql = `CALL share_label(?, ?, ?)`;
        await db.query(sql, [labelId, senderEmail, recipientEmail]);
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


/* async function acceptSharedLabel(sharedId, recipientEmail) {
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
                newImagePaths.push(newImagePath);
            });
        }

        if (audioPaths.length > 0) {
            audioPaths.forEach(audioPath => {
                const oldAudioPath = path.join(baseDir, audioPath);
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const newAudioPath = path.join('uploads', 'audio', recipientEmail, uniqueSuffix + path.extname(audioPath));
                const targetAudioPath = path.join(baseDir, newAudioPath);
                fs.copyFileSync(oldAudioPath, targetAudioPath);
                newAudioPaths.push(newAudioPath);
            });
        }

        // Insert the new label record into the qr_code_labels table for User B
        await db.query('CALL accept_shared_label(?, ?, ?, ?, ?)', [
            recipientEmail,
            sharedLabel.text_content,
            JSON.stringify(newImagePaths),
            JSON.stringify(newAudioPaths),
            sharedLabel.content_type
        ]);

        console.log('Label accepted successfully.');

    } catch (error) {
        console.error('Error accepting shared label:', error);
    } finally {
        await db.end();
    }
} */


    const fs = require('fs');
    const path = require('path');
    const mysql = require('mysql2/promise');
    const qrFunctions = require('./qrFunctions'); // Assuming this module is where you have your QR code generation logic
    
    async function acceptSharedLabel(sharedId, recipientEmail) {
        const db = await mysql.createConnection(config);
    
        try {
            // Step 1: Get the shared label information
            const [rows] = await db.query('CALL get_shared_label_details(?)', [sharedId]);
            const sharedLabel = rows[0][0];
    
            if (!sharedLabel) {
                throw new Error('Shared label not found.');
            }
            
            // Parse image and audio paths if they exist
            let imagePaths = sharedLabel.image_path ? JSON.parse(sharedLabel.image_path) : [];
            let audioPaths = sharedLabel.audio_path ? JSON.parse(sharedLabel.audio_path) : [];
            
            // Generate new paths for User B
            const baseDir = path.resolve(__dirname, '../public/uploads');
            const userDir = path.join(baseDir, recipientEmail);
            if (!fs.existsSync(userDir)) {
                fs.mkdirSync(userDir, { recursive: true });
            }
            
            // Copy files if necessary
            let newImagePaths = [];
            let newAudioPaths = [];
            
            if (imagePaths.length > 0) {
                imagePaths.forEach(imagePath => {
                    const oldImagePath = path.join(baseDir, imagePath);
                    const newImagePath = path.join('uploads', 'images', recipientEmail, path.basename(imagePath));
                    const targetImagePath = path.join(baseDir, newImagePath);
                    fs.copyFileSync(oldImagePath, targetImagePath);
                    newImagePaths.push(newImagePath);
                });
            }
            
            if (audioPaths.length > 0) {
                audioPaths.forEach(audioPath => {
                    const oldAudioPath = path.join(baseDir, audioPath);
                    const newAudioPath = path.join('uploads', 'audio', recipientEmail, path.basename(audioPath));
                    const targetAudioPath = path.join(baseDir, newAudioPath);
                    fs.copyFileSync(oldAudioPath, targetAudioPath);
                    newAudioPaths.push(newAudioPath);
                });
            }
    
            // Step 3: Insert the new label record into the qr_code_labels table for User B
            const [result] = await db.query('CALL accept_shared_label(?, ?, ?, ?, ?)', [
                recipientEmail,
                sharedLabel.text_content,
                JSON.stringify(newImagePaths),
                JSON.stringify(newAudioPaths),
                sharedLabel.content_type
            ]);
    
            // Step 4: Generate a new QR code for User B's label
            const newLabelId = result.insertId;  // Assuming this gives you the new label ID
            const userLabelsDir = path.join(__dirname, `../public/labels/${recipientEmail}`);
            if (!fs.existsSync(userLabelsDir)) {
                fs.mkdirSync(userLabelsDir, { recursive: true });
            }
    
            let backgroundImagePath = null;
            // Assuming label design is taken from sharedLabel or default to a certain one
            if (sharedLabel.label_design === 'label1') {
                backgroundImagePath = 'public/background-images/label-image-black.png';
            } else if (sharedLabel.label_design === 'label2') {
                backgroundImagePath = 'public/background-images/label-image-yellow.png';
            } else if (sharedLabel.label_design === 'label3') {
                backgroundImagePath = 'public/background-images/label-image-gray.png';
            } else {
                backgroundImagePath = 'public/background-images/label-image-black.png'; // Default design
            }
    
            // Set the QR content with the new label ID for User B
            const qrContent = `https://8c74-2001-6b0-2a-c280-bdc1-f512-44f2-213.ngrok-free.app/label/${newLabelId}?email=${encodeURIComponent(recipientEmail)}`; 
            const qrImagePath = await qrFunctions.overlayQRCodeOnImage(qrContent, backgroundImagePath, recipientEmail, newLabelId);
            
            console.log(`QR Code generated at: ${qrImagePath}`);
    
            console.log('Label accepted successfully.');
    
        } catch (error) {
            console.error('Error accepting shared label:', error);
        } finally {
            await db.end();
        }
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
    updateLabel,
    shareLabel,
    getSharedLabels,
    deleteSharedLabel,
    acceptSharedLabel
};

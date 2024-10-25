const express = require("express");
const router = express.Router();
const moveout = require("../src/moveout.js");
const verify = require("../verifiers/verifiers.js");
const validator = require('validator');
const verifiers = require("../verifiers/verifiers.js");
const emailFunctions = require("../utils/email.js");
const authFunctions = require('../utils/auth.js');
const qrFunctions = require("../utils/generateQR.js");
const login = require("../utils/loginPost.js");
const maxStorageContent = require("../utils/maxFileContentStorageLabel.js");
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { glob } = require('glob'); 
const crypto = require('crypto');
const { title } = require("process");
const isAuthenticated = authFunctions.isAuthenticated;
const isAdmin = authFunctions.isAdmin;




const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        let userDirectory;
      
        if (file.fieldname === "imageContent") {
            userDirectory = path.join(__dirname, `../public/uploads/images/${req.session.email}`);
        } else if (file.fieldname === "audioContent") {
            userDirectory = path.join(__dirname, `../public/uploads/audio/${req.session.email}`);
        } else {
            return cb(new Error('Invalid field name.'), false);
        }

        if (!fs.existsSync(userDirectory)) {
            fs.mkdirSync(userDirectory, { recursive: true });
        }

        cb(null, userDirectory);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function(req, file, cb) {
        if (file.fieldname === 'imageContent' && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else if (file.fieldname === 'audioContent' && file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type or field name.'), false);
        }
    }
});


router.get("/login", (req, res) => {
    let data = {
        error: {},
        title: "Login"
    };

    res.render("pages/login.ejs", data);
});

router.post("/login", async (req, res) => {
    await login.loginPost(req, res);
});

router.get("/register", (req, res) => {
    const data = {
        title: 'Register',
        errors: {},
        formData: {}
    };
    res.render("pages/register.ejs", data);
});

router.post("/register", async (req, res) => {

    const email = req.body.f_email;
    const password = req.body.f_user_password;

    const errorEmail = verify.validateEmail(email);
    const errorPassword = verify.validatePassword(password);
    const isEmailreg = await moveout.isEmailReg(email);
   
    const verificationToken = verify.verificationTokenCreation();

    if(Object.keys(errorEmail).length > 0)
    {
        const data = {
            title: 'Register',
            errors: errorEmail, 
            formData: req.body
        };
        res.render("pages/register.ejs", data);
    }
    else if(Object.keys(errorPassword).length > 0)
    {
        const data = {
            title: 'Register',
            errors: errorPassword, 
            formData: req.body
        };
        res.render("pages/register.ejs", data);
    }
    else if(Object.keys(isEmailreg).length > 0)
    {
        const data = {
            title: 'Register',
            errors: isEmailreg,
            formData: req.body
        };
        res.render("pages/register.ejs", data);
    }
    else
    {
        await moveout.registerUser(req.body, verificationToken);
        res.redirect("/login");

        const verificationLink = `${process.env.BASE_URL}/email-verified?token=${verificationToken}&email=${encodeURIComponent(email)}`;
        await emailFunctions.sendVerificationEmail(email, verificationLink);
    }   
});


router.get("/email-verified", async (req, res) => {
    let data = {};
    data.title = "Verified";

    const verificationToken = req.query.token;
    if(!verificationToken){
        console.log("no token");
    };
    await moveout.userVerificationByToken(verificationToken);
    
    const email = req.query.email;
    await emailFunctions.accountCreationConfirmation(email);
    res.render("pages/email-verified.ejs", data);
});

router.post("/email-verified", async (req, res) => {
  
    res.redirect("/login");
});

router.post("/home", isAuthenticated, async (req, res) => {
    let data = {
        title: "Home",
        email: req.session.email,
    };
   
    let userInput= {
        textContent: null,
        image:null,
        audio: null
    }

    const formType = req.body.formType;

    if(formType === "createLabel")
    {

        const text = "Kitchen items";
        const imagePath = 'public/images/label-image.png';
        const newImage = await qrFunctions.overlayQRCodeOnImage(text, imagePath);
        
        const publicImagePath = '/' + path.relative('public', newImage).replace(/\\/g, '/');
        data.imageUrl = publicImagePath;
    }

    else if(formType === "addText")
    {
    userInput.textContent = req.body.f_text_content;
    await moveout.insert_info_qr_code(req.session.email, userInput);
    }       
    
    res.render('pages/home.ejs', data);
});

router.get("/home", isAuthenticated, async (req, res) => {
    try {
        const directoryPath = path.join(__dirname, `../public/labels/${req.session.email}`);
        const directoryPathAudio = path.join(__dirname, `../public/uploads/audio/${req.session.email}`);
        const directoryPathImage = path.join(__dirname, `../public/uploads/images/${req.session.email}`);
        const labels = await moveout.getLabelsByUser(req.session.email);

        [directoryPath, directoryPathAudio, directoryPathImage].forEach(dirPath => {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                
            }
        });

        fs.readdir(directoryPath, (err, files) => {
            if (err) {
                console.error('Unable to scan directory:', err);
                return res.status(500).send('Unable to display images.');
            }

            const imageFiles = files
                .filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))
                .map(file => {
                    const match = file.match(/^qr_code_(\d+)\.png$/);
                    const label_id = match ? parseInt(match[1], 10) : null;

                    return label_id ? {
                        filePath: `labels/${req.session.email}/${file}`,
                        label_id: label_id
                    } : null;
                })
                .filter(image => image !== null);

            res.render('pages/home.ejs', {
                title: 'Home',
                email: req.session.email,
                images: imageFiles
            });
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.status(500).send('An error occurred while loading the home page.');
    }
});

router.get("/create-label", isAuthenticated, (req, res) => {
    let data = {
        title: "Create label",
        email: req.session.email,
        imageUrl: null
    };
    res.render("pages/create-label.ejs", data);
});

router.post('/create-label', isAuthenticated, upload.fields([
    { name: 'imageContent', maxCount: 1 },
    { name: 'audioContent', maxCount: 1 }
]), async (req, res) => {

    let data = {
        title: "Create label",
        email: req.session.email
    };
   
    const email = req.session.email;
    const contentType = req.body.contentType; 
    const userDirectory = `public/labels/${email}`;
    const isLabelPrivate = req.body.isLabelPrivate === "on";
    const labelName = req.body.labelName;

    let textContent = null;
    let userImagePath = null;
    let userAudioPath = null;

    let imagePaths = [];
    let audioPaths = [];
    let newFiles = [];

    if (contentType === "text") {
        textContent = req.body.textContent;
    } 
    else if (contentType === "image" && req.files.imageContent) {
        const imagePath = `/uploads/images/${email}/` + req.files.imageContent[0].filename;
        imagePaths.push(imagePath);
        newFiles = newFiles.concat(req.files.imageContent); 
    } 
    else if (contentType === "audio" && req.files.audioContent) {
        const audioPath = `/uploads/audio/${email}/` + req.files.audioContent[0].filename;
        audioPaths.push(audioPath);
        newFiles = newFiles.concat(req.files.audioContent); 
    }

    imagePaths = Array.isArray(imagePaths) ? imagePaths.flat() : imagePaths;
    audioPaths = Array.isArray(audioPaths) ? audioPaths.flat() : audioPaths;

    userImagePath = JSON.stringify(imagePaths);
    userAudioPath = JSON.stringify(audioPaths);

    const { exceedsLimit, message } = await maxStorageContent.checkStorageLimit(imagePaths, audioPaths, newFiles);
    if (exceedsLimit) {
        console.log("Storage limit reached");
        return res.status(413).send(message); 
    }

    const labelExists = await moveout.check_if_label_name_exists(email, labelName);
    if (labelExists) {
        return res.status(400).send("Label name must be unique. This label name already exists.");
    }

    const labelId = await moveout.insert_info_qr_code(email, labelName, textContent, userImagePath, userAudioPath, isLabelPrivate);

    let backgroundImagePath = null;
    const selectedLabelDesign = req.body.labelDesign;
    if (selectedLabelDesign === 'label1') {
        backgroundImagePath = 'public/background-images/label-image-flammable.png';
    } else if (selectedLabelDesign === 'label2') {
        backgroundImagePath = 'public/background-images/label-image-heavy.png';
    } else if (selectedLabelDesign === 'label3') {
        backgroundImagePath = 'public/background-images/label-image-fragile.png';
    }
    
    await moveout.updateBackgroundImage(labelId, email, backgroundImagePath);

    const qrContent = `https://575e-2001-6b0-2a-c280-bdc1-f512-44f2-213.ngrok-free.app/label/${labelId}?email=${encodeURIComponent(email)}`; 
    const qrImagePath = await qrFunctions.overlayQRCodeOnImage(qrContent, backgroundImagePath, email, labelId, labelName);
    const publicImagePath = '/' + path.relative('public', qrImagePath).replace(/\\/g, '/');

    data.imageUrl = publicImagePath;

    res.redirect("/home");
});

router.get("/label/:labelId", async (req, res) => {
    const labelId = req.params.labelId;
    const email = req.query.email;

    const label = await moveout.get_label_by_id(labelId);

    if(label.is_label_private)
    {        
        if(!label.is_user_verified)
        {
            let verficationCode = label.verification_code;
            if(!verficationCode)
                {
                   
                    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
                    await moveout.insert_verification_code_label(labelId, verificationCode);
                    await emailFunctions.sendVerificationCodeLabel(email, verificationCode);
                    
                }
                return res.redirect(`/verification-code-label?labelId=${labelId}&email=${encodeURIComponent(email)}`);
            }
            
            await moveout.markLabelAsUnverified(labelId);
    }  
    if (typeof label.audio_path === 'string') {
        try {
            if (label.audio_path.trim().startsWith('[')) {
                label.audio_path = JSON.parse(label.audio_path);
            } else {
                label.audio_path = [label.audio_path];
            }
        } catch (error) {
            console.error('Failed to parse audio_path as JSON:', error);
            label.audio_path = [label.audio_path];
        }
    }

    if (typeof label.image_path === 'string') {
        try {
            if (label.image_path.trim().startsWith('[')) {
                label.image_path = JSON.parse(label.image_path);
            } else {
                label.image_path = [label.image_path];
            }
        } catch (error) {
            console.error('Failed to parse image_path as JSON:', error);
            label.image_path = [label.image_path]; 
        }
    }

    return res.render("pages/label.ejs", {
        title: "Label Details",
        label: label
    }); 
  
});

router.get("/verification-code-label", async (req, res) => {
    const labelId = req.query.labelId;
    const email = req.query.email;

    if (!labelId || !email) {
        return res.status(400).send('Label ID and email are required.');
    }

    res.render("pages/verification-code-label.ejs", {
        title: "Verify Label",
        labelId: labelId,
        email: email
    });
});

router.post("/verification-code-label", async (req, res) => {

    const labelId = req.body.labelId;
    const email = req.body.email;
    const verificationCode = req.body.verificationCode;
    const isValid = await moveout.is_user_label_code_verified(labelId, verificationCode);

    if (isValid) {
        await moveout.markLabelAsVerified(labelId);
        res.redirect(`/label/${labelId}?email=${encodeURIComponent(email)}`);
    } else {
        res.render("pages/verification-code-label.ejs", {
            title: "Verify Label",
            labelId: labelId,
            email: email,
            error: "Invalid verification code. Please try again."
        });
    }

});

router.get('/label/:labelId/edit', isAuthenticated, async (req, res) => {
    try {
        const labelId = req.params.labelId;
        const email = req.session.email;

        const label = await moveout.getSpecificLabelByUser(labelId, email);

        if (!label) {
            return res.status(404).send('Label not found.');
        }

        res.render('pages/edit-label.ejs', {
            title: 'Edit Label',
            email: email,
            label: label
        });
    } catch (error) {
        console.error('Error fetching label for edit:', error);
        res.status(500).send('An error occurred while fetching the label.');
    }
});

router.post('/label/:labelId/edit', isAuthenticated, upload.fields([
    { name: 'imageContent', maxCount: 1 },
    { name: 'audioContent', maxCount: 1 }
]), async (req, res) => {
    try {
        const labelId = req.params.labelId;
        const email = req.session.email;

        const existingLabel = await moveout.getSpecificLabelByUser(labelId, email);

        if (!existingLabel) {
            return res.status(404).send('Label not found.');
        }

        const isLabelPrivate = req.body.isLabelPrivate === 'on';
        let textContent = req.body.textContent !== undefined
            ? req.body.textContent.trim()
            : existingLabel.text_content;

        let imagePaths = [];
        let audioPaths = [];
        let newFiles = [];

        if (existingLabel.image_path && existingLabel.image_path !== 'null') {
            try {
                let parsedPaths = JSON.parse(existingLabel.image_path);
                imagePaths = Array.isArray(parsedPaths) ? parsedPaths.flat() : [parsedPaths];
                imagePaths = imagePaths.flat(); 
            } catch (error) {
                imagePaths = [existingLabel.image_path];
            }
        }
        
        if (existingLabel.audio_path && existingLabel.audio_path !== 'null') {
            try {
                let parsedPaths = JSON.parse(existingLabel.audio_path);
                audioPaths = Array.isArray(parsedPaths) ? parsedPaths.flat() : [parsedPaths];
                audioPaths = audioPaths.flat(); 
            } catch (error) {
                audioPaths = [existingLabel.audio_path];
            }
        }
        
        if (req.files.imageContent) {
            const newImagePaths = req.files.imageContent.map(file => `/uploads/images/${email}/${file.filename}`);
            imagePaths = imagePaths.concat(newImagePaths);
            newFiles = newFiles.concat(req.files.imageContent);
        }

        if (req.files.audioContent) {
            const newAudioPaths = req.files.audioContent.map(file => `/uploads/audio/${email}/${file.filename}`);
            audioPaths = audioPaths.concat(newAudioPaths);
            newFiles = newFiles.concat(req.files.audioContent);
        }

        imagePaths = Array.isArray(imagePaths) ? imagePaths.flat() : imagePaths;
        audioPaths = Array.isArray(audioPaths) ? audioPaths.flat() : audioPaths;

        const imagePathsJson = JSON.stringify(imagePaths);
        const audioPathsJson = JSON.stringify(audioPaths);

        const { exceedsLimit, storageMessage } = await maxStorageContent.checkStorageLimit(imagePaths, audioPaths, newFiles);
        if (exceedsLimit) {
            
            return res.status(413).send(storageMessage);
        }
  
        await moveout.updateLabel(labelId, {
            text_content: textContent,
            image_path: imagePathsJson, 
            audio_path: audioPathsJson, 
            is_label_private: isLabelPrivate
        });

        res.redirect('/home');
    } catch (error) {
        console.error('Error updating label:', error);
        res.status(500).send('An error occurred while updating the label.');
    }
});

router.post('/label/:labelId/delete', isAuthenticated, async (req, res) => {
    console.log('Delete label route hit');
    const labelId = req.params.labelId;
    const email = req.session.email;

    const existingLabel = await moveout.getSpecificLabelByUser(labelId, email);

    if (!existingLabel) {
        return res.status(404).send('Label not found.');
    }

    let imagePaths = [];
    let audioPaths = [];
    if (existingLabel.image_path) {
        try {

            if (typeof existingLabel.image_path === 'string') {
                imagePaths = JSON.parse(existingLabel.image_path);
            } else if (Array.isArray(existingLabel.image_path)) {
                imagePaths = existingLabel.image_path;
            } else {
                console.warn('Unexpected format for image_path:', existingLabel.image_path);
            }
        } catch (error) {
            console.error('Failed to parse image_path as JSON:', error);
        }
    }

    imagePaths = imagePaths.flat();
    
    if (existingLabel.audio_path) {
        try {
          
            if (typeof existingLabel.audio_path === 'string') {
                audioPaths = JSON.parse(existingLabel.audio_path);
            } else if (Array.isArray(existingLabel.audio_path)) {
                audioPaths = existingLabel.audio_path;
            } else {
                console.warn('Unexpected format for audio_path:', existingLabel.audio_path);
            }
        } catch (error) {
            console.error('Failed to parse audio_path as JSON:', error);
        }
    }   
    
    audioPaths = audioPaths.flat();
    for (const imagePath of imagePaths) {
        if (typeof imagePath === 'string') {
            try {
                const fullPath = path.join(__dirname, '..', 'public', imagePath);
                await fs.promises.unlink(fullPath);
                console.log(`Deleted image file: ${fullPath}`);
            } catch (err) {
                console.error(`Failed to delete image file: ${fullPath}`, err);
            }
        }
    }

    for (const audioPath of audioPaths) {
        if (typeof audioPath === 'string') {
            try {
                const fullPath = path.join(__dirname, '..', 'public', audioPath);
                await fs.promises.unlink(fullPath);
                console.log(`Deleted audio file: ${fullPath}`);
            } catch (err) {
                console.error(`Failed to delete audio file: ${fullPath}`, err);
            }
        }
    }

    const labelFilePattern = path.join(
        __dirname,
        '..',
        'public',
        'labels',
        email,
        `qr_code_${labelId}.*`
    );

    const labelFiles = await glob(labelFilePattern);
    for (const file of labelFiles) {
        try {
            await fs.promises.unlink(file);
            console.log(`Deleted label file: ${file}`);
        } catch (err) {
            console.error(`Failed to delete label file: ${file}`, err);
        }
    }

    await moveout.deleteLabel(labelId);


    res.redirect("/home");
});

router.post('/label/:labelId/delete-file', isAuthenticated, async (req, res) => {

    const labelId = req.params.labelId;
    const email = req.session.email;
    const { filePath, contentType } = req.body;


    const existingLabel = await moveout.getSpecificLabelByUser(labelId, email);

    if (!existingLabel) {
        return res.status(404).send('Label not found.');
    }

    let imagePaths = [];
    let audioPaths = [];

    if (existingLabel.image_path && existingLabel.image_path !== 'null') {
        if (typeof existingLabel.image_path === 'string') {
            try {
                imagePaths = JSON.parse(existingLabel.image_path);
            } catch (error) {
                console.error('Failed to parse image_path as JSON:', error);
                return res.status(500).send('An error occurred while parsing image paths.');
            }
        } else if (Array.isArray(existingLabel.image_path)) {
            imagePaths = existingLabel.image_path;
        }
    }

    if (existingLabel.audio_path && existingLabel.audio_path !== 'null') {
        if (typeof existingLabel.audio_path === 'string') {
            try {
                audioPaths = JSON.parse(existingLabel.audio_path);
            } catch (error) {
                console.error('Failed to parse audio_path as JSON:', error);
                return res.status(500).send('An error occurred while parsing audio paths.');
            }
        } else if (Array.isArray(existingLabel.audio_path)) {
            audioPaths = existingLabel.audio_path;
        }
    }

    
    if (contentType === 'image') {
        imagePaths = imagePaths.filter(path => path !== filePath);
    } else if (contentType === 'audio') {
        audioPaths = audioPaths.filter(path => path !== filePath);
    }


    if (filePath) {
        try {
            const fullPath = path.join(__dirname, '..', 'public', filePath);
            await fs.promises.unlink(fullPath);
            console.log(`Deleted file from file system: ${fullPath}`);
        } catch (err) {
            console.error(`Failed to delete file from file system: ${filePath}`, err);
        }
    }
 
    const imagePathsJson = imagePaths.length > 0 ? JSON.stringify(imagePaths) : null;
    const audioPathsJson = audioPaths.length > 0 ? JSON.stringify(audioPaths) : null;

    await moveout.updateLabelFilePaths(labelId, imagePathsJson, audioPathsJson);

  
    res.redirect(`/label/${labelId}/edit`);

});

router.get('/share-labels', isAuthenticated, async (req, res) => {


        res.render('pages/share-labels.ejs', {
            title: 'Share Label',
            errorMessage: ""
        });
});

router.post('/share-label', isAuthenticated, async (req, res) => {
    try {
        const { recipientEmail, labelName } = req.body;
        const senderEmail = req.session.email;

        const emailExists = await moveout.doesEmailExist(recipientEmail);
        if (!emailExists) {
            return res.render('pages/share-labels.ejs', {
                title: 'Share Label',
                errorMessage: 'User does not exist.'
            });
        }

        const [rows] = await moveout.getLabelIdByName(labelName, senderEmail);
       
        if (!rows || rows.length === 0) {
            return res.render('pages/share-labels.ejs', {
                title: 'Share Label',
                errorMessage: 'Label not found. Please enter a valid label name.'
            });
        }

        const labelId = rows.label_id;
 
        const label = await moveout.get_label_by_id(labelId);

        if (label.is_label_private) {
            return res.render('pages/share-labels.ejs', {
                title: 'Share Label',
                errorMessage: 'This label is private and cannot be shared.'
            });
        }
        const background_image_path = await moveout.getBackgroundImage(labelId, senderEmail)
        await moveout.shareLabel(labelId, labelName, senderEmail, recipientEmail, background_image_path);
        
        res.redirect('/home'); 
    } catch (error) {
        console.error('Error sharing label:', error);
        res.status(500).send('An error occurred while sharing the label.');
    }
});

router.get('/inbox', isAuthenticated, async (req, res) => {
    try {
        const recipientEmail = req.session.email;  
        const sharedLabels = await moveout.getSharedLabels(recipientEmail);

        res.render("pages/inbox.ejs", { 
            sharedLabels,
            title: 'Inbox'  
        });
    } catch (error) {
        console.error('Error retrieving shared labels:', error);
        res.status(500).send('Server error');
    }
});

router.post('/discard-label', isAuthenticated, async (req, res) => {
    try {
        const sharedId = req.body.shared_id;
 
        if (!sharedId) {
            throw new Error('Shared ID not found in the request.');
        }
        
        await moveout.deleteSharedLabel(sharedId);
        res.redirect('/inbox');
    } catch (error) {
        console.error('Error discarding label:', error);
        res.status(500).send('Server error');
    }
});

router.post('/accept-label', isAuthenticated, async (req, res) => {
    try {
        const sharedId = req.body.shared_id; 
        const recipientEmail = req.session.email; 

        if (!sharedId) {
            throw new Error('Shared ID not found in the request.');
        }

        const result = await moveout.acceptSharedLabel(sharedId, recipientEmail);
        const newLabelId = result.newLabelId;
        const newLabelName = result.newLabelName;
        const backgroundImagePath = result.backgroundImagePath;
        

        const qrContent = `https://575e-2001-6b0-2a-c280-bdc1-f512-44f2-213.ngrok-free.app/label/${newLabelId}?email=${encodeURIComponent(recipientEmail)}`;
        const qrImagePath = await qrFunctions.overlayQRCodeOnImage(qrContent, backgroundImagePath, recipientEmail, newLabelId, newLabelName);
        const publicImagePath = '/' + path.relative('public', qrImagePath).replace(/\\/g, '/');
        await moveout.deleteSharedLabel(sharedId);
        res.redirect('/inbox');
    } catch (error) {
        console.error('Error accepting label:', error);
        res.status(500).send('Server error');
    }
});

router.get('/print-label', isAuthenticated, async (req, res) => {

    res.render('pages/print-label.ejs', {
        title: 'Print Label',
        errorMessage: ""
    });
});

router.get('/get-label', isAuthenticated, async (req, res) => {
    const labelName = req.query.name;
    const email = req.session.email;

    if (!labelName) {
        return res.status(400).json({ success: false, message: 'Label name is required' });
    }
    const labelIdResult = await moveout.getLabelIdByName(labelName, email);
    console.log("label-print labelIdResult : ", labelIdResult);
    if (labelIdResult && labelIdResult.length > 0) {
        const labelId = labelIdResult[0].label_id;
        const labelImagePath = `/labels/${email}/qr_code_${labelId}.png`;
        res.json({ success: true, label: { name: labelName, imagePath: labelImagePath } });
    } else {
        res.json({ success: false, message: 'Label not found' });
    }
});

router.get('/profile', isAuthenticated, async (req, res) => {

    const email = req.session.email;
    res.render('pages/profile.ejs', {
        title: 'Profile',
        email 
    });
});

router.post('/deactivate-account', isAuthenticated, async (req, res) => {
        const email = req.session.email; 
        await moveout.deactivateAccount(email);
        const messageConfirmation = 'Your account has been deactivated';
        res.render('pages/account-deactivated.ejs', {
            title: 'Account Deactivated',
            messageConfirmation
        });
});

router.post('/delete-account-request', isAuthenticated, async (req, res) => {

    const email = req.session.email;

    const deleteToken = crypto.randomBytes(32).toString('hex');
    const deleteTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); 

    await moveout.insertDeleteToken(email, deleteToken, deleteTokenExpires);
    const deleteUrl = `${process.env.BASE_URL}/confirm-delete-account?token=${deleteToken}`;

    await emailFunctions.sendDeleteAccountLink(email, deleteUrl);

    const message = 'A confirmation email has been sent to your email address.'
    res.render('pages/delete-request-success.ejs', {
        title: 'To Delete Account:',
        message
    });

});

router.get('/confirm-delete-account', async (req, res) => {
    const { token } = req.query;
    const email = await moveout.verifyDeleteToken(token);

    if (!email) {
        return res.render('pages/error-deletion-token.ejs', {
            title: 'Expired Token',
            message: 'The deletion link is invalid or has expired. Please try again.'
        });
    }

    await moveout.deleteAccount(email);

    if (req.session.email === email) {
        req.session.destroy(err => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).send('Error occurred while logging out.');
            }
            res.render('pages/account-deleted-success.ejs', {
                title: 'Account Deleted',
                message: 'Your account has been successfully deleted.'
            });
        });
    } else {
        res.render('pages/account-deleted-success.ejs', {
            title: 'Account Deleted',
            message: 'The account has been successfully deleted.'
        });
    }
});

router.get('/admin-page', isAuthenticated, isAdmin, async (req, res) => {

    const users = await moveout.getUsersWithStorageData();
    console.log("Users Data:", users);
    res.render('pages/admin-page.ejs',{
        title: 'Admin Dashboard',
        users: users
    })

});

router.post('/admin/toggle-activation', isAuthenticated, isAdmin, async (req, res) => {
    const { userEmail, isActive } = req.body; 
    await moveout.accountActivationToggle(userEmail, isActive === 'true');
    res.redirect('/admin-page');
});

router.post('/admin/send-email', isAuthenticated, isAdmin, async (req, res) => {
    const { subject, message } = req.body;

    await emailFunctions.adminSendMailToUsers(subject, message);

    res.redirect('/admin-page');

});

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);

        }
        res.redirect('/login');
    });
});

module.exports = router;

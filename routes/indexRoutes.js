const express = require("express");
const router = express.Router();
const moveout = require("../src/moveout.js");
const verify = require("../verifiers/verifiers.js");
const validator = require('validator');
const verifiers = require("../verifiers/verifiers.js");
const emailFunctions = require("../utils/email.js");
const isAuthenticated = require('../utils/auth.js');
const qrFunctions = require("../utils/generateQR.js");
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { glob } = require('glob'); 


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
    let data = {
        error: {},
        title: "Login"
    };

    const email = req.body.f_email;
    const password = req.body.f_user_password;
    
    const result = await moveout.userLogIn(email, password);
    const verifiedEmail = await moveout.isEmailVerified(email);
    if(result.success && verifiedEmail.success)
    {
        req.session.email = email;
        res.redirect("/home");
    }
    else
    {
        data.error.invalid = result.message;
        res.render("pages/login.ejs", data);
    }
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
                console.log(`Created new directory for user: ${dirPath}`);
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
    
    let textContent = null;
    let userImagePath = null;
    let userAudioPath = null;

    if(contentType === "text"){
        textContent = req.body.textContent;
    } 
    else if (contentType === "image"){
        imagePath = `/uploads/images/${email}/` + req.files.imageContent[0].filename;
        userImagePath = JSON.stringify(imagePath);
    }
    else if(contentType === "audio"){
        audioPath = `/uploads/audio/${email}/` + req.files.audioContent[0].filename;
        userAudioPath = JSON.stringify(audioPath);
    }

    const labelId = await moveout.insert_info_qr_code(email, textContent, userImagePath, userAudioPath, isLabelPrivate);

    let backgroundImagePath = null;
    const selectedLabelDesign = req.body.labelDesign;

    if (selectedLabelDesign === 'label1') {
        backgroundImagePath = 'public/background-images/label-image-black.png';
    } else if (selectedLabelDesign === 'label2') {
        backgroundImagePath = 'public/background-images/label-image-yellow.png';
    } else if (selectedLabelDesign === 'label3') {
        backgroundImagePath = 'public/background-images/label-image-gray.png';
    }

    const qrContent = `https://4fb4-2001-6b0-2a-c280-bdc1-f512-44f2-213.ngrok-free.app/label/${labelId}?email=${encodeURIComponent(email)}`; 
    const qrImagePath = await qrFunctions.overlayQRCodeOnImage(qrContent, backgroundImagePath, email, labelId);
    const publicImagePath = '/' + path.relative('public', qrImagePath).replace(/\\/g, '/');

    data.imageUrl = publicImagePath;

    res.redirect("/home");
});


router.get("/label/:labelId", async (req, res) => {
    const labelId = req.params.labelId;
    const email = req.query.email;

    console.log('Fetching label for ID:', labelId);
    const label = await moveout.get_label_by_id(labelId);
    console.log('Label info:', label);

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
    { name: 'imageContent', maxCount: 10 },
    { name: 'audioContent', maxCount: 10 }
]), async (req, res) => {
    try {
        const labelId = req.params.labelId;
        const email = req.session.email;

        const existingLabel = await moveout.getSpecificLabelByUser(labelId, email);

        if (!existingLabel) {
            return res.status(404).send('Label not found.');
        }
        
        const isLabelPrivate = req.body.isLabelPrivate === 'on';
        let textContent = req.body.textContent || existingLabel.text_content;
        

    let imagePaths = [];
    let audioPaths = [];

    if (existingLabel.image_path && existingLabel.image_path !== 'null') {
        try {
            imagePaths = JSON.parse(existingLabel.image_path);
        } catch (error) {
            imagePaths = [existingLabel.image_path];
        }
    }

    if (existingLabel.audio_path && existingLabel.audio_path !== 'null') {
        try {
            audioPaths = JSON.parse(existingLabel.audio_path);
        } catch (error) {
            audioPaths = [existingLabel.audio_path];
        }
    }

    if (req.files.imageContent) {
        const newImagePaths = req.files.imageContent.map(file => `/uploads/images/${email}/${file.filename}`);
        imagePaths = imagePaths.concat(newImagePaths);
    }

    if (req.files.audioContent) {
        const newAudioPaths = req.files.audioContent.map(file => `/uploads/audio/${email}/${file.filename}`);
        audioPaths = audioPaths.concat(newAudioPaths);
    }

    const imagePathsJson = imagePaths.length > 0 ? JSON.stringify(imagePaths) : null;
    const audioPathsJson = audioPaths.length > 0 ? JSON.stringify(audioPaths) : null;


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
    const labelId = req.params.labelId;
    const email = req.session.email;
    const label = await moveout.get_label_by_id(labelId);

    const labelFilePattern = path.join(
        __dirname, 
        '..', 
        'public', 
        'labels', 
        email, 
        `qr_code_${labelId}.*`
    );

    const files = await glob(labelFilePattern);

    for (const file of files) {
        try {
            await fs.promises.unlink(file);
            console.log(`Deleted label file: ${file}`);
        } catch (err) {
            console.error(`Failed to delete label file: ${file}`, err);
        }
    }
    await moveout.deleteLabel(labelId)
    res.redirect("/home");     
});


router.get('/share-labels', isAuthenticated, async (req, res) => {


        res.render('pages/share-labels.ejs', {
            title: 'share label'
        });
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

// email.js
require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendVerificationEmail(userEmail, verificationLink) {
  const transporter = nodemailer.createTransport({
    service: "Gmail", 
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS, 
    },
  });

  const mailOptions = {
    from: `"MoveOut" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: 'Email Verification',
    html: ` <p>Thank you for registering. Please verify your email by clicking the link below:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}



async function accountCreationConfirmation(userEmail) {
  const transporter = nodemailer.createTransport({
    service: "Gmail", 
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS, 
    },
  });

  const mailOptions = {
    from: `"MoveOut" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: 'Account created',
    html: ` <p>Your account has been created!</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}



async function sendVerificationCodeLabel(userEmail, verificationCode) {
  const transporter = nodemailer.createTransport({
    service: "Gmail", 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"MoveOut" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: 'Verification code label',
    html: ` <p>Your verification code to access you label: ${verificationCode}</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = 
{ 
    sendVerificationEmail,
    accountCreationConfirmation,
    sendVerificationCodeLabel
};

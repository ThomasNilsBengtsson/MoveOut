const validator = require('validator');
const crypto = require("crypto");


function validateEmail(email) {
    const errors = {};
    if (!validator.isEmail(email)) {
        errors.email = 'Please enter a valid email address.';
    }
    return errors;
}

function validatePassword(password) {
    const errors = {};

    if (password.length < 6) {
        errors.password = 'Please enter a password with more than 5 characters';
    }

    const hasLettersAndNumbers = /^(?=.*[A-Za-z])(?=.*\d)/;

    if (!hasLettersAndNumbers.test(password)) {
        errors.password = 'Password must contain at least one letter and one number';
    }

    return errors;
}




function verificationTokenCreation()
{
    return crypto.randomBytes(32).toString("hex");
}


module.exports = {
    validateEmail,
    verificationTokenCreation,
    validatePassword
};

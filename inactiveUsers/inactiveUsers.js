const cron = require('node-cron');
const emailFunctions = require("../utils/email.js");
const moveout = require("../src/moveout.js");


cron.schedule('0 0 * * *', async () => {
    
    const inactiveUsers = await moveout.getInactiveUsers();
    const reminderThreshold = new Date(Date.now() - 23 * 24 * 60 * 60 * 1000);

    inactiveUsers.forEach(async (user) => {
       
        if (user.last_login < reminderThreshold) {
            await emailFunctions.accountDeactivationReminder(user.email);
        } else {
            await moveout.deactivateAccount(user.email);     
        }
    });
});

const express = require('express');
const User = require('../models/user')

const authController = require('../controllers/auth');
const { body } = require('express-validator/check')

const router = express.Router();

router.get('/login', authController.getLogin);
 
router.get('/signup', authController.getSignup);

router.post('/login', 
body('email', 'Enter a valid email')
.isEmail()
.normalizeEmail()
.custom((valud, {req})=>{
    return User.findOne({email:req.body.email})
    .then(user => {
        if(!user){
            return Promise.reject('Invalid email or password')
        }
    })
}),
body('password', 
'Please enter a password with only numbers and text and at least 5 characters')
.isAlphanumeric()
.isLength({min: 5})
,authController.postLogin);

router.post('/signup', 
body('email', 'Please enter a valid Email')
.isEmail()
.normalizeEmail()
.custom((value, {req})=>{
    return User.findOne({email: req.body.email})
    .then(user => {
        if(user){
            return Promise.reject('E-Mail exists already, please use another email')
        }
    })
}),
body('password', 
'Please enter a password with only numbers and text and at least 5 charaters')
.isAlphanumeric()
.isLength({min: 5}),
body('confirmPassword')
.custom((value, {req})=>{
    if(value === req.body.password){
        return true;
    }

    throw new Error('Password has to match')
})
,authController.postSignup);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);
router.post('/new-password', authController.postNewPassword);



module.exports = router;
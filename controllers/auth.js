const User = require('../models/user');
const bcrypt = require('bcryptjs');
const mailer = require('nodemailer');
const mailTransprot = require('nodemailer-sendgrid-transport');
const crypto = require('crypto');

const {validationResult} = require('express-validator/check')

const transporter = mailer.createTransport(mailTransprot({
  auth: {
    api_key: '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'
  }
})) 

exports.getLogin = (req, res, next) => {
  let message = req.flash('err');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message,
    oldEmail: '',
    oldPassword: '',
    validationError: []
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('err');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: message,
    oldEmail: '',
    oldPassword: '',
    oldConfirmPassword: '',
    validationError: []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: errors.array()[0].msg,
      oldEmail: email,
      oldPassword: password,
      validationError: errors.array()
    });
  }

  User.findOne({email: email})
    .then(user => {
      if(!user){
        return res.render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: 'Invalid email or password',
          oldEmail: email,
          oldPassword: password,
          validationError: errors.array()
        });
      }
      bcrypt.compare(password, user.password)
      .then(doMatach => {
        if(doMatach){
          req.session.isLoggedIn = true;
          req.session.user = user;
          return req.session.save(() => {
            res.redirect('/');
          });
        }
        return res.render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: 'Invalid email or password',
          oldEmail: email,
          oldPassword: password,
          validationError: errors.array()
        });
      })
      .catch(err => {
        console.log(err)
        res.redirect('/login')
      });
    })
    .catch(err => console.log(err));
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  const errors = validationResult(req)

  if(!errors.isEmpty()){
    console.log(errors.array())
    return res.render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: errors.array()[0].msg,
      oldEmail: email,
      oldPassword: password,
      oldConfirmPassword: confirmPassword,
      validationError: errors.array()
    });
  }

  User.findOne({email:email})
  .then(userdoc => {
    if(userdoc){
      req.flash('err', 'E-Mail exists already, please use another email');
      return res.redirect('/signup');
    }
    bcrypt.hash(password, 12)
    .then(hashPassword => {
      console.log(hashPassword)
      const user = new User({
        email: email,
        password: hashPassword,
        cart: {items: []}
      })
      return user.save()
    })
  })
  .then(()=>{
    res.redirect('/login')
    transporter.sendMail({
      to:email,
      from: 'nahid.ahmadi@codetoinspire.org',
      subject: 'Signed up succeded!',
      html: '<h1>You signed up successfully!</h1>'
    })
  })
  .catch(err => console.log(err))
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getReset = (req, res, next)=>{
  let message = req.flash('err');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message
  });
}

exports.postReset = (req, res, next)=>{
  crypto.randomBytes(32, (err, buffer)=>{
    if(err){
      console.log(err);
      return res.redirect('/reset');
    }
    const token = buffer.toString('hex');

    User.findOne({email: req.body.email})
    .then(user => {
      if(!user){
        req.flash('err', 'No account with that email found.')
        return res.redirect('/reset')
      }
      
      user.restToken = token;
      user.restTokenExpiration = Date.now() + 3600000;
      return user.save()
    })
    .then(result => {
      res.redirect('/')
      transporter.sendMail({
        to:req.body.email,
        from: 'nahid.ahmadi@codetoinspire.org',
        subject: 'Reset Password',
        html: '<p>Click hrer: <a href="http://localhost:3000/reset/'+token+'">Reset Password</a></p>'
      })
    })
    .catch(err => console.log(err))
  })
}

exports.getNewPassword = (req, res, next)=>{
  const token = req.params.token;
  User.findOne({restToken: token, restTokenExpiration: {$gt:Date.now()}})
  .then(user => {
    let message = req.flash('err');
    if (message.length > 0) {
      message = message[0];
    } else {
      message = null;
    }
    res.render('auth/new-password', {
      path: '/new-password',
      pageTitle: 'New Password',
      errorMessage: message,
      userId: user._id.toString(),
      passwordToken: token
    });
  })
  .catch(err => console.log(err))
}
exports.postNewPassword = (req, res, next)=>{
  const newPassword = req.body.newPassword;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
      restToken: passwordToken,
     restTokenExpiration: {$gt: Date.now()},
     _id: userId})
    .then(user => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12)
    })
    .then(hashPassword => {
      resetUser.password = hashPassword;
      resetUser.restToken = undefined;
      resetUser.restTokenExpiration = undefined;
      return resetUser.save()
    })
    .then(result => {
      res.redirect('/login')
    })
    .catch(err => console.log(err))
}
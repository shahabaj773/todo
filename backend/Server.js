const express = require('express');
const validator = require('validator');
const bcrypt = require('bcrypt');
const app = express();
const PORT = 4000;
const mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const nodemailer = require('nodemailer');

//self signed error - resolver
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

mongoose.set('strictQuery', false);

const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
mongoose
  .connect(
    'mongodb+srv://ash2002:Ashish123@cluster0.x8hjjjv.mongodb.net/ToDoList'
  )
  .then(
    app.listen(PORT, () => {
      console.log(`Server start at Port No:${PORT}`);
    })
  );
var otp = Math.random();
otp = otp * 1000000;
otp = parseInt(otp);
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

app.post('/signup', async (req, res) => {
  const mailOptions = {
    to: req.body.email,
    subject: 'Otp for registration is: ',
    html:
      '<h3>OTP for account verification is </h3>' +
      "<h1 style='font-weight:bold;'>" +
      otp +
      '</h1>',
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    } else {
      res.send('otpsent');
    }
  });
  // var token = jwt.sign({ foo: 'bar' }, 'shhhhh');
});
app.post('/login', async (req, res) => {
  var token = jwt.sign({ foo: 'bar' }, 'shhhhh');
  const founduser = User.findOne({ name: req.body.name });
  if (founduser) {
  }
});

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error('Not valid');
      }
    },
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },

  mobile: {
    type: Number,
    required: true,
    unique: true,
  },
});
const User = mongoose.model('User', UserSchema);

app.get('/find/usersdata', async (req, res) => {
  res.send(await User.find());
});

app.post('/otp', (req, res) => {
  if (req.body.otp === otp) {
    bcrypt.hash(req.body.password, 15, async function (err, hash) {
      await User.insertMany([
        {
          name: req.body.name,
          email: req.body.email,
          password: hash,
          mobile: req.body.mobile,
        },
      ]);
    });
    res.send('success');
  } else {
    res.send('invalidotp');
  }
});

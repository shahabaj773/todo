//imports
///express--backend server
const express = require('express');
///validator
const validator = require('validator');
///bcrypt--to hash password
const bcrypt = require('bcrypt');
///mongoose--to connect mogodb easily
const mongoose = require('mongoose');
///jwt--to generate token
var jwt = require('jsonwebtoken');
///cors--to handle cross origin req
const cors = require('cors');
///cookieparser--to store token in cookie & read them
var cookieParser = require('cookie-parser');
///modemailer--to send email
const nodemailer = require('nodemailer');

//uses & configs
///dotenv
require('dotenv').config();
//self signed error resolver--for nodemailer
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
///express
const app = express();
app.use(express.json());
///cookieparser
app.use(cookieParser());
///cors
const corsOptions = {
  origin: process.env.ORIGIN,
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
///db & server connection
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGOURI).then(
  app.listen(process.env.PORT, () => {
    console.log(`Server start at Port No:${process.env.PORT}`);
  })
);

//universal variables
///for nodemailer
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
///user authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    //verify token remaining & cookie
    const user = await User.findOne({ token: token });
    if (!user) {
      res.send('error');
    } else {
      req.user = user;
      next();
    }
  } catch {}
};

//routes
///sending otp to new user for varification
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
});

///verifying otp & saving new user to db & giving cookie token
app.post('/otp', (req, res) => {
  ////otp verify
  if (req.body.otp == otp) {
    ////generating token
    const token = jwt.sign({ username: req.body.name }, process.env.JWT_KEY, {
      expiresIn: '15d',
    });
    ////hashing pass & saving user to db
    bcrypt.hash(req.body.password, 15, async function (err, hash) {
      await User.insertMany([
        {
          name: req.body.name,
          email: req.body.email,
          password: hash,
          mobile: req.body.mobile,
          token: token,
          isAdmin: false,
        },
      ]);
    });
    ////saving token to cookie
    const options = {
      httpOnly: true,
      expires: new Date(Date.now() + 36000000),
    };
    res.cookie('token', token, options);
    res.send('success');
  } else {
    res.send('invalidotp');
  }
});

///login
app.post('/login', async (req, res) => {
  ////finding user with req email
  const founduser = await User.findOne({ email: req.body.email });
  if (founduser) {
    ////matching pass
    const match = await bcrypt.compare(req.body.password, founduser.password);
    if (match) {
      ////giving token in cookie
      const options = {
        httpOnly: true,
        expires: new Date(Date.now() + 36000000),
      };
      res.cookie('token', founduser.token, options);
      res.send(founduser);
    } else {
      console.log('invalid password');
    }
  } else {
    console.log('no user');
  }
});

///finding all users
app.get('/find/usersdata', async (req, res) => {
  res.send(await User.find());
});

///removing user by id
app.post('/remove/user/byid', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.body.id);
    res.send('Deleted');
  } catch {
    console.log('error');
  }
});

///authenticating user for protected routes & sending user data
app.get('/authenticate', authenticate, async (req, res) => {
  res.send(req.user);
});

app.post('/add/todo', async (req, res) => {
  await User.findOneAndUpdate(
    { _id: req.body.id },
    {
      $push: {
        todo: {
          todo: req.body.todo,
          completed: 'false',
        },
      },
    }
  );
  res.send('submitted');
});
app.post('/delete/todo', async (req, res) => {
  await User.findOneAndUpdate(
    { _id: req.body.id },
    {
      $pull: {
        todo: { todo: req.body.todo },
      },
    }
  );
  res.send('deleted');
});

// app.post('/update/todo', async (req, res) => {
//   await User.findOneAndUpdate(
//     { _id: req.body.id },
//     {
//       $pull: {
//         todo: req.body.todo,
//       },
//     }
//   );
//   res.send('updated');
// });
app.post('/update/todo/completed', async (req, res) => {
  // const data = await User.findOneAndUpdate(
  //   { _id: req.body.id, 'todo.todo': req.body.todo },
  //   {
  //     todo: {
  //       completed: req.body.completed,
  //     },
  //   }
  // );
  const data = await User.findOne({
    _id: req.body.id,
  });
  var filteredEvents = data.todo.filter(function (todo) {
    return todo.todo == req.body.todo;
  });
  if (filteredEvents[0].completed === 'false') {
    // await User.findOneAndUpdate({
    //   todo: {
    //     _id: filteredEvents[0]._id,
    //   },
    // });
    console.log(filteredEvents[0].todo);
    User.findOneAndUpdate(
      {
        _id: req.body.id,
      },
      { $set: { 'todo.$[el].completed': 'true' } },
      {
        arrayFilters: [{ 'el.todo': filteredEvents[0].todo }],
        new: true,
      }
    );
    //   const good = await User.findOneAndUpdate(
    //     {
    //       todo: {
    //         $elemMatch: { todo: filteredEvents[0].todo },
    //       },
    //     },
    //     {
    //       $set: {
    //         completed: 'true',
    //       },
    //     }
    //   );
  } else {
  }
  // res.send('updated');
});
app.post('/update/userdata', async (req, res) => {
  if (req.body.password !== undefined) {
    bcrypt.hash(req.body.password, 15, async function (hash) {
      await User.updateOne(
        {
          _id: req.body.id,
        },
        {
          name: req.body.name,
          mobile: req.body.mobile,
          password: hash,
        }
      );
    });
  } else {
    await User.updateOne(
      {
        _id: req.body.id,
      },
      {
        name: req.body.name,
        mobile: req.body.mobile,
      }
    );
  }
  res.send('updated');
});

//schemas
///user schema
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
  token: {
    type: String,
  },
  isAdmin: {
    type: Boolean,
  },
  todo: [{ todo: { type: String }, completed: { type: String } }],
});
const User = mongoose.model('User', UserSchema);

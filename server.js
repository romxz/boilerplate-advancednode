'use strict';

const express       = require('express');
const bodyParser    = require('body-parser');
const fccTesting    = require('./freeCodeCamp/fcctesting.js');
const session       = require('express-session');
const passport      = require('passport');
const ObjectID      = require('mongodb').ObjectID;
const mongo         = require('mongodb').MongoClient;
const LocalStrategy = require('passport-local');
const cors          = require('cors');
//const mongoose = require('mongoose');
//mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });


const app = express();

fccTesting(app); //For FCC testing purposes

app.use(cors());
app.use('/public', express.static(process.cwd() + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'pug');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());


mongo.connect(process.env.DATABASE, (err, client) => { //(err, connection)
    if(err) {
      console.log('Database error: ' + err);
    } else {
      console.log('Successful database connection');
      const db = client.db();
      
      passport.serializeUser((user, done) => {
        done(null, user._id);
      });

      passport.deserializeUser((id, done) => {
          db.collection('users').findOne(
              {_id: new ObjectID(id)},
              (err, doc) => {
                  done(null, doc);
              }
          );
      });

      passport.use(new LocalStrategy(
        function(username, password, done) {
        db.collection('users').findOne({ username: username }, (err, user) => {
          console.log('User '+username+' attempted to log in.');
          if (err) {return done(err);}
          if (!user) {return done(null, false);}
          if (password !== user.password) {return done(null, false);}
          return done(null, user);
        })
      }));
      
      app.route('/')
        .get((req, res) => {
          res.render(process.cwd() + '/views/pug/index', {
            title: 'Home Page', 
            message: 'Please login',
            showLogin: true
          });
      });
      
      app.route('/login')
        .post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
          res.redirect('/profile');
      });
      
      function ensureAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {return next();}
        res.redirect('/');
      };
      
      app.route('/profile')
        .get(ensureAuthenticated, (req, res) => {
          res.render(process.cwd() + '/views/pug/profile');
      });

      app.listen(process.env.PORT || 3000, () => {
        console.log("Listening on port " + process.env.PORT);
      });  
}});

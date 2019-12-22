// load modules
const express = require('express');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const passport = require('passport')
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override')
// Connect to MongoURI expoerted from external file
const keys = require('./config/keys');
// Load models
const User = require('./models/user');
const Post = require('./models/post');
// Link passports to the server
require('./passport/google.passport');
require('./passport/facebook.passport');
// Link helpers
const {
    ensureAuthentication, 
    ensureGuest
} = require('./helpers/auth');
// initialize application
const app = express();
//Exoress config
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({ secret: 'keyboard cat', 
                resave: true,
                saveUninitialized: true}));
app.use(methodOverride('_method'))
app.use(passport.initialize());
app.use(passport.session());
//set global vars for user
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
})
// setup template engine
app.engine('handlebars', exphbs({
    defaultLayout: 'main'
}));

app.set('view engine', 'handlebars');
// setup static file to serve css, javascript and images
app.use(express.static('public'));
// connect to remote database
mongoose.Promise = global.Promise;
mongoose.connect(keys.MongoURI, {
    useNewUrlParser: true 
})
.then(() => {
    console.log('Connected to Remote Database.....')
}).catch((err) => {
    console.log(err);
});
// set environment variable for port
const port = process.env. PORT || 3000;
// Handle routes
app.get('/', ensureGuest, (req, res) => {
    res.render('home');
});

app.get('/about', (req, res) =>{
    res.render('about');
});
// Goole Auth Route
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/profile');
  });
// FACEBOOK AUTH ROUTE
app.get('/auth/facebook',
  passport.authenticate('facebook',{
    scope: 'email'
}));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/profile');
  });
// HANDLE profile route
app.get('/profile', ensureAuthentication, (req, res) => {
    Post.find({user: req.user._id})
    .populate('user')
    .sort({date: 'desc'})
    .then((posts) => {
        res.render('profile', {
            posts:posts
        });
    });
});
// Handle route for all users
app.get('/users', ensureAuthentication, (req, res) => {
    User.find({}).then((users) => {
        res.render('users', {
            users:users
        });
    });
});
// Display one user profile
app.get('/user/:id', (req, res) => {
    User.findById({_id: req.params.id})
    .then((user) => {
        res.render('user', {
            user:user
        });
    });
});
// Handle Email post route
app.post('/addEmail', (req, res) => {
    const email = req.body.email;
    User.findById({_id: req.user._id})
    .then((user) => {
        user.email = email;
        user.save()
        .then(() => {
            res.redireect('/profile');
        });
    });
});
// Handle Phone Post Route
app.post('/addPhone', (req, res) => {
    const phone = req.body.phone;
    User.findById({_id: req.user._id})
    .then((user) => {
        user.phone = phone;
        user.save()
        .then(() => {
            res.redirect('/profile');
        });
    });
});
// Handle Location Post Route
app.post('/addLocation', (req, res) => {
    const location = req.body.location;
    User.findById({_id: req.user._id})
    .then((user) => {
        user.location = location;
        user.save()
        .then(() => {
            res.redirect('/profile');
        });
    });
});
// Handle Get Routes for Posts
app.get('/addPost', (req, res) => {
    res.render('addPost')
});
// Handle post route
app.post('/savePost', (req, res) => {
    console.log(req.body);
    var allowComments;
    if(req.body.allowComments){
        allowComments = true;
    }else{
        allowComments = false;
    }
    const newPost = {
        title: req.body.title,
        body: req.body.body,
        status: req.body.status,
        allowComments: allowComments,
        user: req.user._id
    }
    new Post(newPost).save()
    .then(() => {
        res.redirect('/posts');
    });
});
// Handle edit Post route
app.get('/editPost/:id', (req, res) => {
    Post.findOne({_id:req.params.id})
    .then((post) => {
        res.render('editingPost', {
            post:post
        });
    });
});
// Handle Put ROUTE To Save Edited Post
app.put('/editingPost/:id', (req, res) => {
    Post.findOne({_id: req.params.id})
    .then((post) => {
        var allowComments;
        if(req.body.allowComments){
            allowComments = true;
        }else{
            allowComments = false;
        }
        post.title = req.body.title;
        post.body = req.body.body;
        post.status = req.body.status;
        post.allowComments = allowComments;
        post.save()
        .then(() => {
            res.redirect('/profile');
        });
    });
});
// Handle posts routes
app.get('/posts', ensureAuthentication, (req, res) => {
    Post.find({status: 'public'})
    .populate('user')
    .sort({date:'desc'})
    .then((posts) => {
        res.render('publicPosts', {
            posts:posts
        });
    });
});
// Handle user logout
app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
})
app.listen(port, () => {
    console.log('Server is running on port ' + port);
});
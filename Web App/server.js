"use strict";
const express = require("express");
const mongoClient = require("mongodb").MongoClient;
const app = express();
let dir = __dirname;
let bodyParser = require('body-parser');
let session = require("client-sessions");
const async = require("async");
let  d = new Date();

const mod = require("../Module/index.js");

//const io = require("socket.io")(server);
const assert = require("assert");
const port = 3000;



/*const Gpio = require("onoff").Gpio;
const greenLED = new Gpio(4, "out");
const pushButton = new Gpio(17, "in", "both"); //may not need the button
const redLED = new Gpio(27, "out");*/

// Used to make the server look in our directory for
// our javascript, css, and other files
app.use(express.static(dir));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  cookieName: 'session',
  secret: 'random_string_goes_here',
//duration: 7 * 24 * 60 * 1000,
duration: 10 * 1000,
}));


app.use(bodyParser.json());

/**
 * Connects server to mongo database and allows us to view apllication in
 * browser
 */
mongoClient.connect("mongodb://ersp:abc123@ds044917.mlab.com:44917/smart-lock", (err, database) => {

  app.listen(port, function() {

    console.log("listening on " + port);
    mod.connectServer();
  })
})

/*
io.on('connection', function (socket){
  mod.getDefaultState(parseInt(socket.handshake.query.lockId), function(state) {
    socket.emit("defaultState", state);
  })
  socket.on("disconnect", function(data) {
    mod.deleteActiveLock({socketId: socket.id});
  })

});

io.use(function(socket, next) {
  let data = socket.request;
  // Need to change below. Should be checking if it is a valid lock ID rather than
    // whether a lock ID was provided
  if(!data._query.lockId) {
    io.sockets.connected[socket.id].disconnect();
  }
  else {
    mod.insertActiveLock({lockId: parseInt(data._query.lockId), socketId: socket.id});
    next();
  }
})
*/
// Route for accessing the site, sends back the homepage
app.get("/", (req, res) => {

  res.sendFile(dir + "/views/login.html");
})

//route for addMembers page
app.get("/addMembers", (req, res) => {
  res.sendFile(dir + "/views/addMembers.html");
})

/*app.get("/addRoles", (req, res) => {
  res.sendFile(dir + "/views/addRoles.html");
})
*/

//route for addEvents page
app.get("/addEvents", (req, res) => {
  res.sendFile(dir + "/views/addEvents.html");
})

//route for registerLock page
app.get("/registerLock", (req, res) => {
  res.sendFile(dir + "/views/register.html");
})

//route for editAdmins page
app.get("/editAdmins", (req, res) => {
 res.sendFile(dir+ "/views/editAdmins.html");
})

// Route for authenticating users after they log in via Google
  // Determines whether or not the user has a lock associated with them

//Authenticates the user through email
  app.get("/authenticate", (req, res) => {
    // User email is obtained from the Javascript function after user has logged
    // in viga Google
    req.session.fullname = req.query.fullname;
    req.session.username = req.query.email;
    mod.authenticate(req.session.username, req.session.fullname, function(locks, lockId) {
      if(lockId) {
        req.session.lock = lockId;
      }
      res.send(locks);
    })
  })

  //Route that redirects users to their lock dashboard, sends the dashboard page back
  app.get("/dashboard", (req, res) => {
    if(!mod.isLoggedIn(req.session.username)) {
      res.redirect("/");
      return;
    }
    res.sendFile(dir + "/views/dashboard.html");
  })

/**
 * This route is only used to send back the personal data of the user
 * back to the Javascript function that loads the dashboard. This
 * is because the dashboard will contain some information personalized
 * to the user.
 */
 app.get("/dashboardInformation", (req, res) => {

  mod.getLockInfo(req.session.lock, req.session.username, function(data) {
    res.send(data);
  })
})
//gets the locks using username
 app.get("/getLocks", (req, res) => {
  mod.getUsersLocks(req.session.username, function(data) {
    res.send(data);
  })
})

//get the settings for user with username and lock
 app.get("/getSettings", (req, res) => {
  mod.getSettings(req.session.username, req.session.lock, function(data) {
    res.send(data);
  })
})

//gets the members of a lock using lock id
 app.get("/getMembers", (req, res) => {
  mod.getLockMembers(req.session.lock, (err, members) => {
    mod.getLockAdmins(req.session.lock, (err, admins) => {
      let combinedMembers = members.concat(admins);
      res.send({members: combinedMembers});
    })
  })
})

//gets the lock admins
 app.get("/getAdmins", (req, res) => {
    let id = req.session.lock;
    //let username = req.body.members;
  mod.getLockAdmins(id, function(err, members) {
    res.send({members: members});});
 })

 //gets the users name from email username
 app.get("/getName", (req, res) => {
  res.send(req.session.username);
})


// Route that redirects users to register their lock, sends registration page
app.get("/register", (req, res) => {
  if(!mod.isLoggedIn(req.session.username)) {
    res.redirect("/");
    return;
  }
  res.sendFile(dir + "/views/register.html");
})

//gets the status (locked/unlocked) of a specific lock
app.get("/lockStatus", (req, res) => {
  mod.getLockStatus(req.session.lock, function(data) {
    res.send(data);
  })
})

//selet lock to view
app.get("/selectLock", (req, res) => {
  res.sendFile(dir + "/views/locks.html");
})

//slect dashoard to be displayed
app.get("/selectDashboard", (req, res) => {

  /**
   * TO DO:
   *  WE ARE NOT CHECKING WHO IS REQUESTING ACCESS
   *  TO THE LOCK DASHBOARD, WE SHOULD BE DOING THIS
   *  OTHERWISE ANYONE CAN GET TO A LOCK BY JUST 
   *  SENDING A ID
   */

  req.session.lock = parseInt(req.query.lockId);
  mod.getSocketId(req.session.username, parseInt(req.session.lock), function(result) {
    if(result.Error) {
      // username that was sent was not valid
      res.end();
    }
    if(!result.socketId) {
      // send them to the lock not active page
      res.send();
    }
    else {
      res.send();
    }
  })
})

//switch lock using lock id of lock to switch to
app.get("/switchLock", (req, res) => {
  req.session.lock = parseInt(req.query.lockId);
  res.send();
})

//switch settings
app.get("/switchSettings", (req, res) => {
  mod.switchSettings(req.query.setting, function(data) {
    res.send(data);
  })
})

//gets the time status
app.get("/timeStatus", (req, res) => {
  let time = mod.getTime();
  res.send(time);
})


//there is no mod.canAccess function so this might be a problem. not sure where it's being used
/*app.get("/canAccess", (req, res) => {
  let username = req.session.username;
  let lockId = req.session.lock;
  mod.canAccess(username, lockId, function(roles) {
    res.send({roles: roles});
  });
});*/


//signs out of session
app.get("/signOut", (req, res) => {
 req.session.reset();
//  res.send();
})


/* ---------------------- POST ROUTES BELOW ---------------------- */

//add member who can access lock
app.post("/addMember", (req, res) => {
  let username = req.session.username;
  let userToAdd = req.body.username;
  let lockId = req.session.lock;
  //call the module
  mod.addMember(username, userToAdd, lockId, function(err, result) {
    err ? res.send(err.message) : res.send(result);
  });
})

//remove member from lock
app.post("/removeMember", (req, res) => {

  /**
   * Rework this function in the module so that
   * it uses getUser instead
   */

  let username = req.session.username;
  let userToRemove = req.body.username;
  let lockId = req.session.lock;
  //call the module
  mod.removeMember(username, lockId, userToRemove, function(result) {
    res.send(result);
  });
})

//add admin (changes role of user from 2 to 1)
app.post("/addAdmin", (req, res) => {
  mod.addAdmins(req.session.username, req.body.username, req.session.lock, function(err, result) {
    err ? res.send(err.message) :  res.send(result.message);
  });
})

app.post("/revokeAdmin", (req,res) => {
  let username = req.session.username;
  let otherUser = req.body.username;
  let lockId = req.session.lock;

  mod.revokeAdmin(username, lockId, otherUser, function(err, result) {
    err ? res.send(err.message) :  res.send(result.message);
  });
})

//add time restrictions to when lock will be locked/unlocked
app.post("/addTimeRestriction", (req, res) => {
  let start = mod.convertToMilitary(req.body.startTime);
  let end = mod.convertToMilitary(req.body.endTime);

    mod.createRole(req.session.username, req.body.action, req.body.username, req.session.lock,
                 start, end, function(result) {res.send(result);})
})

//rule for lock
app.post("/createEvent", (req, res) => {
  mod.createEvent(req.session.lock, req.session.username, req.body.time, function(err, result) {
    console.log(err);
    console.log(result);
    err ? res.send({message: err.message}) : res.send({message: result});
  });
})

//lock function
app.post("/lock", (req, res) => {
  mod.lock(req.session.username, req.session.lock, function(err, result){
    if(result){
      res.send();
    }
    else{
      res.send({error: "You do not have permission to lock!"});
    }
  })
});


// Proccesses the lock registration in the database
app.post("/registerLock", (req, res) => {
  let id = parseInt(req.body.id);
  let username = req.session.username;

  mod.registerLock(id, req.body.lockName, req.session.username, function(result) {
  // let username = req.body.username;
  // mod.registerLock(id, req.body.lockName, req.body.userName, function(result) {
    if(result) {
      req.session.lock = id;
      res.send({redirect: "/dashboard"});
    }
    else {
      res.send({redirect:"failure"});
    }
  });
})

//unlock function
app.post("/unlock", (req, res) => {
  mod.unlock(req.session.username, req.session.lock, function(err, result) {
    if(result) {
      res.send();
    }
    else {
      res.send({error:"You do not have permission to do this!"});
    }
  })
})



/* ---------------------- OTHER STUFF BELOW ---------------------- */

// Template function to do whatever you want every minute

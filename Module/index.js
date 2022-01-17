/**
* Some stuff to do: create a document for the owner inside the role collection
*/
"use strict";
const mongoClient = require("mongodb").MongoClient;
let db = undefined;

const async = require("async");
const assert = require("assert")
const schedule = require('node-schedule');

const OWNER = 3;
const ADMIN = 2;
const MEMBER = 1;

  /**
   * Scheduled check that will occur every minute. Checks the events database and gets all locks with an action at
   * that current time and performs the actions after checking if the user who submitted the
   * request is allowed to perform the action at that certain time.
   */
   const j = schedule.scheduleJob('*/1 * * * *', function() {
    let d = new Date();
  //convert the time accordingly in order to look it up in the database
  let timeInMilitary = "" + convertToMilitary(d.getHours() + ":" + d.getMinutes());
  //look up all events at that specified time
  db.collection("events").find({"time": timeInMilitary}).toArray((err, result) => {
    //for each of those locks, perform the appropriate actions (either lock or unlock)
    for (let i = 0; i < result.length; i++) {
      //if the action was to lock
      if (result[i].action == "lock") {
        //get the user object based on the username
        getUserObject(result[i].username, function(user) {
          //check if the user has the permissions to lock
          if(canLock(user, result[i].lockId)) {
            //update the lock's status in the locks database
            db.collection("locks").update({lockId: result[i].lockId}, {$set: {status: "locked"}}, (err, numberAffected, rawResponse) => {
              if(!err) {
                // removed history instance here
              }
            })
          }
        })
      //if the action was to unlock
    } else {
        //get the user object based on the username
        getUserObject(result[i].username, function(user) {
          //checks if the user can actually unlock the lock
          if(canUnlock(user, result[i].lockId)) {
            //updates the lock's status to unlock in the lock database
            db.collection("locks").update({lockId: result[i].lockId}, {$set: {status: "unlocked"}}, (err, numberAffected, rawResponse) => {
              // REMOVED HISTORY INSTANCE HERE, NEED TO RECHECK ALL OF THIS CODE
            })
          }
        })
      }
    }
  })

});

/**
* Searches through an array of locks for a user and determines if a user is
* assigned to a particular lock ID
*
* @param {int} lockId - id of the lock we are looking for
* @param {array of locks} locks - lock ints that belong to the user
*/
function isUserAssignedToLock(lockId, locksArray) {
  for(let i = 0; i < locksArray.length; i++) {
    if(locks[i] == lockId) {
      return true;
    }
  }
}

/**
* Searches for the user's document in the databse with the given
* username. The user's email is passed in and the userObject will be returned
*
* @param {string} username - username of the user we are looking for
* @param callback - the call back function
*/
function getUserObject(username, callback) {
  db.collection("users").find({"username": username}).toArray((err, result) => {
    if(err) {
      callback(err);
    }
    else {
      callback(null, result[0]);
    }
  })
}

function getLockObject(lockId, callback) {
  db.collection("locks").find({"lockId": lockId}).toArray((err, result) => {
    if(!result.length) {
      callback(new Error("Lock does not exist"));
      return;
    }
    else if(result.length > 1) {
      callback(new Error("There are " + result.length + " instances of this lock"));
      return;
    }
    else if(err) {
      callback(err);
      return;
    }
    else {
      callback(null, result[0]);
      return;
    }
  })
}

function getMember(username, lock) {
  for(let i = 0; i < lock.members.length; i++) {
    if(username == lock.members[i].username) {
      return lock.members[i];
    }
  }
  throw new Error(username + " is not a member of the lock")
}

function getUsersRole(username, lockId, callback) {
  getLockObject(lockId, (err, lock) => {
    if(err) {
      callback(err)
    }
    else {
      let member = getMember(username, lock);
      callback(null, member.role);
    }
  })
}

function checkEventExists(lockId, username, time, callback) {
  db.collection("events").find({lockId: lockId, time: time}).toArray((err, result) => {
    if(err) {
      callback(err)
    }
    else {
      callback(null, result.length == 1);
    }
  })
}

function validateLockAccessInput(memberObject, start, end) {
  if(start > end) {
    throw new Error("Start time must be before end time")
  }
  else {
    for(let i = 0; i < memberObject.lockAccess.length; i++) {
      if(start > memberObject[i][0] && start < memberObject[i][1] 
         && end > memberObject[i][0] && end < memberObject[i][1]) {
           throw new Error(memberObject.username + " already has access at this time");
         }
    }
  }
  return (true);
}

function changeMemberToAdmin(username, lockId, membersArray, callback) {
  for(let i = 0; i < membersArray.length; i++) {
    if(membersArray[i].username == username) {
      membersArray[i].role = ADMIN;
      membersArray[i].lockAccess = [];
      db.collection("locks").update({lockId: lockId}, {$set: {members: membersArray}}, 
                                    (err, numberAffected, rawResponse) => {
        if(err) {
          callback(err);
          return;
        }
        else {
          callback(null, {message: username + " is now an admin"});
          return;
        }
      })
    }
  }
}

function changeAdminToMember(username, lockId, membersArray, callback) {
  for(let i = 0; i < membersArray.length; i++) {
    if(membersArray[i].username == username) {
      membersArray[i].role = MEMBER;
      membersArray[i].lockAccess = [];
      db.collection("locks").update({lockId: lockId}, {$set: {members: membersArray}}, 
                                    (err, numberAffected, rawResponse) => {
        if(err) {
          callback(err);
          return;
        }
        else {
          callback(null, {message: username + " is now a member"});
          return;
        }
      })
    }
  }
}

/**
* Add a new user to the given lock
*
* @param userObject - the document for that user in the database
* @param {int} lockId - the id of the lock that the new user will be added to
*
* Note: When we are adding a new user using this function, we are adding him
* as a member. We also update the member list for that lock.
*/
function addUserToLock(username, lockId) {
  let newMember = {
    "username": username,
    "role": MEMBER,
    "lockAccess": []
  };
  db.collection("locks").find({lockId: lockId}).toArray((err, lock) => {
    let lockMembers = lock[0].members;
    lockMembers.push(newMember);
    db.collection("locks").update({lockId: lockId}, {$set: {members: lockMembers}});
  })
}

function assignLockToUser(username, lockId) {
  getUserObject(username, (err, user) => {
    user.locks.push(lockId);
    db.collection("users").update({username: username}, {$set: {locks: user.locks}});
  })
}

/**
* check if the lock contains a certain member
*
* @param {string} username - the username to be serached
* @param {int} lockId - the id of the lock whose member we are searching through
*/
function lockContainsMember(username, lockId, callback) {
  getLockObject(lockId, (err, lock) => {
    if(err) {
      callback(err);
      return;
    }
    else {
      for(let i = 0; i < lock.members.length; i++) {
        if(username == lock.members[i]) {
          callback(true);
          return;
        }
      }
      callback(false);
      return;
    }
  })
}

/**
* Determines whether a particular user is an owner of a lock. We query the user's
* locks to see if it contains that particular lock and then check the user's role
* under that lock.
*
* @param {string} username - username for a particular user we are querying for
* @param {int} lockId - ID of the lock we are looking for
*/
function isOwner(username, lockObject) {
  let member = getMember(username, lockObject);
  return (member.role == OWNER);
}


/**
* Determines whether a particular user is an admin of a lock. We query the user's
* locks to see if it contains that particular lock and then check the user's role
* under that lock.
*
* @param {string} username - username for a particular user we are querying for
* @param {int} lockId - ID of the lock we are looking at
* @return true or false
*/
function isAdmin(username, lockObject) {
  let member = getMember(username, lockObject);
  return (member.role == ADMIN);

}



/**
* Looks through array and determines if user is member
* @param: username, lockId
* @return: true or false
*/
function isMember(username, lockObject) {
  let member = getMember(username, lockObject);
  return (member.role == MEMBER);
}

/**
 * check if a member is able to make certain action according to the restriction
 * @param userObject - the document of that user from the database
 * @param {int} lockId - the lockId of the lock to be locked/unlocked
 * @param {string} action - lock or unlock
 * @return: true if the user is allowed to make this action
 * false if the user is not allowed to make this action
 */
function withinTimeBounds(username, lockObject, action) {
  getLockObject(lockId, (err, lock) => {
    let member = getMember(username, lock);
    for(let i = 0; i < member.lockAccess.length; i++) {
      if (lock.lockRestrictions[i][0] < currentTime && lock.lockRestrictions[i][1] > currentTime) {
        return true;
      }
    }
  })
  return false;
}

  /**
  * Determines where a user can perform the lock action at the particular time.
  * A user can lock if:
  *  1.) They are an owner of the lock
  *  2.) They are an admin of the lock
  *  3.) They are a member of the lock and do not conflict with any restrictions
  *
  * @param {string} username - username of the user we are querying for
  * @param {int} lockId - ID of the lock in question
  */
  function canLock(user, lockId) {
    return (isOwner(user, lockId) || isAdmin(user, lockId) || withinTimeBounds(user, lockId, "lock"));
  }

  /**
  * Determines where a user can perform the unlock action at the particular time.
  * A user can lock if:
  /  *  1.) They are an owner of the lock
  *  2.) They are an admin of the lock
  *  3.) They are a member of the lock and do not conflict with any restrictions
  *
  * @param {string} username - username of the user we are querying for
  * @param {int} lockId - ID of the lock in question
  */
  function canUnlock(user, lockId) {
    return (isOwner(user, lockId) || isAdmin(user, lockId) || withinTimeBounds(user, lockId, "unlock"));
    //return (isOwner(username, lockId) || isAdmin(username, lockId) || withinTimeBounds(username, lockId, "unlock"));
  }

  /**
  * Determines where a user can add member
  * A user can add member if:
  *  1.) They are an owner of the lock
  *  2.) They are an admin of the lock
  *
  * @param {string} user - username of the user we are querying for
  * @param {int} lockId - ID of the lock in question
  */
  function canAddMembers(username, lockObject) {
    return (isOwner(username, lockObject) || isAdmin(username, lockObject));
  }

  /**
  * Determines whether a user is allowed to create a lock event. A user
  * can create a lock event at a specified time if they are able to
  * lock at that time.
  *
  * @param {string} username - username of the user we are querying for
  * @param {int} lockId - ID of the lock we are checking
  */
  function canCreateLockEvent(username, lockId) {
    return canLock(username, lockId);
  }

  /**
  * Determines whether a user is allowed to create an ulock event or not.
  * A User can create an unlock event at a specified time if they are able
  * to unlock at that time.
  *
  * @param {string} username - user of the user we are querying for
  * @param {int} lockId ID of the lock we are checking
  */
  function canCreateUnlockEvent(username, lockId) {
    return canUnlock(username, lockId);
  }

  /**
  * Given a lockId, returns the name of the lock
  *
  * @param {int} lockId - ID of the lock we are getting information for
  * @param {string} username - I THINK WE CAN DELETE THIS?
  * @param {function} callback - callback function takine gusername and lock name
  */
  exports.getLockInfo = function(lockId, username, callback) {
    db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
      let lockName = result[0].lockName;
      username = username;
      callback({username: username, lockName: lockName});
    })
  }

  /**
  * Function to connect to the server
  */
  exports.connectServer = function() {
    mongoClient.connect("mongodb://ersp:abc123@ds044917.mlab.com:44917/smart-lock", (err, database) => {
      if(err) {
        return console.log(err);
      }

      module.exports.db =  database.db("smart-lock");
      db = database.db("smart-lock");
    })
  }

  /**
  * Determines whether a user is logged in or not
  *
  * @param {string} user - the username of the user that we want to check
  */
  exports.isLoggedIn = function(user) {
    return((user != undefined));
  };


  /**
  * Returns current time
  */
  var getTime = function() {
    let d = new Date();
    let minutes = d.getMinutes();
    let hours = d.getHours();
    if (d.getMinutes() < 10) {
      minutes = "0" + minutes;
    }
    if (d.getHours() > 12) {
      hours = hours % 12;
    }
    let date = hours + ":" + minutes
    if (d.getHours() < 12) {
      date = date + " AM";
    }
    else {
      date = date + " PM";
    }
    return date;
  };

  /**
  * Convert the current time into military time
  */
  var convertToMilitary = function(time) {
    if(time.indexOf("PM") != -1) {
      time = time.replace("PM", "");
      time = time.replace(" ", "");
      let timeArray = time.split(":");
      timeArray[0] = parseInt(timeArray[0]);
      if(timeArray[0] != 12) {
        timeArray[0] += 12;
      }

      let timeString = parseInt(timeArray[0].toString() + timeArray[1]);

      return timeString;
    }
    time = time.replace("AM", "");
    time = time.replace(" ", "");
    let timeArray = time.split(":");
    // if (timeArray[0] < 10) {
    //   timeArray[0] = "0" + timeArray[0];
    // }
    if (timeArray[0] < 10) {
      return ("0" + parseInt(timeArray[0] + timeArray[1]));
    }
    return (parseInt(timeArray[0].toString() + timeArray[1]));
  }


  /**
  * User A can create event E for lock L for time T
  *    - if owner(L) or admin(L) or (member(L) and withinTimeBounds(t))
  *
  * @param lockId - the lockId of te lock that will execute the event
  * @param username - the username of the user who is adding this event
  * @param action - the action to make, which is either "lock" or "unlock"
  * @param time - the time that the event is planned to be preformed
  *
  * NOTE:
  *    - THIS IS SEPARATE FROM THE EVENT ACTUALLY FIRING EVEN THOUGH
  *       THE CHECKS TO SEE IF IT IS ALLOWED TO FIRE WILL BE THE SAME
  *    - We store the user who created the event along with
  *      all of the other event information just to make sure that user
  *      is even allowed to perform that action at that time
  */
  exports.createEvent = function(lockId, username, time, callback) {
    checkEventExists(lockId, username, time, (eventExists) => {
      if(eventExists) {
        callback(new Error("Event already exists"));
        return;

      } 
      else {
        getUsersRole(username, lockId, (err, role) => {
          if(err) {
            callback(err);
            return;
          }
          else if(role > MEMBER) {
            db.collection("events").insert({lockId: lockId, username: username, time: time}, (err, result) => {
              if(err) {
                callback(err);
                return;
              }
              else {
                callback(null, "Event created successfully");
                return;
              }
            })
          }
          else {
            callback(new Error("You must be an admin or owner in order to create events"));
            return;
          }
        })
      }
    })
  }

  /**
  * Display the settings for different user
  * If user A is owner(L), A is able to addRemoveUser/editAdmin/createEvent
  * If user A is Admin(L), A is able to addRemoveUser/createEvent
  * If user A is member(L), A is able to creteEvent
  *
  * @param lockId - the lockId of the lock that we are looking
  * @param username - the username of the user that we are looking
  */
  exports.getSettings = function(username, lockId, callback) {
    // validate user in case the user does not exist
    let settings = [];
    getUsersRole(username, lockId, (err, role) => {
      if(role == OWNER) {
        settings.push("Add/Remove Users");
        settings.push("Edit Users");
        settings.push("Create Event");
      }
      else if(role == ADMIN) {
        settings.push("Add/Remove Users");
        settings.push("Create Event");
      }
      else{
        settings.push("Create Event");
      }
      callback({setting: settings});
    })
  }

  /**
  * Switch between setting tabs
  *
  * @param {string} settingName - the name of the setting to be switched to
  *
  */
  exports.switchSettings = function(settingName, callback) {
    if(settingName == "Add/Remove Users") {
      callback("addMembers");
    }
    else if(settingName == "Edit Users") {
      callback("editAdmins");
    }
    else if(settingName == "Create Event") {
      callback("addEvents");
    }
    else{
      callback("error");
    }
  }

  /**
  * Creates role for user and adds associated restrictions
  *
  * Given user M who called the request
  * upon user M', lock L, action A, start time s, end time e
  *
  * M should be able to create a restriction for M' iff
  *    - ( isOwner(M, L) or isAdmin (M, L) ) and ( !isOwner(M', L) and !isAdmin(M', L) )
  *    - start and end create a valid timeframe for an unlock
  *
  * @param action - the action that we want to add restrictions to
  * @param username - the username of the user who is calling this function.
  *       He should either be an owner or an admin of this lock
  * @param userToChange - the username of the user whose role will be modified.
  *       He should be a member of this lock
  * @param lockId - the lockId of the lock that is associted
  * @param start - the starting time of the restriction
  * @param end - the end time of the restriction
  *
  * @return: true if role was created else false
  *
  *
  * NOTES:
  *    - the times may need to be converted to military if they already aren't
  *    - we'll need to check if it is an unlock or lock restriction
  *    - use the callback to return the success/failure
  */
  exports.giveLockAccess = function(username, lockMember, lockId, start, end, callback) {
    getLockObject(lockId, (err, lock) => {
      if(err) {
        callback(err);
      }
      else {
        try {
          let memberRequestingChange = getMember(username, lock);
          let memberBeingChanged = getMember(lockMember, lock);
        }
        catch(e) {
          callback(e)
        }
        if(isOwner(username, lock) || isAdmin(username, lock)) {
          if(validateLockAccessInput(memberBeingChanged, start, end)) {
            memberBeingChanged.lockAccess.push([start, end]);
          }
        }
        else {
          callback(new Error("You must be an owner or admin of the lock"))
        }
      }
    })

  }

/**
* Gets the array of member OBJECTS of a specific lock
* @param lockId - the lock Id of the lock that we want to get members of
* @return array of members or message saying there are no members
*/
exports.getLockMembers = function(lockId, callback) {
  let membersArray = [];
  getLockObject(lockId, (err, lock) => {
    if(err) {
      callback(err);
    }
    else {
      for(let i = 0; i < lock.members.length; i++) {
        if(lock.members[i].role == MEMBER) {
          membersArray.push(lock.members[i].username);
        }
      }
      callback(null, membersArray);
    }
  })
}

/**
* Gets the admins and the owner of a specific lock
* @param: lockId - the lock id of lock whose admins we want
* @return: array of admins
*/
exports.getLockAdmins = function(lockId, callback) {
  // Validate lock id in case it doesn't exist
  let adminArray = [];
  getLockObject(lockId, (err, lock) => {
    if(err) {
      callback(err);
    }
    else {
      for(let i = 0; i < lock.members.length; i++) {
        if(lock.members[i].role == ADMIN) {
          adminArray.push(lock.members[i].username);
        }
      }
      callback(null, adminArray);
    }
  })
}

/**
* Get the list of locks of the specific user
* @param: username, callback
* @return: locknames
*/
exports.getUsersLocks = function(username, callback) {
  // validate user in case it doesn't exist
  getUserObject(username, (err, user) => {
    let lockIds = user.locks;
    let locks = [];
    async.each(lockIds, (lockId) => {
      getLockObject(lockId, (err, lock) => {
        if(err) {
          callback(err);
        }
        else {
          locks.push(lock);
        }
      })
    }, (err) => {
      if(err) {
        callback(err);
      }
      else {
        callback(locks);
      }
    })
  })

}

/**
* Locks the lock, checks lock restrictions
* @param: username, lockId, callback
* @return:true if locked, else false
*/
exports.lock = function(username, lockId, callback) {
  getLockObject(lockId, function(err, lock) {
    if(canLock(username, lock)) {
      db.collection("locks").update({lockId: lockId}, {$set: {status: "locked"}}, (err, numberAffected, rawResponse) => {
        if(!err) {
          callback(null, true);
        }
      })

    }
  })
}


/**
* Adds a member to lock by adding specified user to database
*
* Given user M who called the request
* upon user M', lock L
*
* M should be able to add M' as a member iff
*    - isOwner(M, L) or isAdmin (M, L) (checked by calling canAddMembers)
*    - M' is a user in the database
*
* @param: username, lockId
* @return: true if added sucessfully, else false
*/
exports.addMember = function(username, userToAdd, lockId, callback) {
  console.log("username is " + username);
  getLockObject(lockId, (err, lock) => {
    if(err) {
      console.log("error getting lock " + err);
      callback(err);
      return;
    }
    else if(canAddMembers(username, lock)) {
      lockContainsMember(userToAdd, lockId, (err, alreadyAdded) => {
        if(err) {
          callback(err);
          return;
        }
        else if(alreadyAdded) {
          callback(new Error("User already added"));
          return;
        }
        else {
          addUserToLock(userToAdd, lockId);
          assignLockToUser(userToAdd, lockId);
          callback({message: "User successfully added!"});
          return;
        }
      })
    }
  })

}

/**
* Changes the status of a member to an admin
*
* Given user M who called the request
* upon user M', lock L, if M is an admin and M' is a member
*
* M should be able to add M' as a admin iff
*    - isOwner(M, L)
*    - M' is a member in the database
*
* @param: username, userToAdmin, lockId
* @return: message based on if it was successful
*/
exports.addAdmins = function(username, userToAdmin, lockId, callback) {
  //check if this user can add admins
  getLockObject(lockId, (err, lock) => {
    if(err) {
      callback(err);
      return;
    }
    else if(isAdmin(userToAdmin, lock)) {
      callback(new Error(userToAdmin + " is already an admin"));
      return;
      console.log("after error");
    }
    else if(isOwner(username, lock) && isMember(userToAdmin, lock)) {
      changeMemberToAdmin(userToAdmin, lockId, lock.members, (err, result) => {
        if(err) {
          callback(err);
          return;
        }
        else {
          console.log("result is " + result);
          callback(null, result);
          return;
        }
      });
    }
    else {
      console.log("throwing error");
      callback(new Error("Either " + username + " is not owner or " + userToAdmin +
                         " is not part of lock"));
      return;
    }
  })
}

/**
* Unlock the lock
* @param: username, lockId, callback
* @return: false if not unlocked
*/
exports.unlock = function(username, lockId, callback) {
  getLockObject(lockId, function(err, lock) {
    if(canUnlock(username, lock)) {
      db.collection("locks").update({lockId: lockId}, {$set: {status: "unlocked"}}, (err, numberAffected, rawResponse) => {
        if(!err) {
          callback(null, true);
        }
      })

    }
  })
}

/**
* Registers lock to database by recording lockId, role and restrictions
* if lock is already registered then send back failure
* @param: lockId, lockName, userName, callback
*/
exports.registerLock = function(lockId, lockName, userName, callback) {

  db.collection("users").find({"username": userName, "locks.lockId": lockId}).toArray((err, result) => {
    if(result.length > 0) {
      console.log("registered");
      // There are people with this lock so it must have been registered
      callback(false);
      return;
    }
  })

  // careful at async issues here, might want to take a closer look


  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    if(result[0].owner == undefined) {
      // assign user to the lock
      assignLockToUser(userName, lockId);
      addUserToLock(userName, lockId);
      db.collection("locks").update({lockId: lockId}, {$set: {owner: userName, lockName: lockName}});
      callback(true);
    }
    else {
      console.log("registered");
      // lock was already registered with someone so we send back a failure
      callback(false);
    }
  })
}

/**
* Gets the status of the lock (whether it is locked or unlocked)
* @param: lockId, callback
* @return: string either "locked" or "unlocked"
*/
exports.getLockStatus = function(lockId, callback) {

  // what if lock doesn't exist?
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    callback({status: result[0].status});
  })
}


function defaultDB() {
  for(let i = 0; i < 50; i++) {
    db.collection("locks").insert({lockId: i, lockName: null, owner: undefined, status: "locked", members: []});
  }
}

exports.authenticate = function(username, fullname,  callback) {
 // defaultDB();
  /**
  * Determines whether or not the user has a lock associated through steps
  * - Attempt to see if the user is in the database with their email
  *    - If the resulting array != 0, then we found a user in the database
  *      - If the lock id associated is null, then the user needs to register their lock
  *      - Else the user has a lock associated and we can send them to the dashboard
  *    - Else the resulting array size == 0, then we must first add the user to the
  *      database before redirecting them to register their lock
  */
  db.collection("users").find({username: username}).toArray((err, result) => {
    //If the user exists, redirect the user according to the number of locks he has
    if(result.length) {
      if(result[0].locks.length == 0) {
        callback({locks: []}, undefined);
      }
      else if(result[0].locks.length == 1) {
        callback({locks: result[0].locks}, result[0].locks[0]);
      }
      else {
        callback({locks: result[0].locks}, undefined)
      }
    }
    //If the user does not exist, create a document for the user in the database and redirect him to register page
    else {
      db.collection("users").insert({username: username, name: fullname, locks: []}, (err, doc) => {
        callback({locks:[]})})
      }
    })
  }

  /**
  * Gets dashoard info including lockname and username
  * @param: username, lockId, callback
  */
  exports.getDashboardInformation = function(username, lockId, callback) {
    db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
      let lockName = result[0].lockName;
      callback({username: username, lockName: lockName});
    })
  }

  /**
  * Check is user can remove members from lock
  * @param: username, lockId, otherUser
  * retunr: true if can remove, else false
  */
  function canRemoveMem(username, lockId, otherUser) {
    return(isOwner(username, lockId));
  }

  /**
  * Check if user can add admins
  * @param: username, lockId
  * @return: true if can add, else false
  */

  function canAddAdmin(username,lockId){
    return(isOwner(username, lockId));
  }

  /**
  * Checks if person can remove an admin, if they can then remove admin by
  * changing role number to 2
  * @param: username lockId, otherUser, callback
  * @return none
  */
  exports.revokeAdmin = function(username, lockId, usernameRequested, callback) {
    getLockObject(lockId, (err, lock) => {
      if(err) {
        callback(err);
        return;
      }
      else if(isMember(usernameRequested, lock) || isOwner(usernameRequested, lock)) {
        callback(new Error(usernameRequested + " is not an admin"));
        return;
      }
      else if(isOwner(username, lock)) {
        changeAdminToMember(usernameRequested, lockId, lock.members, (err, result) => {
          if(err) {
            callback(err);
          }
          else {
            callback(null, result);
          }
         // err ? callback(err) : callback(null, result);
        })
      }
      else {
        callback(new Error("Could not remove " + usernameRequested + " as admin"));
        return;
      }
    })
  }

  exports.removeMember = function(username, lockId, otherUser, callback) {
    let message = "what";
    getUserObject(username, function(user) {
      if (isOwner(user, lockId)) {

        //updates and deleted the lock from the users collection for that user
        db.collection("users").find({"username": otherUser}).toArray((err, result2) => {
          if(result2.length == 0) {
            callback({message: "ERROR"});
            return;
          }
          //go through the locks array and change the lock to delete to NULL
          let newLocksArray = [];
          //if is was not the the lock we deleted, then we add it into new array
          for (let i = 0; i < result2[0].locks.length; i++) {
            if (result2[0].locks[i] != lockId) {
              newLocksArray.push(result2[0].locks[i]);
            }
          }
          //update the locks array for the user that we wanted to delete from that lock
          db.collection("users").update({username: otherUser}, {$set: {locks: newLocksArray}}, (err, numberAffected, rawResponse) => {})

          //updates the members array in the locks collection for that lockId
          db.collection("locks").find({"lockId": lockId}).toArray((err, result) => {
            if(result.length == 0) {;
              callback({message: "ERROR"});
              return;
            }  
            let newArray = [];
            //if is was not the the user we deleted, then add into the new array
            for (let i = 0; i < result[0].members.length; i++) {
              if (result[0].members[i] != otherUser) {
                newArray.push(result[0].members[i]);
              }
            }
            //update the members array for this lock to the new array
            db.collection("locks").update({lockId: lockId}, {$set: {members: newArray}}, (err, numberAffected, rawResponse) => {})
            callback({message: "User Successfully Deleted"});
          })

        })

      }
      else {
      }
    })
  }

// try to move active locks away from DB and into a global variable
exports.insertActiveLock = function(activeLock) {
  db.collection("active-locks").insert(activeLock);
}

exports.deleteActiveLock = function(socketId) {
  db.collection("active-locks").deleteOne(socketId);
}

exports.getSocketId = function(username, lockId, callback) {

  db.collection("active-locks").find({lockId: lockId}).toArray((err, result) => {
    getUserObject(username, function(user) {
      if(user == undefined) {
        callback({Error: "User does not exist!"});
      }
    })
    if(result.length) {
      callback({socketId: result[0].socketId});
    }
    else {
      callback(false);
    }
  })
}

exports.getDefaultState = function(lockId, callback) {
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    callback(result[0].status);
  })
}

module.exports.convertToMilitary = convertToMilitary;
module.exports.getTime = getTime;

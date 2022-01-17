"use strict";
var email;
var name;

/*
 * signs in user and authentictes them
 * @param: googleUser - email
 */
function onSignIn(googleUser) {
  if(googleUser) {
    var profile = googleUser.getBasicProfile();
    name = profile.getName();
    email = profile.getEmail();
    //console.log("email in onSignIn: " + email);
    $.get("/authenticate", {email: profile.getEmail(), fullname: profile.getName()}, function(data) {
      if(data.locks.length > 1) {
        window.location = "selectLock";
      }
      else if(data.locks.length == 0) {
        window.location = "register";
      }
      else {
        window.location = "dashboard";
      }
    })
  }
}

/*
 * Loads Dashoard info with name and lock name
 * @param: none
 */
function loadDashboard() {
  $.get("/dashboardInformation", function(data) {
    $(".username").text(name);
    $(".lockname").text(data.lockName);
    $(".header").text("Welcome to " + data.lockName + ", " + name + "!");
  })
}

/*
 * Loads users locks
 * @param: none
 */
function loadLocks(){
  $.get("/getLocks", function(data) {
    let list = document.getElementById("dashboardComponents");
    for(var i = 0; i < data.locks.length; i++) {
      var lock = document.createElement("a");
      lock.appendChild(document.createTextNode(data.lockNames[i]));
      lock.setAttribute("class", "sidenav-second-level collapse locksonSiderbar");
      lock.setAttribute("id", data.locks[i]);
      var lockElement = document.createElement("li");
      lockElement.appendChild(lock);
      list.appendChild(lockElement);
    }
  })
}

/*
 * Switches lock to another of the the locks user has access to
 * @parmam: none
 */
function switchLock() {
  $(document).on("click", ".locksonSiderbar", function(element) {
    $.get("/switchLock", {lockId: event.target.id}, function() {
      window.location = "dashboard";
    })
  })
}

/*
 * Loads settings (add/Remove users, edit Users, create event)
 * @param:none
 */
function loadSettings() {
  $.get("/getSettings", function(data) {
    let list = document.getElementById("settingsComponents");
    for(var i = 0; i < data.setting.length; i++) {
      var setting = document.createElement("a");
      setting.appendChild(document.createTextNode(data.setting[i]));
      setting.setAttribute("class", "sidenav-second-level collapse settingsonSiderbar");
      setting.setAttribute("id", data.setting[i]);
      var settingElement = document.createElement("li");
      settingElement.appendChild(setting);
      list.appendChild(settingElement);
    }
  })

}

/**
 * Switch settings according to page selected
 * @param: none
 */
function switchSettings() {
  $(document).on("click", ".settingsonSiderbar", function(element) {
    $.get("/switchSettings", {setting: event.target.id}, function(data) {
      // console.log("data in switchSettings is: " + data);
      window.location = data;
    })
  })
}

/*
 * Register lock with email and lock id
 * @param:none
 */
function registerLock() {
  //console.log("user name in scripts.js is : " + email);
  $.post("/registerLock", {id: document.getElementById("id").value, lockName: document.getElementById("lock-name").value}, function(data) {
    if(data.redirect == "failure") {
      $(".lockTaken").text("Taken");
    }
    else {
      window.location = data.redirect;
    }
  })
}

/**
 * Gets the status of the specific lock, whether lock is locked/unlocked
 * @param: none
 */
function getLockStatus() {
  $.get("/lockStatus", function(data) {
    if(data.status == "locked") {
      $("#lock-action").text("unlock");
      $("#lock-status").text("locked");
    }
    else {
      $("#lock-action").text("lock");
      $("#lock-status").text("unlocked");
    }
  })
}

/**
 * Adds member to lock by submitting form and displaying message once
 * they have been added
 */
function addMember() {
  $("#add-member-form").submit(function(event) {
    event.preventDefault();
    $.post("/addMember", {username: document.getElementById("username").value}, function(data) {
      document.getElementById("response-message").innerHTML = data.message;
    })
  })
}

/**
 * Remove member to lock by submitting form and displaying message once
 * they have been removed
 */
function removeMember() {
  $("#remove-member-form").submit(function(event) {
    event.preventDefault();
    $.post("/removeMember", {username: document.getElementById("members").value}, function(data) {
      document.getElementById("response-message").innerHTML = data.message;
    })
  })
}

/**
 * Add an administrator to specific lock by submitting form
 * @param: none
 */
function addAdmin() {
   $("#edit-admin-form").submit(function(event) {
      event.preventDefault();
      $.post("/addAdmin", {username: document.getElementById("members").value}, function(data) {
         document.getElementById("response-message-addAdmin").innerHTML= data;
      })
   })
}

/**
 * Add an administrator to specific lock by submitting form
 * @param: none
 */
function removeAdmin() {
   $("#remove-admin-form").submit(function(event) {
      event.preventDefault();
      console.log("in scripts.js: " + document.getElementById("admins").value);
      $.post("/revokeAdmin", {username: document.getElementById("admins").value}, function(data) {
         document.getElementById("response-message-removeAdmin").innerHTML= data.message;
      })
   })
}

/**
 * Gets the members of a lock
 * @param: none
 */
function getMembers() {
  $.get("/getMembers", function(data) {
    var list = document.getElementById("membersList");
    for(var i = 0; i < data.members.length; i++) {
      var member = document.createElement("option");
      member.appendChild(document.createTextNode("hi " + data.members[i] /*+ ": " + data.fullnames[i]*/));
      list.appendChild(member);
    }
  })
}

/**
 * Displays the history of the lock including action and member who executed it
 * @param:none
 */
function showHistory() {
  $.get("/showHistory", function(data) {
    var list = document.getElementById("historyList");
    if (data.members.length > 5) {
      for(var i = data.members.length - 2; i > data.members.length - 7; i--) {
        var mem = document.createElement("ul");
        mem.appendChild(document.createTextNode("Last " + data.memActions[i] + "ed at " + data.members[i]));
        list.appendChild(mem);
      }
    }

    if (data.members.length > 1 && data.members.length < 4) {
      for(var i = 0; i < data.members.length-1; i++) {
        var mem = document.createElement("ul");
        mem.appendChild(document.createTextNode("Last " + data.memActions[i] + "ed at " + data.members[i]));
        list.appendChild(mem);
      }
    }

    // if (data.members.length < 2) {
    //   var mem = document.createElement("ul");
    //   mem.appendChild(document.createTextNode("Not yet locked or unlocked");
    //   list.appendChild(mem);
    // }
  })
}

/**
 * Create lock event (time to unlock)
 * @param:none
 */
function createLockEvent() {
  $("#add-rules-form").submit(function(e) {
    e.preventDefault();
  });

  var action = undefined;
  if(document.getElementById("unlock").checked) {
    action = "unlock";
  }
  else {
    action = "lock";
  }
  var hourSelect = document.getElementById("hour")
  var hourOption = hourSelect.options[hourSelect.selectedIndex].text;
  var minuteSelect = document.getElementById("minute")
  var minuteOption = minuteSelect.options[minuteSelect.selectedIndex].text;
  var periodSelect = document.getElementById("period")
  var periodOption = periodSelect.options[periodSelect.selectedIndex].text;
  var time = hourOption + ":" + minuteOption + " " + periodOption;

  $.post("/createEvent", {action: action, time: time}, function(result) {
    console.log(result.message);
    document.getElementById("response-message-addEvent").innerHTML = result.message;
  });
}

/*Get the ststis of the lock and light up led based on status
 * @param:none
 */
function getLockStatus() {
  $.get("/lockStatus", function(data) {
    if(data.status == "locked") {
      $("#lock-action").text("unlock");
      $("#lock-status").text("locked");
      socket.emit("initial", 0);
    }
    else {
      $("#lock-action").text("lock");
      $("#lock-status").text("unlocked");
      socket.emit("initial", 1);
    }
  })
}

/**
 * Change the lock (unlock/lock) and change led accordingly
 * @param:none
 */
function changeLock() {
  if (document.getElementById("lock-status").innerHTML == "locked") {
    $.post("/unlock", function(data) {
      if(data.error) {
        $(".error-message").text(data.error);
      }
      else {
        $(".error-message").text("");
        getLockStatus();
      }
    });
  }
  else {
    $.post("/lock", function(data) {
      if(data.error) {
        $(".error-message").text(data.error);
      }
      else {
        $(".error-message").text("");
        getLockStatus();
      }
    });
  }
}

/**
 * Get the time to display
 * @param:none
 */
function getTime() {
  $.get("/timeStatus", function(data) {
    $("#time").text(data);
  })
  setTimeout(function () {
    getTime();
  }, 1000);
}

/**
 * Adds timer
 * @param:none
 */
function addTimer() {
  var $select = $(".1-12");
  for (i=1; i<=12; i++) {
    $select.append($('<option></option>').val(i).html(i))
  }
  var $select = $(".0-60");
  for (i=0; i<=60; i++) {
    var j = i;
    if (j < 10) {
      j = "0" + j
    }
    $select.append($('<option></option>').val(j).html(j))
  }
}

/**
 * Get the name of member of lock and display
 * @param:none
 */
function getName() {
  $.get("/getName", function(name) {
    document.getElementById("lock-name").value = (name + "'s Lock");
  })
}

/**
 * Get locks of user
 * @param:none
 */
function getLocks() {
  $.get("/getLocks", function(data) {
    var list = document.getElementById("locks-list");

    for(var i = 0; i < data.locks.length; i++) {
      var button = document.createElement("button");
      button.appendChild(document.createTextNode(data.lockNames[i]));
      button.setAttribute("class", "lock");
      button.setAttribute("id", data.locks[i]);
      var lockElement = document.createElement("li");
      lockElement.appendChild(button);

      list.appendChild(lockElement);
    }
  })
}

/**
 * Select dashboard to display for user
 * @param:none
 */
function selectDashboard() {
  $(document).on("click", ".lock", function(element) {
    $.get("/selectDashboard", {lockId: event.target.id}, function() {
      window.location = "/dashboard";
    })
  })
}

/**
 * Load Times on dashboard
 * @param:none
 */
function loadTimes() {
  for(var i = 0; i < 60; i++) {
    var select = document.getElementById("minute");
    var time = document.createElement("option");
    if(i < 10) {
      time.text = "0"+i;
    }
    else {
      time.text = i;
    }
    select.add(time);
  }
  for(var i = 1; i < 13; i++) {
    var select = document.getElementById("hour");
    var time = document.createElement("option");
    time.text = i;
    select.add(time);
  }
}

/**
 * Loads time
 */
function loadTimesTwo() {
  for(var i = 0; i < 60; i++) {
    var select = document.getElementById("minuteTwo");
    var time = document.createElement("option");
    if(i < 10) {
      time.text = "0"+i;
    }
    else {
      time.text = i;
    }
    select.add(time);
  }
  for(var i = 1; i < 13; i++) {
    var select = document.getElementById("hourTwo");
    var time = document.createElement("option");
    time.text = i;
    select.add(time);
  }
}

/**
 * Loads sign out function
 * @param:none
 */
function signOut() {
  var auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(function () {
  });
}

/**
 * load authentication
 */
function onLoad() {
  gapi.load('auth2', function() {
    gapi.auth2.init();
  });
}

/*function updateRole() {
  var canAddMembers = document.getElementById("can-add-members").checked;
  var cancreateEvents = document.getElementById("can-create-rules").checked;
  var canManageRoles = document.getElementById("can-manage-roles").checked;
  var usernameSelect = document.getElementById("members");
  var username = usernameSelect.options[usernameSelect.selectedIndex].text;
  $.post("/updateRole", {username: username, canAddMembers: canAddMembers, cancreateEvents: cancreateEvents, canManageRoles: canManageRoles});
  var action = undefined;
  if(document.getElementById("addMembers").checked) {
    canAddOthers = "yes";
  }
  else {
    canAddOthers = "no";
  }

  if(document.getElementById("unlock").checked) {
    action = "unlock";
  }
  else {
    action = "lock";
  }
}*/

/**
 * Sets up drop down for admins of a lock
 */
function getAdminDropDown() {
   $.get("/getAdmins", function(data) {
    console.log("in scirpts.js: data.member is: " + data.members);
      let select = document.getElementById("admins");
      for(let i =0; i < data.members.length; i++){
         let option = document.createElement("option");
         option.text = data.members[i];
            if(option.text != data.owner) {
               select.add(option);
            }
      }

   })
}
/**
 * sets up a drop down of members of a lock
 */
function getMembersDropDown() {
  $.get("/getMembers", function(data) {
    let select = document.getElementById("members");
    for(var i = 0; i < data.members.length; i++) {
      var option = document.createElement("option");
      option.text = data.members[i];
      if (option.text != data.owner) {
        select.add(option);
      }
    }
    //select.selectedIndex = "0";
    //getMemberInfo();
  })
}

/**
 * Gets members of a lock
 */
// function getMemberInfo() {
//   var memberSelect = document.getElementById('members');
//   var memberOption = memberSelect.options[memberSelect.selectedIndex].text;

  /**
   * This doesn't work anymore so we need to change what was going on here
   *

  $.get("/memberRoleInfo", {username: memberOption}, function(data) {
   if(!data.roles) {
      document.getElementById("can-manage-roles").checked = true;
      document.getElementById("can-add-members").checked = true;
      document.getElementById("can-create-rules").checked = true;
    }
    else {
      document.getElementById("can-manage-roles").checked = data.roles.canManageRoles;
      document.getElementById("can-add-members").checked = data.roles.canAddMembers;
      document.getElementById("can-create-rules").checked = data.roles.cancreateEvents;
    }
  })
     */
//}


/**
 * sets up a drop down of admins of a lock
 */
/*function getAdminDropDown() {
  $.get("/getAdmins", function(data) {
    let select = document.getElementById("admins");
    for(var i = 0; i < data.admins.length; i++) {
      var option = document.createElement("option");
      option.text = data.admins[i];
      if (option.text != data.owner) {
        select.add(option);
      }
    }
    select.selectedIndex = "0";
    getAdminInfo();
  })

}*/

/**
 * Gets members of a lock
 */
function getAdminInfo() {
  var adminSelect = document.getElementById('admins');
  var adminOption = adminSelect.options[adminSelect.selectedIndex].text;
}

/**
 * Makes time restriction for user on specific lock
 * @param:none
 */
function addTimeRestriction() {
  var memberSelect = document.getElementById('membersList');
  var memberOption = memberSelect.options[memberSelect.selectedIndex].text;

  var action = undefined;
  if(document.getElementById("unlock").checked) {
    //console.log("unlock!");
    action = "unlock";
    document.getElementById("unlock").checked = false;
  }
  if(document.getElementById("lock").checked){
    //console.log("lock!");
    action = "lock";
    document.getElementById("lock").checked = false;
  }

  var roleLabel = document.getElementById("roleName")
  var hourSelect = document.getElementById("hour")
  var hourOption = hourSelect.options[hourSelect.selectedIndex].text;
  var minuteSelect = document.getElementById("minute")
  var minuteOption = minuteSelect.options[minuteSelect.selectedIndex].text;
  var periodSelect = document.getElementById("period")
  var periodOption = periodSelect.options[periodSelect.selectedIndex].text;

  var hourTwoSelect = document.getElementById("hourTwo")
  var hourTwoOption = hourTwoSelect.options[hourTwoSelect.selectedIndex].text;
  var minuteTwoSelect = document.getElementById("minuteTwo")
  var minuteTwoOption = minuteTwoSelect.options[minuteTwoSelect.selectedIndex].text;
  var periodTwoSelect = document.getElementById("periodTwo")
  var periodTwoOption = periodTwoSelect.options[periodTwoSelect.selectedIndex].text;
  var time = hourOption + ":" + minuteOption + " " + periodOption;
  var timeTwo = hourTwoOption + ":" + minuteTwoOption + " " + periodTwoOption;
  hourOption = parseInt(hourOption);
  hourTwoOption = parseInt(hourTwoOption);
  minuteOption = parseInt(minuteOption);
  minuteTwoOption = parseInt(minuteTwoOption);
  if (periodOption == "PM") {
    hourOption = hourOption + 12;
  }
  if (periodTwoOption == "PM") {
    hourTwoOption = hourTwoOption + 12;
  }
  if (hourTwoOption < hourOption || (hourTwoOption == hourOption && minuteTwoOption < minuteOption)) {
   //$("#addingRoles").submit(function(event) {
    event.preventDefault();
    document.getElementById("invalidTime").innerHTML="That is an invalid time. Please try again!";
    //})
  }
  event.preventDefault();
  console.log("time inscript.js: " + time + "  " + timeTwo);
  $.post("/addTimeRestriction", {username: memberOption, action: action, startTime: time, endTime: timeTwo}, function(data) {
      document.getElementById("response-message-addTimeRestriction").innerHTML= data.message;

  })

}


/**
 * I think we need to double check the following, need to change how
 * we are checking roles?


function canAddRules() {
  $.get("/canAccess", function(data) {
   if (data.roles.cancreateEvents == false) {
    event.preventDefault();
    document.getElementById("add-rules-form").style.display = "none";
    document.getElementById("invalidAccess").innerHTML="You don't have access to this page!";
  }
  })
}


function canAddRoles() {
  $.get("/canAccess", function(data) {
   if (data.roles.canManageRoles == false) {
    //document.getElementyId().style.display="none";
    event.preventDefault();
    document.getElementById("addingRoles").style.display = "none";
    document.getElementById("invalidAccess").innerHTML="You don't have access to this page!";
  }
})
}

*/

// lock with ID = 1s
const io = require('socket.io-client');
"use strict";
const socket = io.connect('http://100.81.33.111:3000', {reconnect: true,
              query: "lockId=20"});
const Gpio = require("pigpio").Gpio;
const GPIO = require("rpi-gpio");
const motor = new Gpio(22, {mode:Gpio.OUTPUT});
motor.enableInterrupt(Gpio.EITHER_EDGE);

GPIO.setup(11, GPIO.DIR_IN);

var pulseWidth = 1000;
var increment = 100;
console.log("on");
// Add a connect listener
socket.on('connect', function (data) {
    console.log('Connected!');
});

socket.on("disconnect", function(data) {
	motor.servoWrite(1000);
})

socket.on("defaultState", function(state) {
	if(state == "locked") {
		motor.servoWrite(1200);
	}
	else {
		motor.servoWrite(1400);
	}
})

socket.on("lock", function(data) {
	console.log("got a lock request");
	console.log(motor.getPwmFrequency());
	let beforeVal;
	let afterVal;
	//read current status of the metal touch sensor
	GPIO.read(11, function(err, value) {
		if (err) throw err;
		beforeVal = value;
	});
	//if sensor is low (unlocked)
	if (beforeVal == false) {
		//turn lock
		motor.servoWrite(1800);
		//wait 3 seconds
		setTimeout(
			//check status of metal sensor again
			GPIO.read(11, function(err, value2) {
				if (err) throw err;
				afterVal = value2;
			});
			//if still unlocked, then send error message and undo action
			if (afterVal == false) {
				//turn motor back
				motor.servoWrite(1000);
				//indicate error message
				console.log("ERROR");
			}
		, 3000);
	}
})

socket.on("unlock", function(data) {
	console.log("got an unlock request");
	console.log(motor.getPwmFrequency());
	let beforeVal;
	let afterVal;
	//read current status of the metal touch sensor	
	GPIO.read(11, function(err, value) {
		if (err) throw err;
		beforeVal = value;
	});
	//if sensor is high (locked)
	if (beforeVal == true) {
		//turn to unlock
		motor.servoWrite(1000);
		//wait 3 seconds
		setTimeout(
			//check status of the metal sensor again
			GPIO.read(11, function(err, value2) {
				if (err) throw err;
				afterVal = value2;
			});
			//if still locks, then send an error message and undo action
			if (afterVal == true) {
				//turn motor back
				motor.servoWrite(1800);
				//indicate error message
				console.log("ERROR");
			}
		, 3000);
	}
})

process.on("exit", function() {
	console.log("test");
	motor.servoWrite(1000);
})

process.on("SIGINT", function() {
	process.exit();
});

function onEnd() {
	motor.servoWrite(1000);
}



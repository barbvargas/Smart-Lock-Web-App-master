const GPIO = require("rpi-gpio");

GPIO.setup(11, GPIO.DIR_IN, readInput);
GPIO.setup(12, GPIO.DIR_OUT, write);


function readInput(err) {
  if (err) throw err;
  GPIO.read(11, function(err, value) {
    if (err) throw err;
    console.log("the value is " + value);
    //if (value == true) {
      //return;
    //}
    //readInput(); 
  });
  GPIO.read(11, function(err, value) {
    if (err) throw err;
    console.log("the value is " + value);
    //if (value == true) {
      //return;
    //}
    //readInput(); 
  });
}

function write(err) {
  if (err) throw err;
  GPIO.write(12, true, function (err) {
    if (err) throw err;
    console.log("Written to LED");
  });
}

function test() {
    console.log("hello");
}

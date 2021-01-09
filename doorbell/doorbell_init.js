/** NodeJS script to initiate the doorbell monitoring
    There are two doorbell buttons that we need to monitor 
    for a button press.
**/

var debug = require('debug')('pi_doorbell:DoorBellInit');

const DoorBellBtn = require('./doorbell_gpio');

const config = require('config');

// Get doorbell GPIO pin values
var bellInputPin1 = config.get('doorbell.doorbell_pin_1');
var bellInputPin2 = config.get('doorbell.doorbell_pin_2');

class DoorBellInit {
    constructor() {
        // Initate the first button
        this.doorbell_btn1 = new DoorBellBtn(bellInputPin1);
        this.doorbell_btn1.watch_button_press();
        
        // Initate the second button
        this.doorbell_btn2 = new DoorBellBtn(bellInputPin2);
        this.doorbell_btn2.watch_button_press();
    }
}

module.exports = DoorBellInit


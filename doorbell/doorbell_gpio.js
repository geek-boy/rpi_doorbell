/**
 * Class to monitor Raspberry Pi GPIO for trigger from doorbell button push
 **/
var debug = require('debug')('pi_doorbell:DoorBellBtn');

const DoorBellDaemon = require('./doorbell_daemon');

const Gpio = require('onoff').Gpio;

// We only need one Daemon monitoring to play sounds
const doorbelld = DoorBellDaemon.getInstance();
doorbelld.listen();

class DoorBellBtn extends Gpio{
    constructor(gpio_pin_id) {
        super(gpio_pin_id, 'in','rising');
    }
    
    watch_button_press() {
        this.watch(function (err, value) {
            if (err) {
                throw err;
            }

            doorbelld.ringDoorbell();
        });
    }
}


module.exports = DoorBellBtn


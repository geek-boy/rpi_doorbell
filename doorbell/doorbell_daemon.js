/** Daemon to respond to a button push trigger to any selected services that can 
    - playing a sound
    - sending a facebook message
    - sending a pushbullet message
    - sending an SMS message
**/

var debug = require('debug')('pi_doorbell:DoorBellDaemon');

var config = require('config');
var ssh_exec = require('ssh-exec')
const { spawn } = require('child_process');
const sound_path_dir = __dirname + '/../config/sounds';

const sound_file_name = 'default.mp3';

const sound_path = sound_path_dir + '/' + sound_file_name;

//Define Facebook parameters
const fb_page_access_token = require('../config/globals').fb_page_access_token;
const fb_receiver_id = require('../config/globals').fb_receiver_id;
const fb_webhook = require('../routes/index');

//Define PushBullet parameters
const pb_api_key = require('../config/globals').pb_api_key;
const PushBullet = require('pushbullet');
var pusher = null;

if (pb_api_key) { 
  pusher = new PushBullet(pb_api_key);
}
// Send to all PushBullet devices
var pb_deviceID={};

const request = require('request');

// Get doorbell parameter values
const bellPeriod = config.get('doorbell.chime_period');
const bellInputPin1 = config.get('doorbell.doorbell_pin_1');
const bellInputPin2 = config.get('doorbell.doorbell_pin_2');

// Define which services to send notifications to
const services = config.get('doorbell.services');

//Define SMS Gateway parameters
const smsgateway_email = config.get('doorbell.services.smsgateway.params.email');
const smsgateway_device_id = config.get('doorbell.services.smsgateway.params.device_id');
const smsgateway_pass = require('../config/globals').smsgateway_password;
const smsgateway_to_phone_number = config.get('doorbell.services.smsgateway.params.phone');
const smsGateway = require('sms-gateway-nodejs')(smsgateway_email, smsgateway_pass);

//Initialise variables
var bell_trigger_start=0;
var bell_trigger_current=0;

var DoorBellDaemonInstance = null

class DoorBellDaemon {
    constructor(){
        this.name = 'DoorBellDaemon';
    }
    
    static getInstance() {
        if(!DoorBellDaemonInstance) {
            DoorBellDaemonInstance = new DoorBellDaemon()
        }
        
        return DoorBellDaemonInstance;
    }
    
    listen () {
        var d = new Date();
        var n = d.getTime();

        if ( bell_trigger_start!=0) {
            debug(n + ' : Button stopped playing !!');
            debug('bell_trigger_start %d', bell_trigger_start);
        }

        bell_trigger_start=0
        bell_trigger_current=0
        n = d.getTime();
        debug('\n' + n + ' : Awaiting Push Button...');
    }

    // Send a PushBullet note
    pb_sendNote (pb_deviceID, subject,message) {
        if (pusher) {
            pusher.note(pb_deviceID,subject,message, function(error, response) {
            // response is the JSON response from the API
            debug('PushBullet NOTE SENT\nRESP:%j\n\n',response);
            });
        }
    }

    // Sends Facebook messages via the Send API
    fb_callSendAPI (sender_psid, message) {
        if (fb_page_access_token === "") {
            console.log('Facebook PAGE ACCESS TOKEN not set');
            return;
        }
        // Construct the message body
        let request_body = {
            "recipient": {
            "id": sender_psid
            },
            "message": message
        }

        // Send the HTTP request to the Messenger Platform
        request({
            "uri": "https://graph.facebook.com/v2.6/me/messages",
            "qs": { "access_token": fb_page_access_token },
            "method": "POST",
            "json": request_body
        }, (err, res, body) => {
            if (!err) {
            debug('Facebook message sent!')
            } else {
            debug("Facebook Unable to send message:" + err);
            }
        });

    }


    // Initiate Doorbell sound
    ringDoorbell () {
        const d = new Date();
        const n = d.getTime();
        const minutes=d.getMinutes();
        const secs = d.getSeconds();
        const date_str = d.getHours() + ':' +
            (minutes < 10 ? '0'+minutes : minutes) + ":" +
            (secs < 10 ? '0'+secs : secs);
        var bell_trigger_current = n;
        const subject = 'Doorbell pressed at ' + date_str;
        const message = date_str + ` Doorbell was rung!`;
        if (bell_trigger_start == 0) {
            bell_trigger_start = n;


            const fb_message = {
            "text": message
            }
            
            setTimeout(this.listen,  bellPeriod);
            debug(n + ' : Button pressed - playing ...');
            // Play a sound
            /*ssh_exec('mplayer /home/markc/Music/Greetings.mp3', { 
            user: 'markc',
            host: '192.168.1.5',
            key: '/home/pi/.ssh/id_rsa'
            } ).pipe(process.stdout);
            */

            /*
            ssh_exec('mplayer ' + sound_path,
            {
            user: 'markc',
            host: '192.168.1.5',
            key: '/home/pi/.ssh/id_rsa'
            }, 
            function (err, stdout, stderr) {
            if (err) {
                console.log("SSH FAIL:" + err);
            } else {
                debug(stdout + stderr);
            }
            })
            */

            // Play sound locally
            //TODO USE exec to execute linux command
            //mplayer /home/pi/Music/Greetings.mp3
            debug('Attempting to play SOUND!!!!!!!!!!!!!!');
        
            const play_sound = spawn('mplayer', [sound_path]);
            play_sound.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
            });

            play_sound.stderr.on('data', (data) => {
            console.log(`stderr: ${data}`);
            });

            play_sound.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            });
        

            // Iterate through each service, check if it is enabled
            // and then notify if it is
            for (var key in services) {
            if (services.hasOwnProperty(key)) {
                if (services[key].enabled) {
                switch (key) {
                    case "facebook":
                    // Send to Facebook Messenger
                    this.fb_callSendAPI(fb_receiver_id, fb_message);
                    break;

                    case "pushbullet":
                    // Send a PushBullet note
                    this.pb_sendNote(pb_deviceID,subject,message);
                    break;

                    case "smsgateway":
                        // Loop through each phone number to send an SMS
                        for (var key in smsgateway_to_phone_number) {
                            if (smsgateway_to_phone_number.hasOwnProperty(key)) {
                                if(smsgateway_to_phone_number[key]) {
                                    debug('smsgateway: Sending message to ' + key);
                                    // Send a PushBullet note
                                    smsGateway.message.sendMessageToNumber(smsgateway_device_id, key, message);
                                }
                            }
                        }
                        break;

                    default:
                    break;
                }
                }
            }
            }

        }
    }
};


module.exports = DoorBellDaemon

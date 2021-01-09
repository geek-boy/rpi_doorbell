#!/bin/bash

# This is the bash start up file to kick off the Pi Doorbell application

#Define Facebook page access token
#export FB_PAGE_ACCESS_TOKEN="YOUR_FACEBOOK_ACCESS_TOKEN"
#export FB_RECEIVER_ID="YOUR_FACEBOOK_RECEIVER_ID"

#Define Push Bullet API Key
#export PB_API_KEY="YOUR_PUSH_BULLET_API_ACCESS_TOKEN"

#Define server parameters
export PORT=3000

FILE_PATH="$(readlink -f $0)"

DIR_PATH=$(dirname "$FILE_PATH")

cd $DIR_PATH
DEBUG=* npm start
#npm start

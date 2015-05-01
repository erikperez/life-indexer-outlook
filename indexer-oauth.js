//For later.
//Right now Microsoft has provided basic auth in a preview phase.

var request = require('request'),
    http = require('http'),
    outlook = require('node-outlook'),
    oauth2 = require('simple-oauth2');


var outlookClient = new outlook.Microsoft.OutlookServices.Client('https://outlook.office365.com/api/v1.0',
    authHelper.getAccessTokenFn('https://outlook.office365.com/', session));

var request = require('request'),
    credentials = require('./credentials.js');

var username = credentials.username,
    password = credentials.password;

var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');

var options = {
  url: 'https://outlook.office365.com/ews/odata/Me/Folders/Inbox/Messages',
  headers: {
    authorization: auth
  }
};

var emailSummary = [];

function callback(error, response, body) {
  if (!error && response.statusCode == 200) {
    var data = JSON.parse(body);
    for (var i = 0; i < data.value.length; i++) {
      var o = {
        Subject: data.value[i].Subject,
        BodyPreview: data.value[i].BodyPreview,
        CreatedOn: new Date(data.value[i].DateTimeCreated),
        From: data.value[i].From,
        ToRecipients: data.value[i].ToRecipients,
        CcRecipients: data.value[i].CcRecipients,
        Link: data.value[i].WebLink,
        ConversationId: data.value[i].ConversationId
      };

      emailSummary.push(o);
    }

    console.log(emailSummary);
  }
};

request(options, callback);

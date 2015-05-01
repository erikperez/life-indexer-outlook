var request = require('request'),
    configuration = require('./configuration.js'),
    fs = require('fs'),
    _ = require('lodash');

//Configuration values
var username = configuration.username,
    password = configuration.password,
    crawlfilename = configuration.crawlfilename,
    url = configuration.url;

//Checking if there is existing crawl data.
var crawledFiles;
var existingDataSwitch = false;

fs.readFile(crawlfilename, function(err, data) {
    if (data && data.length > 0) {
        crawledFiles = JSON.parse(data);
        if (crawledFiles && crawledFiles.data.length > 0) {
            existingDataSwitch = true;
            console.log("Existing data:" + existingDataSwitch);
        }
    }
});


//Building the request to O365
var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
var options = {
    url: url,
    headers: {
        authorization: auth
    }
};

request(options, function(error, response, body) {
    if (!error && response.statusCode == 200) {
        var data = JSON.parse(body).value;
        var newEmails = false;

        if (existingDataSwitch) {
            var emails = _.filter(data, function(itemX) {
                var subFilter = _.filter(crawledFiles.data, function(itemY) {
                    return itemX[configuration.identifier] === itemY[configuration.identifier];
                });
                if (subFilter && subFilter.length === 0)
                    return true;
            });

            data = emails;

            if (emails && emails.length > 0) {
                newEmails = true;
                console.log("New emails: " + emails.length);
            }
        }

        var crawlData = existingDataSwitch ? crawledFiles : {
            data: [],
            meta: {}
        };

        if (!newEmails && existingDataSwitch) {
            console.log("No new emails");
            return updateCrawlData(crawlData);
        }

        for (var i = 0; i < data.length; i++) {
            var o = {
                Id: data[i].Id,
                Subject: data[i].Subject,
                BodyPreview: data[i].BodyPreview,
                CreatedOn: new Date(data[i].DateTimeCreated),
                From: data[i].From,
                ToRecipients: data[i].ToRecipients,
                CcRecipients: data[i].CcRecipients,
                Url: data[i].WebLink,
                ConversationId: data[i].ConversationId
            };

            crawlData.data.push(o);
        }


        return updateCrawlData(crawlData);

    }
});


updateCrawlData = function(crawlData) {
    crawlData.meta.crawldate = new Date();

    fs.writeFile(crawlfilename, JSON.stringify(crawlData), function(err) {
        if (err) throw err;
        console.log("Crawl saved.");
    });
}
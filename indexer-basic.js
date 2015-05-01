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

        var diffData = [];
        _.forEach(data, function(item){
              var o = {
                Id: item.Id,
                Subject: item.Subject,
                BodyPreview: item.BodyPreview,
                CreatedOn: new Date(item.DateTimeCreated),
                From: item.From,
                ToRecipients: item.ToRecipients,
                CcRecipients: item.CcRecipients,
                Url: item.WebLink,
                ConversationId: item.ConversationId
            };
           
            diffData.push(o);
            crawlData.data.push(o);

        });
       
        return updateCrawlData(crawlData, diffData, function(diffData) {
            console.log("Feeding..")
            _.forEach(diffData, function(item) {
                console.log("Feeding item")
                var opt = {
                    url: 'http://localhost:3030/indexer',
                    formData: {
                        'document': JSON.stringify([item])
                    }
                };

                request.post(opt, function(error, response, body) {
                    console.log(body);
                });
            });

        })
    }

});

updateCrawlData = function(crawlData, diffData, cb) {
    crawlData.meta.crawldate = new Date();
    fs.writeFile(crawlfilename, JSON.stringify(crawlData), function(err) {
        if (err) throw err;
        console.log("Crawl saved.");
    });

    if (cb) {
        console.log("Callback called()")
        cb(diffData);
    }
}
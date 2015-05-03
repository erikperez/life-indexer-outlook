var configuration = require('./configuration.js'),
	_ = require('lodash'),
	fs = require('fs'),
	request = require('request'),
	bunyan = require('bunyan');
var log = bunyan.createLogger({
	name: 'OutlookIndexer'
});


var OutlookIndexer = function OutlookIndexer(options) {
	this.options = _.assign({
		'url': configuration.url,
		'identifier': configuration.identifier,
		'username': configuration.username,
		'password': configuration.password,
		'crawlfilename': configuration.crawlfilename,
		'norchindexer': configuration.norchindexer
	}, options);

	var self = this;

	this._run = function _run(filterCallback, mappingCallback, storageCallback, indexCallback) {


		//Building the request to O365
		var auth = 'Basic ' + new Buffer(self.options.username + ':' + self.options.password).toString('base64');
		var reqOptions = {
			url: self.options.url,
			headers: {
				authorization: auth
			}
		};

		//Checking if there is existing crawl data somewhere.
		fs.readFile("crawlfilename.json", function(err, data) {
			var crawledFiles;
			var crawlDataExists = false;

			if (data && data.length > 0) {
				crawledFiles = JSON.parse(data);
				if (crawledFiles && crawledFiles.data.length > 0) {
					crawlDataExists = true;
					console.log("Existing data:" + crawlDataExists);
				}
			}

			var crawlDataObject = {
				crawlDataExists: crawlDataExists,
				crawlData: crawledFiles
			}

			request(reqOptions, function(error, response, body) {

				if (!error && response.statusCode == 200) {
					var fetchedData = JSON.parse(body).value;
					var filteredData, mappedData, processedDataObject;

					if (filterCallback && typeof filterCallback === 'function') {
						filteredData = filterCallback(crawlDataObject, fetchedData);
					}

					if (mappingCallback && typeof mappingCallback === 'function') {
						mappedData = mappingCallback(filteredData);
					}

					if (storageCallback && typeof storageCallback === 'function') {
						processedDataObject = storageCallback(crawlDataObject, mappedData);
					}

					if (indexCallback && typeof indexCallback === 'function') {
						console.log('Indexing ' + filteredData.length + ' items...');
						var indexData = indexCallback(mappedData);
						console.log("Indexing done");
					}
				}
			});

		});
	};
}

OutlookIndexer.prototype = {
	fetch: function fetch(storageCallback, indexCallback) {
		var self = this;
		self._run(function filterCallback(existingDataObject, data) {
				console.log("Filtering " + data.length + " items...");
				if (existingDataObject.crawlDataExists) {
					return _.filter(data, function(itemX) {
						if (itemX !== null) {
							var subFilter = _.filter(existingDataObject.crawlData.data, function(itemY) {
								if (itemY !== null && itemX !== null) {
									var identifier = self.options.identifier;
									return itemX[self.options.identifier] === itemY[self.options.identifier];
								}
							})
							console.log(subFilter.length)
							if (subFilter && subFilter.length === 0)
								return true;
						}
					});
				}
				console.log("Filtering done, result=" + data.length);
				return data;
			}, function mappingCallback(data) {
				console.log("Mapping " + data.length + " items...");
				var mappedData = [];
				_.forEach(data, function(item) {
					if (item !== undefined) {
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
						mappedData.push(o);
					}
				});
				return mappedData;
			}, function storageCallback(existingDataObject, mappedData) {
				console.log("Storing " + mappedData.length + ' items...');
				if (existingDataObject && existingDataObject.crawlDataExists) {

					existingDataObject.crawlData.data.push(mappedData);
					existingDataObject.crawlData.meta.crawldate = new Date(); //Set crawl date

					fs.writeFile("crawlfilename.json", JSON.stringify(existingDataObject.crawlData), function(err) {
						if (err) throw err;
						console.log("Crawl saved.");
					});
				} else {
					existingDataObject = {
						crawlData: {
							meta: {
								crawldate: new Date()
							},
							data: mappedData
						}
					}

					fs.writeFile("crawlfilename.json", JSON.stringify(existingDataObject.crawlData), function(err) {
						if (err) throw err;
						console.log("Crawl saved.");
					});
				}
				console.log("Storage done");
				return existingDataObject;
			},
			indexCallback);

	}
};

OutlookIndexer.create = function(options, overrides) {
	var indexer = new OutlookIndexer(options);
	indexer = _.assign(indexer, overrides);
	return indexer;
};

module.exports = OutlookIndexer;
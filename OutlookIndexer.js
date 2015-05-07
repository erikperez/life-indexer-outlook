var configuration = require('./configuration.js'),
	_ = require('lodash'),
	fs = require('fs'),
	request = require('request');

var OutlookIndexer = function OutlookIndexer(options) {
	this.options = _.assign({
		'url': configuration.url,
		'identifier': configuration.identifier,
		'username': configuration.username,
		'password': configuration.password,
		'crawlfilename': configuration.crawlfilename,
		'norchindexer': configuration.norchindexer,
		'incremental': true,
	}, options);

	var self = this;

	this.filterCallback = function filterCallback(existingDataObject, data) {
		if (!data || !self.options.incremental)
			return data;

		console.log("Filtering against " + data.length + " fetched items...");
		if (existingDataObject.crawlDataExists) {
			for (var i = 0; i < existingDataObject.crawlData.data.length; i++) {
				var persistedObject = existingDataObject.crawlData.data[i];
				var foundDuplicateInCrawl = false;
				var duplicateObject;
				var duplicateObjectIdx;

				if (data) {
					for (var j = 0; j < data.length; j++) {
						var crawledObject = data[j];
						if (!crawledObject)
							continue;

						if (crawledObject[self.options.identifier] == persistedObject[self.options.identifier]) {
							duplicateObject = crawledObject;
							foundDuplicateInCrawl = true;
							duplicateObjectIdx = j;
							break;
						}

					}
				}

				if (foundDuplicateInCrawl && duplicateObject) {
					data.splice(data[duplicateObjectIdx], 1);
					continue;
				}

			}

			console.log("DIFFDATA=" + data.length)
			return data;
		}

		console.log("No existing data to filter on")
		return data;
	}

	this.mappingCallback = function mappingCallback(data) {
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
	}


	this.storageCallback = function storageCallback(existingDataObject, mappedData) {
		console.log("Storing " + mappedData.length + ' items...');
		var dataObject = {
			crawlData: {
				meta: {
					crawldate: new Date() //Always set crawl date
				},
				data: {}
			}
		}
		if (!existingDataObject || !existingDataObject.crawlDataExists) {
			dataObject.crawlData.data = mappedData;
		} else {
			dataObject.crawlData.data = existingDataObject.crawlData.data; //Load existing data
			for (var i = 0; i < mappedData.length; i++) {
				var mappedObject = mappedData[i];
				if (mappedObject != undefined)
					dataObject.crawlData.data.push(mappedObject); //Append to existing data
			}
		}

		fs.writeFile("crawlfilename.json", JSON.stringify(dataObject.crawlData), function(err) {
			if (err) throw err;
			console.log("Crawl saved. Data length=" + dataObject.crawlData.data.length);
		});

		return dataObject;
	}

	this.existingCrawlDataCallback = function existingCrawlDataCallback(dataCallback, filterCallback, mappingCallback, storageCallback, indexCallback) {

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

			if (dataCallback && typeof dataCallback == 'function') {
				dataCallback(crawlDataObject, filterCallback, mappingCallback, storageCallback, indexCallback);
			}
		});
	}

	this.dataCallback = function dataCallback(crawlDataObject, filterCallback, mappingCallback, storageCallback, indexCallback) {

		//Building the request to O365
		var auth = 'Basic ' + new Buffer(self.options.username + ':' + self.options.password).toString('base64');
		var reqOptions = {
			url: self.options.url,
			headers: {
				authorization: auth
			}
		};

		request(reqOptions, function(error, response, body) {

			if (!error && response.statusCode == 200) {
				var fetchedData = JSON.parse(body).value;
				var filteredData, mappedData, processedDataObject;

				if (filterCallback && typeof filterCallback === 'function') {
					filteredData = filterCallback(crawlDataObject, fetchedData);
					if (filteredData && mappingCallback && typeof mappingCallback === 'function') {
						mappedData = mappingCallback(filteredData);
						if (mappedData && storageCallback && typeof storageCallback === 'function') {
							processedDataObject = storageCallback(crawlDataObject, mappedData);
							if (indexCallback && typeof indexCallback === 'function') {
								console.log('Indexing ' + filteredData.length + ' items...');
								var indexData = indexCallback(mappedData);
								console.log("Indexing done");
							}
						}
					}

				}
			}
		});
	}

	this._run = function _run(existingCrawlDataCallback, dataCallback, filterCallback, mappingCallback, storageCallback, indexCallback) {
		existingCrawlDataCallback(dataCallback, filterCallback, mappingCallback, storageCallback, indexCallback);
	};
}

OutlookIndexer.prototype = {
	fetch: function fetch(indexCallback) {
		var self = this;
		self._run(self.existingCrawlDataCallback, self.dataCallback, self.filterCallback, self.mappingCallback, self.storageCallback, indexCallback);

	}
};

OutlookIndexer.create = function(options, overrides) {
	var indexer = new OutlookIndexer(options);
	indexer = _.assign(indexer, overrides);
	return indexer;
};

module.exports = OutlookIndexer;
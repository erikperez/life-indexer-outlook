# life-indexer-outlook
This component serves the [Life Index](https://github.com/eklem/life-index) project as a content feeder that will crawl O365 / Exchange / Outlook e-mails and insert them into the search index.

##Purpose
* Indexing Component for [Life Index](https://github.com/eklem/life-index) which is based on [Norch](https://github.com/fergiemcdowall/norch). 

##Setup
* Run `npm install` 
* Insert your credentials in `configuration.js`
* Run `node indexer-basic.js`


##Future work
* Implement OAuth2 Authentication, right now we are using Basic Authentication because we can.
* Caching

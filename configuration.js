exports.username = "YOUR USERNAME HERE"; //user@example.com
exports.password = "YOUR PASSWORD HERE"; //123456

//Advice: grab a json from via your browser and serve a simple http with that file.
//You don't wanna spam the Azure API..
exports.url = 'http://localhost:8089/Mail365.json';//"https://outlook.office365.com/ews/odata/Me/Folders/Inbox/Messages";
exports.identifier = 'Id';
exports.crawlfilename = 'O365.json';
exports.norchindexer = 'http://localhost:3030/indexer';
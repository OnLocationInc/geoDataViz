var express = require("express");
var app = express();

var port = process.env.PORT || process.argv[2] || 80;
var basePath = '/';

app.set('views', __dirname + '/views');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);

app.use(express.static(__dirname + '/public'));
app.listen(port); 
console.log("Listening on port " + port); 

// Handle Get Requests
app.get(basePath, function(req, res){
	console.error('route: /, ip: %s, time: %s', req.ip, new Date().toTimeString().substr(0,9));

    res.render('index');
});
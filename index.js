
var express = require('express');
var app = express();
var await = require('await');
var fs = require('fs');

var port = process.env.PORT || process.argv[2] || 80;

app.set('views', __dirname + '/views');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);

app.use(express.static(__dirname + '/public'));
app.listen(port); 
console.log("Listening on port " + port); 

// Handle Get Requests
app.get('/', function(req, res){
	console.error('route: /, ip: %s, time: %s', req.ip, new Date().toTimeString().substr(0,9));

    var prom = await('res', 'states', 'regions');
    
    prom.keep('res', res);
    fs.readFile('data/US_STATES.json', 'utf8', prom.nodify('states'));
    fs.readFile('data/huc8_simplified.geojson', 'utf8', prom.nodify('regions'));
    
    prom.then(sendResponse, function(err) {
        console.err(err);
        res.status(500).send();
    });
    
});

function sendResponse(got) {
    const regions = JSON.parse(got.regions);
    got.res.render('index', {
        states: JSON.parse(got.states),
        regions: regions,
        props: Object.keys(regions.features[0].properties)
    });
}
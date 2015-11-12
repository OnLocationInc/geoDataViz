;(function(){
'use strict';

const express = require('express');
const router = express.Router();
const await = require('await');
const fs = require('fs');

router.get('/', function(req, res){
	console.error('route: /, ip: %s, time: %s', req.ip, new Date().toTimeString().substr(0,9));

    const prom = await('res', 'states', 'regions');
    
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

module.exports = router;
})();
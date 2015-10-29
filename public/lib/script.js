'use strict'

const aspectRatio = 1.618;
const MAXZOOM = 20;

let tic;
let projection;
let path;
let zoom;    
let withdrawalScale;
let consumptionScale;
let radiusScale;

window.onload = function () {
    tic = new Date();
    prepMap(function(err, p) {projection = p.projection; path = p.path;});
    requestChartData();	
}

function showElapsed() {
	var toc = new Date();
	var time = toc.getTime() - tic.getTime()
	console.log('' + time + 'ms elapsed')
}

function prepMap(cb) {

	var g = d3.select('#map1').append('svg')
	g.attr('id', 'SVG1')
	 .attr('width', +d3.select('#map1').style('width').slice(0,-2) - 48)
	g.attr('height', g.attr('width') / aspectRatio)
	 .classed('SVGwrapper', true);
			
	g.append('text')
		.attr({x: +d3.select('#map1').style('width').slice(0,-2) / 2 - 100, y: 45, id:'chartTitle1'})
		.classed('chartTitle', true);

	//set up zoom behavior
	zoom = d3.behavior.zoom()
		.translate([0,0])
		.scale(1)
		.scaleExtent([1,MAXZOOM])
		.on('zoom', zoomed)
	zoom(g);
	
	//make the gs here
	var z = g.append('svg:g')
		.attr('id', 'zoomWrapper')
    z.append('svg:g')
        .attr('id', 'States');
	z.append('svg:g')
		.attr('id', 'Regions')
	z.append('svg:g')
		.attr('id', 'Circles')
    z.append('svg:g')
        .attr('id', 'load');
	g.append('svg:g')
		.attr('id', 'Legend')
        .attr('transform', 'translate(30,' + String(g.attr('height') - 100) + ')');
	g.append('svg:g')
		.attr('id', 'Tooltips');
		
	var projection = d3.geo.albersUsa()
		.scale(1.2 * g.attr('width'))
		.translate([g.attr('width') / 2, g.attr('height') / 2])

	var path = d3.geo.path()
		.projection(projection);
		        
    d3.select('#map1').append('div')
        .attr('id', 'infoDivA')
        .attr('class', 'infoDiv')
        .style('width', '' + ((d3.select('#map1').property('clientWidth') - 60)/2) + 'px')
        .style('float', 'left');
        
    d3.select('#map1').append('div')
        .attr('id', 'infoDivB')
        .attr('class', 'infoDiv')
        .style('top', '10px')
        .style('margin-left', '' + ((d3.select('#map1').property('clientWidth') - 15)/2) + 'px')
        .style('margin-right', '15px');
        		
	cb(null, {projection: projection, path: path});
}

function requestChartData() {
    
    const inputs = [
        {func: d3.json, path: 'data/huc8_simplified.geojson'},
        {func: d3.json, path: 'data/US_STATES.json'},
        {func: d3.csv, path: 'data/consWith.csv'},
    ]
    
    //max of 3 xml requests
    let q = queue(3);
    
    _.forEach(inputs, function(input) {
        q.defer(input.func, input.path);
    })
    q.awaitAll(dataReady);
}

function dataReady(err, data) {
    if(err) return console.log(err);
    
    const regions = data[0];
    const states = data[1];
    const consumpWithdrawal = data[2];
            
    drawRegions(regions);
    drawStates(states);    
    drawCircles(consumpWithdrawal);
    
    showElapsed()
}    

function drawRegions(regionGeoJson) {

	d3.select('#Regions').selectAll('.region')
        .data(regionGeoJson.features)
      .enter().append('path')
        .attr('class', function(d) { return 'region ' + d.properties.REG})
        .style('fill', regFill)
        .attr('d', path);
}

function drawStates(stateGeoJson) {
    
    d3.select('#States').selectAll('.state')
        .data(stateGeoJson.features)
      .enter().append('path')
        .attr('class', function(d) { return 'state state' + d.id})
		.attr('d', path);
}

function regFill(reg) {
    
    switch (reg.properties.REG) {
        case '11':
        case '15':
            return 'green';
            break;
        case '12':
        case '14':
        case '18':
            return 'blue';
            break;
        case '13':
        case '16':
            return 'red';
            break;
        default:
            return 'white';
    }
}

function drawCircles(data) {
        
    setScales(data, 'withdrawal');
    
    //withdrawal
    d3.select('#Circles').selectAll('.circle')
        .data(data)
      .enter().append('circle')
        .attr('cx', function(d) { return projection([Number(d.lon), Number(d.lat)])[0]})
        .attr('cy', function(d) { return projection([Number(d.lon), Number(d.lat)])[1]})
        .attr('class', 'circle')
        .attr('stroke-width', 1)
        .attr('r', function(d) {return radiusScale(d.withdrawal);})
        .style('fill', 'black');
	    
    //draw legend    
    let legend = d3.legend.size()
        .scale(radiusScale)
        .cells([1, 10, 100, 1000])
        .shape('circle')
        .shapePadding(20)
        .labelOffset(20)
        .orient('horizontal')
    
    d3.select('#Legend')
        .call(legend);    
}

function setScales(data, property) {
    
    const min = _.min(_.map(data, function (d) {return d[property]}));
    const max = _.max(_.map(data, function (d) {return d[property]}));

    radiusScale = d3.scale.log()
        .domain([0.9 * min, 1.1 * max])
        .range([5,15]);
}

function zoomed() {
	d3.select('#zoomWrapper').attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');

	//fix the states
	d3.selectAll('.state')
		.attr('stroke-width', 1 / d3.event.scale); 
	//fix the regions
	d3.selectAll('.region')
		.attr('stroke-width', 1 / d3.event.scale); 
}
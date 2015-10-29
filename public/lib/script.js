'use strict'

const aspectRatio = 1.618;
const SEASONS = [
    'Winter',
    'Spring',
    'Summer',
    'Fall'];
const MAXRADIUS = 7;
const RADIUSRANGE = _.range(1, MAXRADIUS, 1);
const MAXZOOM = 20;

let tic;
let eventQueue = [];
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
		.attr('id', 'Basins')
	z.append('svg:g')
		.attr('id', 'Circles')
    z.append('svg:g')
        .attr('id', 'load');
	g.append('svg:g')
		.attr('id', 'Legend1')
        .attr('transform', 'translate(20,' + String(g.attr('height') - 140) + ')');
	g.append('svg:g')
		.attr('id', 'Legend2')
        .attr('transform', 'translate(20,' + String(g.attr('height') - 50) + ')');
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
    
    queue()
      .defer(d3.json, 'data/huc8_simplified.geojson')
      .defer(d3.json, 'data/US_STATES.json')
      .defer(d3.csv, 'data/consWith.csv')
      .awaitAll(dataReady);
}

function dataReady(err, data) {
    if(err) return console.log(err);
    
    const basins = data[0];
    const states = data[1];
    const consumpWithdrawal = data[2];
            
    drawBasins(basins);
    drawStates(states);
    
    drawCircles(consumpWithdrawal);
}    

function drawBasins(basinGeoJson) {

	d3.select('#Basins').selectAll('.HUC')
        .data(basinGeoJson.features)
      .enter().append('path')
        .attr('class', function(d) { return 'HUC ' + d.properties.REG})
        .style('fill', hucFill)
        .attr('d', path);
}

function drawStates(stateGeoJson) {
    
    d3.select('#States').selectAll('.state')
        .data(stateGeoJson.features)
      .enter().append('path')
        .attr('class', function(d) { return 'state state' + d.id})
		.attr('d', path);
}

function hucFill(huc) {
    switch (huc.properties.REG) {
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
    
    setScales(data);
    
    //withdrawal
    d3.select('#Circles').selectAll('.circleWith')
        .data(data)
      .enter().append('circle')
        .attr('cx', function(d) { return projection([Number(d.lon), Number(d.lat)])[0]})
        .attr('cy', function(d) { return projection([Number(d.lon), Number(d.lat)])[1]})
        .attr('class', 'circleWith')
        .attr('stroke-width', 1)
        .attr('r', function(d) {return getRadius(d.withdrawal);})
        .style('fill', 'black');

    //consumption
    d3.select('#Circles').selectAll('.circleCons')
        .data(data)
      .enter().append('circle')
        .attr('cx', function(d) { return projection([Number(d.lon), Number(d.lat)])[0]})
        .attr('cy', function(d) { return projection([Number(d.lon), Number(d.lat)])[1]})
        .attr('class', 'circleCons')
        .attr('stroke-width', 0.1)
        .attr('r', function(d) {return getRadius(d.consumption);})
        .style('fill', 'white');
	    
    //draw legend
    
    let legend1 = d3.legend.size()
        .scale(radiusScale)
        .cells([1, 10, 100, 1000])
        .shape('circle')
        .shapePadding(20)
        .labelOffset(20)
        .orient('horizontal')
    
    d3.select('#Legend1')
        .call(legend1);    
}

function getRadius(d) {
    return radiusScale(d)
}

function setScales(data) {
    
    const minWithdrawal  = _.min(_.map(data, function(d) {
        return +d.withdrawal
    }));
    const maxWithdrawal  = _.max(_.map(data, function(d) {
        return +d.withdrawal
    }));
    const minConsumption = _.min(_.map(data, function(d) {
        return +d.consumption
    }));
    const maxConsumption = _.max(_.map(data, function(d) {
        return +d.consumption
    }));
    
    console.log(minWithdrawal, maxWithdrawal, minConsumption, maxConsumption);
    
    radiusScale = d3.scale.log()
        .domain([2,4000])
        .range([5,15]);
    
    /*
    withdrawalScale = d3.scale.log()
        .domain([2, 4000])
        .range([6, 16]);
        
    consumptionScale = d3.scale.log()
        .domain([2, maxConsumption])
        .range([4, 12]);
        
    //*/
}

/*
function rollupDataByReg(data, locations) {
    const hucs = {
        '11': getBlank(),
        '12': getBlank(),
        '13': getBlank(),
        '14': getBlank(),
        '15': getBlank(),
        '16': getBlank(),
        '18': getBlank(),
    };

    console.log(hucs);

    _.forEach(data, function(datum) {
        
        console.log(datum)
        
        //find which HUC
        const huc = _.find(locations, function(l) {
            return (datum.plant === l.plant);
        }).REG
        
        console.log(huc);
        
        if( ! huc ) return;
        
        hucs[huc].consumption += Number(datum.consumption);
        hucs[huc].withdrawal += Number(datum.withdrawal);
        hucs[huc].generation += Number(datum.generation);
    });
    
    return hucs;
}

function getBlank() {
    return {consumption: 0, withdrawal: 0, generation: 0};
}
//*/

function zoomed() {
	d3.select('#zoomWrapper').attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
	//unzoom the plants
	d3.selectAll('.plants')
        .attr('r', function(d) {
            return d3.select(this).attr('data-radius') * 2 / (1 + d3.event.scale); 
        })
        .attr('stroke-width', function(d) {
            return 2 / (1 + d3.event.scale)
        })
    
	//fix the states
	d3.selectAll('.state')
		.attr('stroke-width', 1 / d3.event.scale); 
	//fix the basins
	d3.selectAll('.HUC')
		.attr('stroke-width', 1 / d3.event.scale); 
}
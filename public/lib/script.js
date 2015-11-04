;(function() {
'use strict'

const aspectRatio = 1.618;
const MAXZOOM = 20;

let tic;
let projection;
let path;
let zoom;

window.onload = function () {
    tic = new Date();
    prepMap(function(err, p) {projection = p.projection; path = p.path;});
    drawStates(INPUTS.states);
    window.setTimeout(function() {
        cleanAndRender(JSON.stringify(INPUTS.regions), 'REG')
    }, 10);
    showElapsed();
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
		.scaleExtent([0.25,MAXZOOM])
		.on('zoom', zoomed)
	zoom(g);
	
	//make the gs here
	var z = g.append('svg:g')
		.attr('id', 'zoomWrapper')
    z.append('svg:g')
        .attr('id', 'States');
	z.append('svg:g')
		.attr('id', 'Regions')
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

function drawStates(stateGeoJson) {
    
    d3.select('#States').selectAll('.state')
        .data(stateGeoJson.features)
      .enter().append('path')
        .attr('class', function(d) { return 'state state' + d.id})
		.attr('d', path);
}

function handleFiles(fileList) {

    let reader = new FileReader();
    
    reader.onload = function(event) {
        cleanAndRender(reader.result);
    }
    
    reader.readAsText(fileList[0]);   
}

function cleanAndRender(dataString, propName) {
    let data;
    try {
        data = JSON.parse(dataString);
    } catch (err) {
        console.error(err);
        return;
    }
    
    const $prop = propName || $('#textInput').val()
    
    propertyColor($prop);
    
	let d3Data = d3.select('#Regions').selectAll('.region')
        .data(data.features);
        
    d3Data.enter()
      .append('path')
        .attr('d', path);
        
    d3Data
        .attr('class', 'region')
        .style('fill', fillFunc)
        .on('mouseover', function(d) {
            makeTip(d, $prop);
        })
        .on('mouseout', function(d) {
            removeTip(d, $prop)
        })
        .attr('d', path);
    
    d3Data.exit()
      .remove();    
}

function makeTip(d, prop) {
    console.log('make', d.properties[prop]);
}

function removeTip(d, prop) {
    console.log('remove', d.properties[prop]);
}

function fillFunc(datum) {
    return 'blue';
}

function propertyColor(prop) {
    if(typeof prop === 'undefined' || prop === '') {
        fillFunc = function (datum) { return 'blue'; };
        return;
    }

    fillFunc = function(datum) {
        switch (Number(datum.properties[prop]) % 5) {
            case 0:
                return 'green';
                break;
            case 1:
                return 'orange';
                break;
            case 2:
                return 'blue';
                break;
            case 3:
                return 'red';
                break;
            case 4:
                return 'purple';
                break;
            default:
                return 'white';
        }
    }    
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
})();
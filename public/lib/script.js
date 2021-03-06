'use strict';

const aspectRatio = 1.825;
const MAXZOOM = 20;

let tic;

window.onload = function () {
    tic = new Date();
    prepMap();
    drawStates(INPUTS.states);
    window.setTimeout(function() {
        render(INPUTS.regions);
    }, 10);
    showElapsed();
};

function showElapsed() {
	const toc = new Date();
	const time = toc.getTime() - tic.getTime();
	console.log('' + time + 'ms elapsed');
}

function prepMap() {

	const g = d3.select('#map1').append('svg');
	g.attr('id', 'SVG1')
	 .attr('width', +d3.select('#map1').style('width').slice(0,-2) - 48);
	g.attr('height', g.attr('width') / aspectRatio)
	 .classed('SVGwrapper', true);
			
	g.append('text')
		.attr({x: +d3.select('#map1').style('width').slice(0,-2) / 2 - 100, y: 45, id:'chartTitle1'})
		.classed('chartTitle', true);

	//set up zoom behavior
	const zoom = d3.behavior.zoom()
		.translate([0,0])
		.scale(1)
		.scaleExtent([0.25,MAXZOOM])
		.on('zoom', zoomed);
	zoom(g);
	
	//make the gs here
	const z = g.append('svg:g')
		.attr('id', 'zoomWrapper');
    z.append('svg:g')
        .attr('id', 'States');
	z.append('svg:g')
		.attr('id', 'Regions');
	g.append('svg:g')
		.attr('id', 'Tooltips');
    g.append('svg:g')
        .attr('id', 'Legend')
        .attr('transform', 'translate(10,10)');

    const projection = d3.geo.albersUsa()
		.scale(1.2 * g.attr('width'))
		.translate([g.attr('width') / 2, g.attr('height') / 2]);

	const path = d3.geo.path()
		.projection(projection);
        
    //bind path to the render functions so we don't have a global
    drawStates = drawStates.bind(path);
    render = render.bind(path);
		        
  d3.select('#map1').append('div').classed('row', true).attr('id', 'outInfo')
    .append('div').classed('col-sm-12', true)
      .attr('id', 'infoDiv')
      .attr('class', 'infoDiv')
      .append('table').attr('class', 'table table-condensed table-bordered table-responsive');
      // .style('width', '' + ((d3.select('#map1').property('clientWidth') - 60)/2) + 'px')
}

function drawStates(stateGeoJson) {
    /*jshint validthis:true */
    //path is bound to this
   
    d3.select('#States').selectAll('.state')
        .data(stateGeoJson.features)
      .enter().append('path')
        .attr('class', function(d) { return 'state state' + d.id;})
		.attr('d', this);
}

function handleFiles(fileList) {

    let reader = new FileReader();
    
    reader.onload = function(event) {
        render(clean(reader.result));
    };
    
    reader.readAsText(fileList[0]);   
}

function clean(dataString) {
    
    let data;
    try {
        data = JSON.parse(dataString);
        return data;
    } catch (err) {
        console.error(err);
        return err;
    }
        
}

function render(data) {
    /*jshint validthis:true */
    //path is bound to this
    
    if(data instanceof Error) return;

    const props = Object.keys(data.features[0].properties);
    redoSelect(props);
        
	let d3Data = d3.select('#Regions').selectAll('.region')
        .data(data.features);
        
    d3Data.enter()
      .append('path');
        
    d3Data
        .attr('class', 'region')
        .attr('d', this);
    
    d3Data.exit()
      .remove();
      
    attachListeners();
    propertyColor();
}

function attachListeners() {
  const $regions = d3.selectAll('.region')
  
  //remove listeners
  $regions.on('click', null);
  $regions.on('mouseover', null);
  $regions.on('mouseout', null);
  
  //infoDiv table for click
  $regions
    .on('click', refreshInfoDiv)    
    .on('mouseover', makeTip)
    .on('mouseout', removeTip);
    
}

function refreshInfoDiv(datum) {
  
  const props = _.keys(datum.properties);
  const vals  = props.map(function(d) {return datum.properties[d]});

  const $table = d3.select('.table');
  
  var $rows = $table.selectAll('.table-row').data(props);
  
  $rows.enter().append('tr');
  $rows.classed('table-row', true);
  $rows.html(function(d, i) {
    return '<td>' + d + '</td> <td>' + vals[i] + '</td>'
  });
}

function redoSelect(props) {
    
  const $sel = d3.select('#selectInput');
  
  $sel.selectAll('option').remove();
  
  $sel.selectAll('option')
      .data(props, function(d) {return d;})
    .enter().append('option')
      .attr('value', function(d) {return d;})
      .text(function(d) {return d;});
  
}

function makeTip(d) {
  
  const prop = getProp();
  // console.log('make', d.properties[prop]);
}

function removeTip(d) {

  const prop = getProp();
  // console.log('remove', d.properties[prop]);
}

function fillFunc(datum) {
    return 'blue';
}

function recolor() {
    
  const prop = getProp();
  
  d3.selectAll('.region')
    .style('fill', function(d) {
      return fillFunc(d.properties[prop]);
    });
}

function getProp() {
  return d3.select('#selectInput').property('value');
}

function propertyColor() {
       
    defineFillFunc(getProp());
    recolor();
}

function numberSort(a,b) {
    return Number(a) - Number(b);
}
    
function defineFillFunc(prop) {

    const vals = [];
    d3.selectAll('.region').each(function(d) {
        vals.push(d.properties[prop]);
    });
    let uniqs = _.uniq(vals);

    removeLegend();
    
    if(!isNaN(Number(uniqs[0])) && uniqs.length > vals.length/2 ) {
        //continuous?
        uniqs = _.map(uniqs, function(d) {return Number(d);});
        const min = _.min(uniqs);
        const max = _.max(uniqs);
        const range = max - min;
        
        fillFunc = d3.scale.linear()
            .domain([_.min([min - 0.1*range,0]), min + 0.5*range, max + 0.1*range])
            .range(['red', 'white', 'blue']);
            
        makeContinuousLegend(min, range, max);
        
    } else if (uniqs.length < 11) {

        //discrete10
        if(!isNaN(Number(uniqs[0]))) {
            uniqs = uniqs.sort(numberSort);
        }
        fillFunc = d3.scale.category10()
            .domain(uniqs);
        makeDiscreteLegend(uniqs);
    } else {

        //discrete20
        if(!isNaN(Number(uniqs[0]))) {
            uniqs = uniqs.sort(numberSort);
        }
        fillFunc = d3.scale.category20()
            .domain(uniqs);        
        makeDiscreteLegend(uniqs);
    }
}

function removeLegend() {
    d3.select('#Legend').selectAll('.cell').remove();
}

function makeContinuousLegend(min, range, max) {
    const legendLinear = d3.legend.color()
        .shapeWidth(30)
        .cells([min, min + range/4, min + range/2, min + 3*range/4, max])
        .shapePadding(4)
        .scale(fillFunc);

    d3.select('#Legend')
        .call(legendLinear);
}

function makeDiscreteLegend(cells) {
    const legOrd = d3.legend.color()
        .shape('circle')
        .shapePadding(5)
        .cells(cells)
        .scale(fillFunc);
        
    d3.select('#Legend')
        .call(legOrd);
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
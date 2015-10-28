'use strict'

var tic;
const aspectRatio = 1.618;

var SEASONS = [
    'Winter',
    'Spring',
    'Summer',
    'Fall'];

var eventQueue = [];
    
var projection,
    path,
    zoom;

var MAXRADIUS = 7,
    RADIUSRANGE = _.range(1, MAXRADIUS, 1),
    MAXZOOM = 20;

window.onload = function beginCharts() {
    tic = new Date();
    requestChartData();	
}

function showElapsed() {
	var toc = new Date();
	var time = toc.getTime() - tic.getTime()
	console.log('' + time + 'ms elapsed')
}

function requestChartData() {
    
    //var prom = await('projection', 'path');
	
    //first load HUC outlines
	d3.json('data/huc8_simplified.geojson', function(data) {
		drawBasins(data);
	});
    
    d3.json('data/US_STATES.json', function(data) {
        drawStates(data);
    });
	
	/*
    d3.csv('data/Existing_Plants_Cool_HUC.csv', function(err, data) {
		allPlants = data;
		if(plantsAreDone) {
			prepPlantData()
		}
		plantsAreDone = true;
	});
                	
	d3.csv('data/repPowerUse.csv', function(d) {
		return {
			Year: d.Year.trim(),
			IGRP: d.IGRP.trim(),
			HUC8: d.HUC8.trim(),
			Plant: d.Plant.trim(),
			OrigPlant: d.OrigPlant.trim(),
			Season: d.Season.trim(),
			Generation: +(d.Generation.trim()),
			WaterUse: +(d.WaterUse.trim()),
			WaterDraw: +(d.WaterDraw.trim())
		}
	}, function(err, data) {
		if(err) {console.log(err); throw err;}
		PlantData = data;
		if(plantsAreDone) {
            //console.log('prep')
			prepPlantData()
		}
		plantsAreDone = true;
	});
    
    d3.csv('data/repNonPowerUse.csv', function(d) {
		return {
			Year: d.Year.trim(),
			HUC8: d.HUC8.trim(),
			Season: d.Season.trim(),
			UseSector: d.UseSector.trim(),
            WaterUse: +(d.WaterUse.trim()),
			WaterDraw: +(d.WaterDraw.trim())
		}
	},function(err, data) {
        if(err) {console.log(err); throw err;}
		HUCdata = data;
	});
    //*/

	prepMap1(function(p1, p2) {projection = p1; path = p2;});
}

function prepMap1(cb) {

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
		.attr('id', 'Plants')
    z.append('svg:g')
        .attr('id', 'load');
	g.append('svg:g')
		.attr('id', 'Legend')
        .attr('transform', 'translate(20,' + String(g.attr('height') - 100) + ')');
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
        		
	cb(projection, path);
}

function drawBasins(basinGeoJson) {

	d3.select('#Basins').selectAll('.HUC')
        .data(basinGeoJson.features)
      .enter().append('path')
        .attr('class', function(d) { return 'HUC ' + d.properties.REG})
        .style('fill', 'green')
        .attr('d', path);
}

function drawStates(stateGeoJson) {
    
    d3.select('#States').selectAll('.state')
        .data(stateGeoJson.features)
      .enter().append('path')
        .attr('class', function(d) { return 'state state' + d.id})
		.attr('d', path);
}

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

function prepPlantData() {
	
	allAllPlants = allPlants;
	
	var IGRPwithData = _.uniq(_.pluck(PlantData, 'IGRP'));

	var plantsMatchingIGRP = _.filter(allPlants, function(d) {
		return _.any(IGRPwithData, function (dd) { 
			return dd === d.IGRP;
		})
	});
	
	var plantsToPlot = [];
	
	_.forEach(IGRPwithData, function(d) {
		var match = _.where(plantsMatchingIGRP, {IGRP: d});
		if (match.length === 1) {
			//good match
			plantsToPlot.push(match[0]);
		} else if (match.length > 1) {
            console.log('error in match length > 1');
        } else {
			plantsToPlot.push( makeNewPlant(d) );
		}
	});

	allPlants = plantsToPlot;
    console.log(_.keys(allPlants[0]));
}

function makeNewPlant(IGRP) {
    var matches = _.where(newPlants, {IGRP: IGRP})
    
    if (matches.length === 1) {
        d = matches[0];
        dd = _.where(allAllPlants, {PLANT: d.OrigPlant})[0];
        return {
            COOLTECH: d.COOLTECH,
            FUELTYPE: d.FUELTYPE,
            IGRP: IGRP,
            PLANT: d.Plant,
            OrigPlant: d.OrigPlant,
            SUMCAP: d.SUMCAP,
            UNITTECH: d.UNITTECH,
            
            HUC8: dd.HUC8,
            HUC8_QGIS: dd.HUC8_QGIS,
            LAT: dd.LAT,
            LON: dd.LON,
            RFURB: '2015',
            RYR: '999912',
            FUELREG: dd.FUELREG
        }
        
    } else if (matches.length > 1) {
        console.log('too many matches. IGRP: ' + IGRP + ' length: ' + matches.length);
        return {
            COOLTECH: 'RC',
            ECP: 'ST',
            FUELREG: '21',
            FUELTYPE: 'NG',
            HUC8: '15030108_AZ',
            HUC8_QGIS: '15030108_AZ',
            IGRP: IGRP,
            LAT: String( -116 + IGRP / 3000 ),
            LON: '32.721',
            PLANT: '120',
            RFURB: '1959',
            RYR: '999912',
            SUMCAP: '75',
            UNITTECH: 'ST',
            WATERSOURCE: 'Groundwater',
            WINCAP: '75'
        }
    } else {
        console.log('no match. IGRP: ' + IGRP);
        return {
            COOLTECH: 'RC',
            ECP: 'ST',
            FUELREG: '21',
            FUELTYPE: 'NG',
            HUC8: '15030108_AZ',
            HUC8_QGIS: '15030108_AZ',
            IGRP: IGRP,
            LAT: String( -116 + IGRP / 3000 ),
            LON: '32.721',
            PLANT: '120',
            RFURB: '1959',
            RYR: '999912',
            SUMCAP: '75',
            UNITTECH: 'ST',
            WATERSOURCE: 'Groundwater',
            WINCAP: '75'
        }
    }
}

function radius( key ) {
	if(key === '') {
		Radius_Key = _.noop();
		Radius_Scale = _.noop();
	} else if (_.has(allPlants[0], key)) {
	
		Radius_Key = key;
		var goodVals = _.compact(
						_.map(allPlants, 
							function(d) {return +d[key]}
						)
					   );
		var max = _.max(goodVals);
		var min = _.min(goodVals);
		var radiusDomain = getDomain(min, max, MAXRADIUS);

		Radius_Scale = d3.scale.linear()
			.domain(radiusDomain)
			.range(RADIUSRANGE);	
	} else if ( _.has(PlantData[0], key)) {
		//now search through the 'other' file for these data by IGRP
		Radius_Key = key;
		var goodVals = _.compact(
						_.map(PlantData, 
							function(d) {return +d[key]}
						)
					   );
		var max = 365 * _.max(goodVals);
		var min = _.min(goodVals);
		
		var temp = min/2;
		
		var radiusDomain = getDomain(min - temp, max + temp, MAXRADIUS);

		Radius_Scale = d3.scale.linear()
			.domain(radiusDomain)
			.range(RADIUSRANGE);
		
	} else {
        console.log(_.keys(PlantData[0]), key)
		Radius_Key = _.noop();
		Radius_Scale = _.noop();
	}
	updateMap(mapYear)
}

function getPlantRadius(plant) {
	if( _.has(plant, Radius_Key) ) return Radius_Scale(plant[Radius_Key]);
	
	var temp = _.filter(PlantData, 
		function(d) {
			return (d.IGRP === plant.IGRP) && (d.Year === mapYear);
		}
	)
	//console.log(plant.IGRP, Radius_Key, mapYear);
	if(temp.length === 0) {
		//console.log('no match', mapYear, plant)
		return 0;
	} else if (temp.length > 1) {
		//console.log('match length: ' + temp.length)
		//now find sum across season
		
		var value = _.reduce(temp, function(sum, d) {
            var product
            switch(d.Season) {
                case 'Winter':
                    product = 121 * d[Radius_Key];
                    break;
                case 'Summer':
                    product = 122 * d[Radius_Key];
                    break;
                case 'Spring':
                case 'Fall':
                    product = 61 * d[Radius_Key];
                    break;
                default:
                    product = 0;
                    console.log('bad season: ', d);
            }
            return sum + product;   
        }, 0)
		if(value === 0) return 1.5
		else return Radius_Scale(value);
	} else {
		return Radius_Scale(temp[0][Radius_Key])
	}
}

function getPlantRadiusValue(plant) {
	if( _.has(plant, Radius_Key) ) return plant[Radius_Key];
	
	var temp = _.where(PlantData, 
		{IGRP: plant.IGRP, Year: mapYear})
	
	//console.log(plant.IGRP, Radius_Key, mapYear);
	if(temp.length === 0) {
		//console.log('no match', mapYear, plant)
		return 0;
	} else {
		//console.log('match length: ' + temp.length)
		//now find sum across season
		var value = _.reduce(temp, function(sum, d) {
            var product
            switch(d.Season) {
                case 'Winter':
                    product = 121 * d[key];
                    break;
                case 'Summer':
                    product = 122 * d[key];
                    break;
                case 'Spring':
                case 'Fall':
                    product = 61 * d[key];
                    break;
                default:
                    product = 0;
                    console.log('bad season: ', d);
            }
            return sum + product;   
        }, 0)
		if(value === 0) return 1.5
		else return value;
	} 
}

function updateColorLegend() {
    var uniques = _.uniq(_.map(allPlants, function(d) {return d[Color_Key]}));
    var d3Scale = d3.scale.ordinal()
        .domain([uniques[0], uniques[1], uniques[2]])
        .range(['#aa6600', '#2277cc', '#ff1166' ]);

    var legOrd = d3.legend.color()
        .shape('circle')
        .shapePadding(10)
        .scale(d3Scale);
        
    d3.select('#Legend')
        .call(legOrd);
}

function updateBasins() {

    $('body').css('cursor', 'progress')
    var tt = new Date();
	d3.selectAll('.HUC')
		.style('fill', getBasinFill)
    $('body').css('cursor', 'default')
    console.log(new Date().getTime() - tt.getTime());
}

function makeBasinBox(basin) {
    lastBasin = basin;
    
    var HUC = basin.properties.HUC_CODE;
    var waterUse = getBasinVal(basin, 'WaterUse');
    var powerUse = getBasinVal(basin, 'powerUse');
    var agUse = getBasinVal(basin, 'agUse');
    
    var boxHtml =   'HUC: ' + HUC + '<br>' +
                    'Total water use: ' + fixThree(waterUse / 1000) + ' million gals' + '<br>' +
                    'Power use: ' + fixThree((waterUse - agUse)/1000) + ' million gals'+ '<br>' + 
                    'Ag use: ' + fixThree((agUse/1000)) + ' million gals';
                    
    d3.select('#infoDivA').html(boxHtml);
    redrawCharts(basin)
}

function fixThree(num) {
    return Math.round(num * 1000) / 1000;
}

function makeBasintip(basin) {
	
	var textB = d3.select('#Tooltips').selectAll('svg')
		.data([basin], function(d) {return d.properties.HUC_CODE;}).enter();
		
	//var cx = projection([+plant.LAT, +plant.LON])[0];
	//var cy = projection([+plant.LAT, +plant.LON])[1];
	var width = 160;
	
	textB.append('rect')
	//	.attr('x', cx - (width/2) - 5)
		.attr('x', 5)
	//	.attr('y', cy - 80)
		.attr('y', 500)
		.attr('rx', 5)
		.attr('ry', 5)
		.attr('width', width+10)
		.attr('height', 40)
		.attr('stroke-width', 1)
		.attr('stroke', 'black')
		.attr('fill', 'white')
		.attr('opacity', 0.8)
		.attr('class', 'tooltip' + basin.properties.HUC_CODE + ' ToolTip')
		
	var text = getBasintipText(basin);
	
	_.forEach(text, function (lineOfText, i) {
		var ttt = textB.append('text')
			.attr('font-size','18')
			.attr('font-family','calibri')
			.attr('opacity', 0.9)
		//	.attr('x', function (d) { return cx - (width/2); })
			.attr('x', 14)
			.attr('y', 520 + i*25)
		//	.attr('y', function (d) { return cy - 62 + i*25; })
			.attr('class', 'tooltip' + basin.properties.HUC_CODE + ' ToolTip')
			.text(lineOfText);
	});		
}

function getBasintipText(basin) {
	return ['HUC: ' + basin.properties.HUC_CODE];
}

function removeBasintips(basin) {
	d3.selectAll('.tooltip'+basin.properties.HUC_CODE).transition()
		.duration(1000).attr('opacity', 0)
		.remove();
}

function removeTooltips(plant) {
	d3.selectAll('.tooltip'+plant.IGRP).transition()
		.duration(1000).attr('opacity', 0)
		.remove();
}

function makePlantBox(plant) {
    
    lastPlant = plant;
    
    var waterUse = getPlantVal(plant, 'WaterUse');
    var capacity = getPlantVal(plant, 'SUMCAP');
    var generation = getPlantVal(plant, 'Generation');
    
    var boxHtml = 'IGRP: ' + plant.IGRP + '<br>' +
                  'HUC: ' + plant.HUC8 + '<br>' +
                  'Tech-Code: ' + plant.FUELTYPE + '-' + plant.UNITTECH + '-' + plant.COOLTECH + '<br>' +
                  'Capacity: ' + fixThree(capacity) + '<br>' +
                  'Generation: ' + fixThree(generation) + ' GWh' + '<br>' +
                  'Water Use: ' + fixThree(waterUse/1000) + ' million gals' + '<br>' +
                  'Water efficiency: ' + fixThree((waterUse) / generation) + ' gals/MWh';
                  
    d3.select('#infoDivB').html(boxHtml);
    
    
}

function downloadAsURI(data, filename) {
	var link = document.createElement('a');
	link.download = filename;
	link.href = data;
	document.body.appendChild(link)
	link.click();
	link.parentNode.removeChild(link);
}
	
function dispError(e) {
	console.error(e);
	
	d3.select('#chartContainer').append('svg')
		.attr('height', 300)
		.attr('width', 400)
	.append('text')
		.attr({
			x: 10,
			y: 100,
			'font-size': '40px',
			fill: 'black'})
		.text('ERROR');	
}


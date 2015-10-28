var tic;
var TICK_FORMAT = '4,g',
    AXIS_FONT_SIZE = 14,
    aspectRatio = 1.618,
    plantsAreDone = false,
    HUCsAreDone = false,
    caseFolder = 'testCase3';

var SEASONS = [
    'Winter',
    'Spring',
    'Summer',
    'Fall'];

var FIRSTYEAR = 2014,
    LASTYEAR  = 2030;
    
var DAYS_WINTER = 121,
    DAYS_SPRING = 61,
    DAYS_SUMMER = 122,
    DAYS_FALL = 61;

var mapYear,
    mapSeason = false;

var eventQueue = [];
var plants_by_year = [],
    plants,
    allPlants,
    allAllPlants;

var STATES,
    HUC,
	HUCdata,
    HUCflag = false,
	PlantData,
    newPlants;
    
var projection,
    path,
    zoom;

var MAXRADIUS = 7,
    RADIUSRANGE = _.range(1, MAXRADIUS, 1),
    MAXZOOM = 20;
	
var HUC_Scale,
    HUC_Key,
    Color_Scale,
    Color_Key,
    Radius_Scale,
    Radius_Key;
    
var lastBasin,
    lastPlant,
    chart2,
    chart3;

window.onload = function beginCharts() {
    tic = new Date();
    $('body').css('cursor', 'progress')
    requestChartData();	
}

function showElapsed() {
	var toc = new Date();
	var time = toc.getTime() - tic.getTime()
	console.log('' + time + 'ms elapsed')
}

function requestChartData() {
	
    //first load HUC outlines
	d3.json('data/huc8_simplified.geojson', function(data) {
		HUC = data;
        //this usually takes longest to load so the next three
        //calls should work
		drawBasins();
	});
    
    d3.json('data/US_STATES.json', function(data) {
        STATES = data;
    });
	
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

	prepMap1(function(p1, p2) {projection = p1; path = p2;});
	prepChart2();
    prepChart3();
}

/* //aggregate on change

function aggregateHUC(data) {
	var outData = [];
	//for each unique huc8
	_.forEach( _.uniq(_.map(data, function(d) {return d.HUC8})), function(huc) {
        _.forEach(_.range(FIRSTYEAR, LASTYEAR+1), function (year) {
            var temp = {
                Year: String(year),
                HUC8: huc
            }
            //now reduce WaterUse and WaterDraw
            var matches = _.filter(data, function(dd) {
                return (dd.HUC8 === huc && dd.YEAR === String(year))});
            temp['WaterUse'] = _.reduce( matches, function(sum, n) {
                return sum + +n.WaterUse;
            }, +0)
            temp['WaterDraw'] = _.reduce( matches, function(sum, n) {
                return sum + +n.WaterDraw;
            }, +0)
            outData.push(temp);
        })
	})
	return outData;
}*/ 

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

function removeLoading() {
	d3.select('#loading1').remove();
	d3.select('#loading2').remove();
    d3.select('#loading3').remove()
}

function prepMap1(cb) {

	var g = d3.select('#map1').append('svg')
	g.attr('id', 'SVG1')
	 .attr('width', +d3.select('#map1').style('width').slice(0,-2) - 48)
	g.attr('height', g.attr('width') / aspectRatio)
	 .classed('SVGwrapper', true);
			
	g.append('text')
		.attr({x: +d3.select('#map1').style('width').slice(0,-2) / 2 - 100, y: 45, id:'chartTitle1'})
		.classed('chartTitle', true)
//		.text('Power Plant Water and Cool');
	g.append('text')
		.attr({x: 200, y: 20, id:'loading1'})
		.classed('loadingText', true)
		.text('LOADING DATA...')

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
		
	var g2 = d3.select('#menu1a').append('svg')
	g2.attr('id', 'SVGmenu1a')
		.attr('width', +d3.select('#menu1a').style('width').slice(0,-2) - 30)
		.attr('height', g.attr('height'))
		.classed('menuSVG',true);	
        
    d3.select('#map1').append('div')
        .attr('id', 'infoDivA')
        .attr('class', 'infoDiv')
        .style('width', '' + ((d3.select('#map1').property('clientWidth') - 60)/2) + 'px')
        .style('float', 'left')
    //.append('span').html('TEST ABC');
        
    d3.select('#map1').append('div')
        .attr('id', 'infoDivB')
        .attr('class', 'infoDiv')
        .style('top', '10px')
        .style('margin-left', '' + ((d3.select('#map1').property('clientWidth') - 15)/2) + 'px')
        .style('margin-right', '15px')
    //.append('span').html('Test DEF');
        
	makeYearMenu(g2, 1, '#menu1a');
			
	cb(projection, path);
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

function makeYearMenu(g, num, selector) {

	var years = [];
	for( var i = FIRSTYEAR; i <= LASTYEAR; i++) years.push('' + i);

	var XX = +d3.select(selector).style('width').slice(0,-2) - 30;
	
	g.selectAll('rect')
		.data(years)
	  .enter()
		.append('rect')
			.attr({x: (XX - 48) / 2, width: 48, height: 12})
			.classed('yearRect', true)
			.attr('y', function(d,i) {return 70 + i*15})
			.attr('id', function(d,i) {return 'yearR' + num + d})
			.on('click', function(d,i) {redraw(num,d,i)});

	g.selectAll('text')
		.data(years)
	  .enter()
		.append('text')
			.attr({x: (XX - 24)/2})
			.classed('yearRect', true)
			.attr('y', function(d,i) {return 80 + i*15})
			.text(function(d) {return d;})
			.attr('id', function(d,i) {return 'yearT' + num + d})
			.on('click', function(d,i) {redraw(num, d,i)});
	
	//now make the play pause symbols					
	g.append('rect')
		.attr({x: (XX - 60)/2, y: 25,width: 62, height: 15, id: 'ALL'})
		.classed('playRect', true)
		.classed('playRectSelected', true)
		.on('click', switchSeason)
	g.append('text')
		.attr({x:(XX - 24)/2, y: 37, id: 'ALLT'})
		.classed('playRect', true)
		.classed('playRectSelected', true)
		.on('click', switchSeason)
		.style('font-size', 13)
		.text('ALL')
	g.append('rect')
		.attr({x: (XX - 60)/2, y: 45,width: 62, height: 15, id: 'SUM'})
		.classed('playRect', true)
		.on('click', switchSeason)
	g.append('text')
		.attr({x:(XX - 55)/2, y: 57, id: 'SUMT'})
		.classed('playRect', true)
		.on('click', switchSeason)
		.style('font-size', 13)
		.text('SUMMER')
}

function switchSeason() {
    mapSeason = !mapSeason;
    if(mapSeason) {
        d3.select('#ALL').classed('playRectSelected', false);
        d3.select('#ALLT').classed('playRectSelected', false);
        d3.select('#SUM').classed('playRectSelected', true);
        d3.select('#SUMT').classed('playRectSelected', true);
    } else {
        d3.select('#ALL').classed('playRectSelected', true);
        d3.select('#ALLT').classed('playRectSelected', true);
        d3.select('#SUM').classed('playRectSelected', false);
        d3.select('#SUMT').classed('playRectSelected', false);
    }
    updateMap(mapYear);
}

function makeSelectionMenu(g) {
	var allKeys = _.keys(allPlants[0])

	var HUCkeysToColor = [
		'',
        'HUC2',
		'WaterUse',
		'WaterDraw'
	];
	
	var keysToColor = [
		'',
		'RFURB',
		'RYR',
		'SUMCAP',
		'FUELTYPE',
		'COOLTECH',
		'UNITTECH',
		'FUELREG',
        'WATERSOURCE',
		'Generation',
		'WaterUse',
		'WaterDraw'
	];
	
	var keysToRadius = [
		'',
		'SUMCAP',
		'Generation',
		'WaterUse',
		'WaterDraw',
	];
	
	var keysToFilter = [
		'',
		'COOLTECH',
		'FUELTYPE',
		'UNITTECH',
        'WATERSOURCE'
	];
	
	//make the HUC color selector
	d3.select('#HUCSelect').on('change', function(d) {
			HUCcolor($(this).val());
		})
	  .selectAll('option')
		.data(HUCkeysToColor)
	  .enter()
		.append('option')
		.text(function(d) {return d;});
	
	//make the plant color selector
	d3.select('#colorSelect').on('change', function(d) {
			color($(this).val());
		})
	  .selectAll('option')
		.data(keysToColor)
	  .enter()
		.append('option')
		.text(function(d) {return d;});
	
	//make the radius selector
	d3.select('#radiusSelect').on('change', function(d) {
			radius($(this).val());
		})
	  .selectAll('option')
		.data(keysToRadius)
	  .enter()
		.append('option')
		.text(function(d) {return d;});
	
	//make the filter selector
	d3.select('#filterSelect').on('change', function(d) {
			makeFilterPlantsBy($(this).val());
		})
	  .selectAll('option')
		.data(keysToFilter)
	  .enter()
		.append('option')
		.text(function(d) {return d;});	
	
    //$('#HUCSelect').val('WaterUse');
}

function HUCreduceFunction(sum, n) {
	return sum + n[HUC_Key]
}

function HUCcolor( key ) {
	    
	if(key === '') {
		HUC_Key = _.noop();
		HUC_Scale = _.noop();
	} else if (_.has(USEdata[0], key)) {
        HUC_Key = key;
        //check if it is continuous (number) or discrete
        if( isNaN(USEdata[0][key]) ) {
            //discrete
            var uniques = _.uniq(_.pluck(USEdata, key));
            var d3Scale = d3.scale.category20();
            var tempScale = {};
            _.forEach(uniques, function(d, i) {
                tempScale[d] = d3Scale(i%20);
            });
            HUC_Scale = function (d) {
                return tempScale[d];
            };
        } else {
            //continuous
            //var allVals = _.map(USEdata, function(d) {return +d[key]});
            //var goodVals = _.compact(allVals);
            //var max = _.max(goodVals);
            //var min = _.min(goodVals);
           
            var colorDomain = getDomain(0, 1100000000, 5);

            HUC_Scale = d3.scale.linear()
                .domain(colorDomain)
                .range(['blue', 'green', 'yellow', 'orange', 'red']);	
        }
    } else if (key === 'HUC2') {
        HUC_Key = key;
        var uniques = _.range(1,19);
        var d3Scale = d3.scale.category10();
        var tempScale = {};
        _.forEach(uniques, function(d, i) {
            tempScale[d] = d3Scale(i%20);
        });
        HUC_Scale = function (d) {
            return tempScale[d];
        };
    } else {
        console.log("HUC didn't work");
        HUC_Key = _.noop();
        HUC_Scale = _.noop();		
    }
    updateBasins()	
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

function RadiusReduceFunction(sum, p) {
	return sum + p[Radius_Key];
}

function getPlantColor(plant) {
	if( _.has(plant, Color_Key)) return Color_Scale(plant[Color_Key]);
	else {
		var temp = _.filter(PlantData, 
			function(d) {
				return (d.IGRP === plant.IGRP) && (d.Year === mapYear);
			}
		)
		//console.log(plant.IGRP, Radius_Key, mapYear);
		if(temp.length === 0) {
			//console.log('no match', mapYear, plant)
			return 'black';
		} else if (temp.length > 1) {
			//console.log('match length: ' + temp.length)
			//now find sum across season
			
			var value = _.reduce(temp, function(sum, d) {
            var product
            switch(d.Season) {
                case 'Winter':
                    product = 121 * d[Color_Key];
                    break;
                case 'Summer':
                    product = 122 * d[Color_Key];
                    break;
                case 'Spring':
                case 'Fall':
                    product = 61 * d[Color_Key];
                    break;
                default:
                    product = 0;
                    console.log('bad season: ', d);
            }
            return sum + product;   
        }, 0) / 3
			if(value === 0) return 'black'
			else return Color_Scale(value);
		} else {
			return Color_Scale(temp[0][Color_Key])
		}		
	}
}

function getPlantColorValue(plant) {
	if( _.has(plant, Color_Key)) return plant[Color_Key];
	else {
		var temp = _.filter(PlantData, 
			function(d) {
				return (d.IGRP === plant.IGRP) && (d.Year === mapYear);
			}
		)
		//console.log(plant.IGRP, Radius_Key, mapYear);
		if(temp.length === 0) {
			//console.log('no match', mapYear, plant)
			return 'black';
		} else if (temp.length > 1) {
			//console.log('match length: ' + temp.length)
			//now find sum across season
			
			var value = _.reduce(temp, RadiusReduceFunction, 0) / 3
			if(value === 0) return 'black'
			else return value;
		} else {
			return temp[0][Color_Key]
		}		
	}
}

function color( key ) {
	if(key === '') {
		Color_Key = _.noop();
		Color_Scale = _.noop();
	} else if (_.has(allPlants[0], key)) {
		Color_Key = key;
		//check if it is continuous (number) or discrete
		if( isNaN(allPlants[0][key]) ) {
			//discrete
			var uniques = _.uniq(_.map(allPlants, function(d) {return d[key]}));
			var d3Scale = d3.scale.ordinal()
                .range(['#aa6600', '#2277cc', '#ff1166' ]);
            //d3Scale = d3.scale.category10();
			var tempScale = {};
			_.forEach(uniques, function(d, i) {
				tempScale[d] = d3Scale(i%20);
			});
			Color_Scale = function (d) {
				return tempScale[d];
			};
		} else {
			//continuous
			var allVals = _.map(allPlants, function(d) {return +d[key]});
			var goodVals = _.compact(allVals);
			var max = _.max(goodVals);
			var min = _.min(goodVals);
			var colorDomain = getDomain(min, max, 5);

			Color_Scale = d3.scale.linear()
				.domain(colorDomain)
				.range([ 'violet', 'blue', 'green', 'yellow', 'orange', 'red', 'pink']);	
		}
	} else if (_.has(PlantData[0], key)) {
		//now search through the 'other' file for these data by IGRP
		Color_Key = key;
		var goodVals = _.compact(
						_.map(PlantData, 
							function(d) {return +d[key]}
						)
					   );
		var max = 365 * _.max(goodVals);
		var min = _.min(goodVals);
		
		var temp = min/2;
		
		var colorDomain = getDomain(min - temp, max + temp, MAXRADIUS);

		Color_Scale = d3.scale.linear()
			.domain(colorDomain)
			.range(['blue', 'green', 'yellow', 'orange', 'red']);	
		
	} else {
		Color_Key = _.noop();
		Color_Scale = _.noop();		
	}
    updateColorLegend();
	updateMap(mapYear)
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

function getDomain(min, max, num) {
	//use a quad root! or exp fit
	var newMin = Math.pow(min, 0.25);
	var newMax = Math.pow(max, 0.25);
	var step = (newMax - newMin) / (num - 1);

	var domain = [min];
	for(var i = 1; i < num-1; i++) {
		domain.push( Math.pow(newMin + step * i, 4)); 
	}
	domain.push(max);
	return domain;	
}

function showAllPlants() {
	plants = allPlants;
	updateMap()
}

function addOrRemove( value ) {
	var key = $('#filterSelect').val()
	
	if (d3.select('#check'+value).property('checked') ) {
		//add it!
		var toAdd = _.filter(allPlants, function(d) {
			return (d[key] === value)
		})
		plants = _.flatten([plants, toAdd], true)
	} else {
		//remove it!
		plants = _.filter(plants, function(d) {
			return (d[key] !== value);
		});
	}
	updateMap(mapYear)
}

function makeFilterPlantsBy( category ) {
	if( category === '' ) return;
	
	showAllPlants();

	//use uniq and map to get all possible values
	var uniques = _.uniq(_.map(allPlants, function(d) {return d[category]}));
	
	//now make some check boxes
	var dat = d3.select('#filter').selectAll('.checkbox')
		.data(uniques, function(d, i) {return d + i;});

	dat.enter()
	  .append('div')
	    .classed('checkbox', true)
		.append('label')
		.html(function(d) {
			return '<input type="checkbox" checked="true" id="check' + d + '">' + d})
		.on('change', function(d) {
			addOrRemove(d);
			})
	dat.exit().remove()
}

function drawBasins() {
    
    d3.select('#States').selectAll('.state')
        .data(STATES.features)
      .enter().append('path')
        .attr('class', function(d) { return 'state state' + d.id})
		.attr('d', path);

	//make the basins
	d3.select('#Basins').selectAll('.HUC')
		.data(HUC.features)
      .enter().append('path')
		.attr('class', function(d) { return 'HUC ' + d.properties.REG})
		.style('fill', 'green')
		.on('mouseover', makeBasintip)
        .on('click', makeBasinBox)
		.on('mouseout', removeBasintips)	
		.attr('d', path);
	
	//now make the menu
	makeSelectionMenu()
	showElapsed() 
}

function updateBasins() {

    $('body').css('cursor', 'progress')
    var tt = new Date();
	d3.selectAll('.HUC')
		.style('fill', getBasinFill)
    $('body').css('cursor', 'default')
    console.log(new Date().getTime() - tt.getTime());
}

function getBasinFill(basin) {
    if(HUC_Key === 'HUC2') {
        return HUC_Scale(Number(basin.properties.REG))
    } else if (typeof HUC_Scale === 'undefined') {
		return 'green';
	} else {
        var yearHUC = _.where(HUCdata, {Year: String(mapYear)});
		var temp = _.filter(yearHUC, 
			function(dd) {
				return dd.HUC8.indexOf(basin.properties.HUC_CODE) === 0;
			}
		)
		
		if(temp.length === 0) {
			return 'lightgray';
		} else  {
			//now reduce HUCs that cross state lines
            //or sum across seasons?
			var value = _.reduce(temp, function(sum, d) {
                var product
                switch(d.Season) {
                    case 'Winter':
                        product = 121 * d[HUC_Key];
                        break;
                    case 'Summer':
                        product = 122 * d[HUC_Key];
                        break;
                    case 'Spring':
                    case 'Fall':
                        product = 61 * d[HUC_Key];
                        break;
                    default:
                        product = 0;
                        console.log('bad season: ', d);
                }
                return sum + product;
            }, 0)
			if(value === 0) return 'lightgray'
			else return HUC_Scale(value);
		} 
	}
}

function getBasinVal(basin, key) {
    if( key === 'WaterUse') {
        var yearHUC = _.where(USEdata, {Year: String(mapYear)});
    } else {
        var yearHUC = _.where(HUCdata, {Year: String(mapYear)});
    } 
    var temp = _.filter(yearHUC, 
        function(dd) {
            return dd.HUC8.indexOf(basin.properties.HUC_CODE) === 0;
        }
    )
    
    //check mapSeason
    if (mapSeason) {
        //it's summer!
        temp[0]
        temp = _.where(temp, {Season: 'Summer'});
    }
		
    if(temp.length === 0) {
        return '0';
    } else {
        if(key === 'agUse') {
            temp = _.where(temp, {UseSector: 'AG'});
            key = 'WaterUse';
        } else if (key === 'powerUse') {
            temp = _.where(temp, {UseSector: 'POWER'});
            key = 'WaterUse';
        }
        //now reduce HUCs that cross state lines
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
        if(value === 0) return '0'
        else return value;
    } 
}

function redraw(num, d, i) {
    console.log(num, d, i)
	switch(num) {
		case 1:
			updateMap(d,i);
			break;
	}
}

function updateMap(year) {
	year = year || String(FIRSTYEAR);
    
	d3.select('#yearR1' + mapYear)
		.classed('yearRectSelected',false)
	d3.select('#yearT1' + mapYear)
		.classed('yearRectSelected',false)
		
	d3.select('#yearR1'+year)
		.classed('yearRectSelected',true)
	d3.select('#yearT1'+year)
		.classed('yearRectSelected',true)

	mapYear = year;
	
	var IGRPsThisYear = _.uniq(_.pluck(_.where(PlantData, {
        Year: mapYear
    }), 'IGRP'))
    
	var plantsThisYear = _.filter(plants, function(d) {
        return _.any(IGRPsThisYear, function(igrp) {
            return d.IGRP == igrp;
        })
    })
		
	var ps = d3.select('#Plants').selectAll('.plants')
      .data(plantsThisYear, function(d) {return d.IGRP});
	  
	ps.exit().transition().duration(500)
	  .attr('r', 0)
	  .remove()
	  
    ps.enter().append('circle')
	  .attr('cx', function(d) { return projection([d.LAT, d.LON])[0]})
	  .attr('cy', function(d) { return projection([d.LAT, d.LON])[1]})
	  .attr('class', 'plants')
	  .attr('id', function(d) {return 'plant' + d.IGRP})
	  		
    ps
      .attr('stroke-width', function(d) {
          return 1;
      })  
	  .attr('data-radius', function(d) {
	    if (typeof Radius_Scale === 'undefined') return 1.5;
		else return getPlantRadius(d);
	  })
	  .attr('r', function(d) {
	    if (typeof Radius_Scale === 'undefined') return 1.5;
		else return getPlantRadius(d);
      })
	  .on('mouseover', makeTooltip)
      .on('click', function(d) {
          makePlantBox(d)
          redrawCharts(d)
      })
	  .on('mouseout', removeTooltips)
	  .style('fill', function(d) {
	    if (typeof Color_Scale === 'undefined') return 'black';
		else return getPlantColor(d);
	  })
      
    if(lastBasin) makeBasinBox(lastBasin);
    if(lastPlant) makePlantBox(lastPlant);
	  
	zoom.event(d3.select('#SVG1'))
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

function getPlantVal(plant, key) {
    if(_.has(plant, key)) {
        return plant[key];
    } else {
        //use PlantData to find it!
        var matches = _.where(PlantData, {IGRP: plant.IGRP, Year: mapYear})
        if(mapSeason) {
            matches = _.where(matches, {Season: 'Summer'});
        }
        if (matches.length === 0) {
            return 'no data';
        } else {
            var value = _.reduce(matches, function(sum, d) {
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
            return value;
        }
        
        return 'test';
    }
}

function makeTooltip(plant) {
	var textB = d3.select('#Tooltips').selectAll('svg')
		.data([plant], function(d) {return d.IGRP;}).enter();
		
	//var cx = projection([+plant.LAT, +plant.LON])[0];
	//var cy = projection([+plant.LAT, +plant.LON])[1];
	var width = 180;
	
	textB.append('rect')
	//	.attr('x', cx - (width/2) - 5)
		.attr('x', 200)
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
		.attr('class', 'tooltip' + plant.IGRP + ' ToolTip')

	var text = getTooltipText(plant);
	
	_.forEach(text, function (lineOfText, i) {
		var ttt = textB.append('text')
			.attr('font-size','18')
			.attr('font-family','calibri')
			.attr('opacity', 0.9)
		//	.attr('x', function (d) { return cx - (width/2); })
			.attr('x', 210)
			.attr('y', 520 + i*25)
		//	.attr('y', function (d) { return cy - 62 + i*25; })
			.attr('class', 'tooltip' + plant.IGRP + ' ToolTip')
			.text(lineOfText);
	});
}

function getTooltipText(plant) {

    var filterKey = $('#filterSelect').val()
    var outText = [];
	//console.log(plant);

    outText.push( 'IGRP: ' + plant.IGRP );
    //outText.push( Radius_Key + ': ' + Math.round(getPlantRadiusValue(plant)) );
    //outText.push( filterKey + ': ' + plant[filterKey] );
    
    return outText;
}

function prepChart2() {

	var g = d3.select('#chart2').append('svg')
	g.attr('id', 'SVG2')
	 .attr('width', +d3.select('#chart2').style('width').slice(0,-2) - 30)
	g.attr('height', 510)
    //g.attr('height', g.attr('width') / aspectRatio)
	 .classed('chartSVG', true);
			
	g.append('text')
		.attr({x: 150, y: 45, id:'chartTitle2'})
		.classed('chartTitle', true)
		.text('Scatter Plot')

	g.append('text')
		.attr({x: 200, y: 150, id:'loading2'})
		.classed('loadingText', true)
		.text('LOADING DATA...')
		
	//makeYearMenu(g2, 2, '#menu2');
    createAxes2(g,2);
}

function prepChart3() {

	var g = d3.select('#chart3').append('svg')
	g.attr('id', 'SVG3')
	 .attr('width', +d3.select('#chart3').style('width').slice(0,-2) - 30)
	g.attr('height', 510)
    //g.attr('height', g.attr('width') / aspectRatio)
	 .classed('chartSVG', true);
			
	g.append('text')
		.attr({x: 150, y: 45, id:'chartTitle3'})
		.classed('chartTitle', true)
		.text('Scatter Plot')

	g.append('text')
		.attr({x: 200, y: 150, id:'loading3'})
		.classed('loadingText', true)
		.text('LOADING DATA...')
		
    createAxes3(g,2);
}

function createAxes2(g, i) {
	//prep the chart
	chart2 = new dimple.chart(g, null);
	setBound(chart2);
	
	var x = chart2.addCategoryAxis('x', 'Year');
	x.addOrderRule(function(a,b) {return +a.Year - b.Year});
	x.fontSize = AXIS_FONT_SIZE;
	x.showGridlines = true;
	
	var y1 = chart2.addMeasureAxis('y', 'WaterUse');
	y1.tickFormat = TICK_FORMAT;
	y1.fontSize = AXIS_FONT_SIZE;
    
    var y2 = chart2.addMeasureAxis('y', 'Generation');
	y2.tickFormat = TICK_FORMAT;
	y2.fontSize = AXIS_FONT_SIZE;
	
	var series1 = chart2.addSeries('Season', dimple.plot.bubble, [x, y1]);
	var series2 = chart2.addSeries('Season', dimple.plot.line, [x, y2]);
	addLegend(chart2, series1)
    
    d3.select('#chartTitle2')
        .text('Water Consumption & Energy Generation, average seasonal day');
}

function createAxes3(g, i) {
	//prep the chart
	chart3 = new dimple.chart(g, null);
	setBound(chart3);
	
	var x = chart3.addCategoryAxis('x', 'Year');
	x.addOrderRule(function(a,b) {return +a.Year - b.Year});
	x.fontSize = AXIS_FONT_SIZE;
	x.showGridlines = true;
	
	var y1 = chart3.addMeasureAxis('y', 'WaterUse');
	y1.tickFormat = TICK_FORMAT;
	y1.fontSize = AXIS_FONT_SIZE;
    	
	var series1 = chart3.addSeries('Season', dimple.plot.bubble, [x, y1]);
	addLegend(chart3, series1)
    
    d3.select('#chartTitle3')
        .text('Water Consumption by season');

}
function redrawCharts(plantOrHUC) {
    if(_.has(plantOrHUC, 'IGRP')) {
        //plant
        CHART_DATA2 = _.where(PlantData, {IGRP: plantOrHUC.IGRP});
        d3.select('#chartTitle2')
            .text('Water Consumption & Energy Generation, average seasonal day: ' + plantOrHUC.IGRP);

        chart2.data = CHART_DATA2;
        chart2.draw(500);
        
        chart2.axes[1].titleShape.text('Water Use per Day (thousand gallons)')
        chart2.axes[2].titleShape.text('Generation per Day (GWh)')

    } else {
        //HUC
        CHART_DATA3 = _.filter(USEdata, function(d) {
            return d.HUC8.slice(0,-3) === plantOrHUC.properties.CAT;
        })
        d3.select('#chartTitle3')
            .text('Water Consumption by Season: ' + plantOrHUC.properties.CAT);

        chart3.data = CHART_DATA3;
        chart3.draw(500);        
    }
}

function play(num) {
	switch(num) {
		case 1:
			play1();
			break;
		case 2:
			play2();
			break;
	}
}
function pause(num) {
	switch(num) {
		case 1:
			pause1();
			break;
		case 2:
			pause2();
			break;
	}
}

function play1() {
	console.log('play', mapYear);
	
	//make play active
	d3.select('#play1').classed('playRectSelected', true)
	d3.select('#playT1').classed('playRectSelected', true)
	d3.select('#pause1').classed('playRectSelected', false)
	d3.select('#pauseT1').classed('playRectSelected', false)
		
	var start = (mapYear === 'LASTYEAR') ? FIRSTYEAR : +mapYear;
	var end = LASTYEAR;
	
	var arr = [];
	for( var y = start; y <= end; y++) arr.push(y);
	
	_.forEach(arr, function (y, i) {
		eventQueue.push( setTimeout(function() {updateMap('' + arr[i])
			if(arr[i] === LASTYEAR) {
				d3.select('#play1').classed('playRectSelected', false)
				d3.select('#playT1').classed('playRectSelected', false)
				d3.select('#pause1').classed('playRectSelected', true)
				d3.select('#pauseT1').classed('playRectSelected', true)
				setTimeout(pause1, i*600+700);
			}
		}, i*600));
	});	
}
function pause1() {
	console.log('pause');
	d3.select('#play1').classed('playRectSelected', false)
	d3.select('#playT1').classed('playRectSelected', false)
	d3.select('#pause1').classed('playRectSelected', true)
	d3.select('#pauseT1').classed('playRectSelected', true)
	_.forEach(eventQueue, function(d) {
		clearTimeout(d)
	})
	eventQueue = [];
}

function play2() {
	
}
function pause2() {
	
}

function setBound(chart) {
	chart.setBounds('10%', 60, '70%', 400);
}

function addLegend(chart, series) {
	chart.addLegend('83%', 50, '2%', 500, 'left'); //, series);
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


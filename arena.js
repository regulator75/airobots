//
// ADD YOUR ROBOT HERE
//
// General info
//  Angles in radians, 0 straight down
//  X down, Y to the right
//  Matches begins with robots in random locations and random directions.
//  
//
// Functions you should implement
//  init() // Your constructor. Use "this" to store state
//
//  tick() // Called once per game round. 
//
// Functions you can use in "gameboard", in your "tick"
//  shoot(angle, distance) //  Will fire a grenade in the desired direction and it will explode after traveling "distance".
//                         // The grenade speed is 7. Robot speeds are 1.5. Blast radius is 20. Damage is 50 at a perfect hit.
//                         // A robot have 100 health.
//                         // The grenade launcher will load one shell into the magazine every 20 clicks
//	                       // The grenade launcher can hold 3 shells in its clip. Robot can shoot one shell per tick, 
//                         // if there are one or more grenades in the magazine.
// 
//
//  scan(direction, width) // Checks if there are any robots in that direction. The search area is "width" wide. 
//                         // You can only scan once per tick
//                         // If there are robots within the scan arc, you will get the robot ID and the distance to it.
//                         // Wider scan arc makes it easier to see robots, but the location will be less precise since
//                         // you dont know the angle at where the robot is.
//                
//
//  

var YOUR_ROBOT_AI = {
	name : function() {return "YOUR_ROBOT_AI"},
	init : function() {},
	tick : function(gameboard) {
		
	}
}



// Mr stupid. Keeps on walking until it hits a wall. Shoot in random directions
var robot1_ai = {
	name : function() {return "Stupid chatty"},
	init : function() {},
	tick : function(gameboard) {
		function Short(num) { return Math.round(num * 100) / 100 };

		gameboard.shoot(Math.random() * Math.PI*2, 50 + Math.rand*450); //Most of the time, there will be no grenade to shoot

		gameboard.stdout("Im at "+
			Short(gameboard.x()) +","+
			Short(gameboard.x())+" with "+
			Short(gameboard.magazine())+" shells loaded at time "+
			Short(gameboard.time()))
	}
}


// Mr Focus, looks in a narrow beam for enemies and shoots a grenade if it sees one
var robot2_ai = {
	name : function() {return "Mr Focus"},	
	init : function() {
		this.scan_dir = 0.0
		this.scan_width = Math.PI*2 / 360*10;
	},
	tick : function(gameboard) {

		this.scan_dir += this.scan_width

		var radar_found = gameboard.scan(this.scan_dir, this.scan_width)
		if(radar_found != null) {
			gameboard.shoot(this.scan_dir, radar_found.distance); //Most of the time, there will be no grenade to shoot
			gameboard.stdout("Shot!")
		}
	}
}

// Mr Drunk. Walks in a circle.
var robot3_ai = {
	name : function() {return "Circle walker"},
	init : function() {
		this.walkdir = 0;
		this.walkchangepause = 4;
	},
	tick : function(gameboard) {
		this.walkchangepause --;
		if(this.walkchangepause == 0) {
			this.walkdir += Math.PI*2 / 360*20
			gameboard.drive(this.walkdir)
			this.walkchangepause = 10;
		}
	}
}

// Mr Smartiepants. Chases enemies. Calculates how far to shoot given the delta distance from the last
//                  scan and latest value, if its for the same robot.
var robot4_ai = {
	name : function() {return "Smartiepants"},	
	init : function() {
		this.scan_dir = 0.0
		this.scan_width = Math.PI*2 / 360*30;
		this.last_found_id = 0
		this.last_found_distance =0
	},
	tick : function(gameboard) {

		var radar_found = gameboard.scan(this.scan_dir, this.scan_width)
		if(radar_found != null) {

			gameboard.drive(this.scan_dir) // Drive to the target
			var shoot_distance = radar_found.distance; // May change if we engage same target multiple times
			if(radar_found.id == this.last_found_id) {
				// THIS MATH IS WRONG!
				// We see the same robot twice. Lets figure out how to correct shooting distance.
				// We have moved 1.5 since last time (should be calculated on our X and Y but we dont have that data in the AI yet.)
				var delta_distance = this.last_found_distance - radar_found.distance // Positive number == its coming closer
				var time_for_grenade_to_reach = radar_found.distance / (7+(delta_distance-1.5)) // approximate. Factor in speed of approaching robot in grenade speed.
				//var delta_during_grenade_travel = delta_distance * time_for_grenade_to_reach
				var distance_to_travel = time_for_grenade_to_reach * 7
				shoot_distance = distance_to_travel
			}

			//update tracker
			this.last_found_id = radar_found.id
			this.last_found_distance = radar_found.distance
			
			gameboard.shoot(this.scan_dir, shoot_distance); //Most of the time, there will be no grenade to shoot
		} else {
			// look elsewhere
			this.scan_dir += this.scan_width
		}
	}
}


function create_robots() {
	robots.push(create_robot(YOUR_ROBOT_AI));
	robots.push(create_robot(robot1_ai));
	robots.push(create_robot(robot2_ai));
	robots.push(create_robot(robot3_ai));
	robots.push(create_robot(robot4_ai));

}

//
//
// ENGINE code beings here
// 
// NOTE there are some oddities with this code. 
// 1) The "robot" and "gameboard" entities could be merged to one. They have a 1-1 relationship.
// 2) Constants such as grenade speed and robot speed are not neatly defined, and also therefor not avaliable to the AI
// 3) There is no way for the AI to know its absolute position, except accessing "this.x" and "this.y". Technically I want this to be passed in some structured way
// 4) There are ZERO protection from stopping the AI to reload its container by manipulating "this" etc.
// 




//
// GAME STATE AND ENUMS
//

var robots = []
var grenades = []
var tick_count = 0


var GrenadeMove = {
  GONE: 1,
  BLOW: 2,
  FLYING: 3,
};

function create_grenade( x , y, direction, distance) {
	grenades.push({
		x : x,
		y : y,
		direction : direction,
		distance_remaining : distance,
		speed: 7,
		state: GrenadeMove.FLYING,
		damage : 50.0,
		radius : 20.0
	})

}

var nextFreeRobotID = 1
function create_robot(ai) {

	var toreturn = 	{
		id : nextFreeRobotID++,
		x: Math.random() * 400 + 50,
		y: Math.random() * 400 + 50,
		speed : 0.0,
		wanted_speed: 1.5,
		direction : 0.0,
		wanted_direction : Math.random() * Math.PI*2,	
		health : 100.0,
		ai : ai,
		gameboard:null

	}

	toreturn.gameboard = get_gameboard_for_robot(toreturn);

	return toreturn;
}

function get_gameboard_for_robot(robot) {
	var gameboard_forrobot = {

		scanned_direction : null,
		scanned_width : null,
		scanned_found : null,

		shot_direction : null,
		shot_distance : null,

		shot_in_magazine : 1,

		robot : robot,

		x :       function () { return robot.x },
		y :       function () { return robot.y },
		health:   function () { return robot.health },
		time:     function () { return this.tick_count },
		magazine: function () { return this.shot_in_magazine},
		stdout:   function (msg) { HTML_UpdateMessageForRobot(robot, msg)},


		// return null, or an object containing distance and id {distance:distance, id:id}
		scan : function (dir, width) {

			// Normalize dir to 0 - PI*2
			var direction = dir % (Math.PI*2)
			while(direction < 0)
				direction += Math.PI*2


			if(this.scanned_direction == null) {
				// only allowed to do this once per turn
				this.scanned_direction = direction;
				this.scanned_width = width;
				
				// robot is passed in to get source x and y
				// and to exclude it from what can be seen.
				for(ri in robots) {
					var target = robots[ri]
					if(target.id != this.robot.id) { // Avoid seeing ourselves.
						// This code works best on -PI to +PI, hence the Math.PI*3 adjustment on a
						var angleRadians = Math.atan2(target.x - this.robot.x, target.y - this.robot.y);

						a = angleRadians - direction
						a = (a + Math.PI*3) % (Math.PI*2) - Math.PI
						if( Math.abs(a) < width/2) {
							// HIT
							this.scanned_found = { id:target.id, distance:calculateDistance(this.robot.x, this.robot.y, target.x, target.y)}
							return this.scanned_found
						}						
					}
				}
			}
		},

		shoot : function (direction, distance) {
			if(this.shot_in_magazine >= 1.0 && gameboard.shot_direction != null) {
				this.shot_direction = direction;
				this.shot_distance = distance;
				this.shot_in_magazine -= 1;

				create_grenade(robot.x,robot.y, direction, distance)
			}
		},

		drive : function(direction) {
			robot.wanted_direction = direction;
			robot.wanted_speed = 2.0;
		}
	}
	return gameboard_forrobot
}


//
// DRAWING
//
function draw_robot( r, ctx ) {
	ctx.beginPath()
	ctx.arc(r.x, r.y, 5, 0, 2 * Math.PI);
	ctx.stroke();
	ctx.font = "10px Arial";
	ctx.fillText("" + r.id, r.x-8, r.y-4); // Robot ID
	ctx.fillText("" + Math.ceil(r.health) , r.x-8, r.y+12);

	// Draw the scan so we can debug it
	if(r.gameboard.scanned_direction != null) {
		ctx.beginPath()
		var ss = ctx.strokeStyle
		ctx.strokeStyle = '#9999ff';
		var drawLength = 50
		var radarLeftLimit_x = r.x + drawLength * Math.sin(r.gameboard.scanned_direction - r.gameboard.scanned_width/2)
		var radarLeftLimit_y = r.y + drawLength * Math.cos(r.gameboard.scanned_direction - r.gameboard.scanned_width/2)
		var radarRightLimit_x = r.x + drawLength * Math.sin(r.gameboard.scanned_direction + r.gameboard.scanned_width/2)
		var radarRightLimit_y = r.y + drawLength * Math.cos(r.gameboard.scanned_direction + r.gameboard.scanned_width/2)

		ctx.moveTo(r.x,r.y)
		ctx.lineTo(radarLeftLimit_x,radarLeftLimit_y)
		ctx.moveTo(r.x,r.y)
		ctx.lineTo(radarRightLimit_x,radarRightLimit_y)
		ctx.stroke();
		ctx.strokeStyle = ss
	}

	// Draw the scan so we can debug it
	//if(r.gameboard.shot_direction != null) {
	//	ctx.beginPath()
	//	var ss = ctx.strokeStyle
	//	//ctx.strokeStyle = '#E5FF00';
	//	var shotEnd_x = r.x + r.gameboard.shot_distance * Math.sin(r.gameboard.shot_direction)
	//	var shotEnd_y = r.y + r.gameboard.shot_distance * Math.cos(r.gameboard.shot_direction)
//
	//	ctx.moveTo(r.x,r.y)
	//	ctx.lineTo(shotEnd_x,shotEnd_y)
	//	ctx.stroke();
	//	ctx.beginPath()
	//	ctx.strokeStyle = '#E50000';
	//	ctx.arc(shotEnd_x, shotEnd_y, 5, 0, 2 * Math.PI);
	//	ctx.strokeStyle = ss
	//}



}

function draw_grenade( g, ctx) {
	ctx.beginPath()
	var ss = ctx.strokeStyle;

	if(g.state == GrenadeMove.FLYING) {
		ctx.arc(g.x, g.y, 1, 0, 2 * Math.PI);
	} else if(g.state == GrenadeMove.BLOW) {
		ctx.strokeStyle = '#ff0000';
		ctx.arc(g.x, g.y, g.radius, 0, 2 * Math.PI);		
	}
	ctx.stroke();	
	ctx.strokeStyle = ss;
}




//
// MOVING
//

var border = 5;
function move_robot( r , ctx)
 { 
 	//Move the robot. 
 	r.x += r.speed * Math.sin(r.direction);
 	r.y += r.speed * Math.cos(r.direction);

 	//If he hits the edge, stop.
 	if(r.x > ctx.canvas.width-border) {
 		r.x = ctx.canvas.width-border;
 		r.speed = 0; // Stop the robots movement.
 	}
 	if(r.x < 0+border) {
 		r.x = 0+border;
 		r.speed = 0; // Stop the robots movement.
 	}
 	 if(r.y > ctx.canvas.height-border) {
 		r.y = ctx.canvas.height-border;
 		r.speed = 0; // Stop the robots movement.
 	}
 	if(r.y < 0+border) {
 		r.y = 0+border;
 		r.speed = 0; // Stop the robots movement.
 	}

 }

 function turn_and_accelerate_robot(r) {
 	// Move direction towards "desired direction".
 	// Take circular movement into account..
 	// Simple version
 	r.direction = r.wanted_direction
 	r.speed = r.wanted_speed
 }

 function move_grenade( g, ctx ) {

 	var actual_move = g.speed;
 	if(actual_move > g.distance_remaining)
 		actual_move = g.distance_remaining;

 	g.x += actual_move * Math.sin(g.direction);
 	g.y += actual_move * Math.cos(g.direction) 

 	 //If he hits the edge, its GONE.
 

 	// subtract how far the grenade have traveled.
 	g.distance_remaining -= actual_move;	

 	if(g.x > ctx.canvas.width || g.x < 0 || g.y > ctx.canvas.height || g.y < 0) {
 		//g.state = GrenadeMove.GONE // Flew off the map.
 		g.state = GrenadeMove.BLOW // Approximation of making grenade blow up at the arena wall
	} else if(g.distance_remaining == 0) {
 		g.state = GrenadeMove.BLOW
 	} else {
 		g.state = GrenadeMove.FLYING
 	}
 }


//
// DAMAGE AND DEATH
// 

function calculateDistance(x1, y1, x2, y2 ) {
	
	var 	xs = x2 - x1,
		ys = y2 - y1;		
	
	xs *= xs;
	ys *= ys;
	 
	return Math.sqrt( xs + ys );
}


function deal_damage(g, r) {
	distance = calculateDistance(g.x,g.y,r.x,r.y);
	if(distance > g.radius) {
		return; // too far away
	} else {
		// HIT!
		ratio =  (g.radius - distance) / g.radius
		hitpoints = g.damage * ratio
		r.health -= hitpoints
		if(r.health <= 0)
			r.health = 0; // DEAD
	}
}

function tick() {

	tick_count++;

	// Manage resources like shells and radar bursts.
	//reload their guns
	for( ri in robots) {
		robots[ri].gameboard.shot_direction = null;
		robots[ri].gameboard.shot_distance = null;

		// reload with a 20th of a clip, up to a max of 3
		if(robots[ri].gameboard.shot_in_magazine < 3.0) {
			robots[ri].gameboard.shot_in_magazine += 1.0/20
		}
		
	}

	//reload their radars
	for( ri in robots) {
		robots[ri].gameboard.scanned_direction = null;
		robots[ri].gameboard.scanned_width = null;
	}


	// Let the AIs do their thing
	for( ri in robots) {
		robots[ri].ai.tick(robots[ri].gameboard)
	}


	var c = document.getElementById("myCanvas");
	var ctx = c.getContext("2d");
	ctx.clearRect(0, 0, c.width, c.height);

	// Adjust desired direction
	for( ri in robots) {
		turn_and_accelerate_robot(robots[ri])
	}	

	// Move them
	for( ri in robots) {
		move_robot(robots[ri], ctx)
	}

	for( gi in grenades) {
		move_grenade(grenades[gi], ctx)
	}

	// Math out damage for grenades
	for( gi in grenades) {
		if(grenades[gi].state == GrenadeMove.BLOW) {
			for( ri in robots ) {
				deal_damage(grenades[gi], robots[ri]);
			}			
		}
	}


	// Draw them
	for( ri in robots) {
		draw_robot(robots[ri], ctx)
	}

	for( gi in grenades) {
		draw_grenade(grenades[gi], ctx)
	}

	// Remove grenades and robots that are gone
	grenades = grenades.filter(function(g) { return g.state != GrenadeMove.BLOW});
	robots = robots.filter(function(r) { return r.health > 0.0});

	if(robots.length < 2) {
		// Only one or fewer survivors
		return false
	} else {
		return true
	}
}

//
//
// HTML page generation stuff
//
//
var RobotInfoTemplate = "<H4> ROBOTNAME </H4><div id=\"ROBOTNAME_msg\"> --- </div>";

function HTML_Reset() {
	var L = document.getElementById("robotlist");
	L.innerHTML="";
}

function HTML_AddRobotsToPage() {
	var L = document.getElementById("robotlist");
	for (ri in robots) {
		var div = document.createElement('div');
		div.innerHTML = RobotInfoTemplate.replace(/ROBOTNAME/g,robots[ri].ai.name())
		L.appendChild(div)
	}
}

function HTML_UpdateMessageForRobot(robot, msg) {
	document.getElementById(robot.ai.name() + "_msg").innerHTML=msg;
}



function runner() {
	if( tick() ) {		
		window.setTimeout(runner, 50);
	} else {
		// Game over. Restart
		ResetStateAndLoadRobots();
		runner();
	}
}

function ResetStateAndLoadRobots() 
{
	// Load robot data
	robots = []
	grenades = []
	create_robots();

	// Let the AI initialize
	for( ri in robots) {
		robots[ri].ai.init()
		robots[ri].gameboard = get_gameboard_for_robot(robots[ri]) // yeah..  circularity ftw.
	}


}


function OnLoad() {
	ResetStateAndLoadRobots();
	HTML_Reset();

	HTML_AddRobotsToPage();

	// Get the time moving
	runner();
}


//
// TODO
// 
// Rules of the game in the main view
// Compose a log of all win-loss
// Give robots their basic stats, like location and direction
// Add magazine of 3
// Penalty on changing direction
// Debug markers for tanks
// Step-function to debug tanks.
// Debug function to add travel distance, damage on blast etc.
// Allow the UI to select what robots to include in the game, and then start.
// Add Robot colors


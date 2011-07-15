/* Family analysis */
/* By Ben Crowder */

function Family() {
	this.father;
	this.mother;
	this.children = [];

	// used for generating the timeline
	this.firstChildBirthDate;
	this.lastChildBirthDate;
	this.firstDate;
	this.lastDate;
	this.canvas;
	this.context;

	// load a person's info from the sidebar
	this.getPerson = function(slug) {
		var person = new Person();
		person.name = $("#" + slug + "_name").val();
		person.firstName = getFirstName(person.name);

		person.birth = $("#" + slug + "_birth").val();
		person.birthDate = parseInt(getYear(person.birth));

		person.death = $("#" + slug + "_death").val();
		person.deathDate = parseInt(getYear(person.death));
		if (!person.deathDate) {
			var today = new Date();
			person.lastDate = today.getFullYear();											// for people still living
		}

		var marriage = $("#" + slug + "_marriage").val();
		if (marriage) {
			this.marriage = marriage;
			this.marriageDate = getYear(this.marriage);
		}

		person.lifespan = "";
		if (person.birthDate) { person.lifespan += person.birthDate; }
		if (person.birthDate || person.deathDate) { person.lifespan += "&ndash;"; }
		if (person.deathDate) { person.lifespan += person.deathDate; }

		return person;
	}

	// go through the children
	this.addChild = function(slug) {
		var child = this.getPerson(slug);

		// only add them if there's data
		if (child.name || child.birth || child.death) {
			this.children.push(child);

			if (child.birthDate < this.firstChildBirthDate) { this.firstChildBirthDate = child.birthDate; }
			if (child.birthDate > this.lastChildBirthDate) { this.lastChildBirthDate = child.birthDate; }
		}
	}

	// load the data from the parents and children
	this.load = function() {
		this.father = this.getPerson("father");
		this.mother = this.getPerson("mother");
		this.children.length = 0;
		this.children = [];

		// go through each child
		var family = this;
		$(".person.child").each(function() {
			family.addChild($(this).attr("id"));
		});

		// update the first and last dates for the timeline
		this.updateDateBoundaries();
	}

	// analyze the relationships
	this.analyze = function() {
		var fatherHTML = '';
		var motherHTML = '';
		var childHTML = [];

		// update names and lifespans
		$("#results_father_name").html(this.father.name);
		$("#results_mother_name").html(this.mother.name);

		$("#father_label").html(this.father.name);
		$("#mother_label").html(this.mother.name);

		$("#father_lifespan").html(this.father.lifespan);
		$("#mother_lifespan").html(this.mother.lifespan);

		// marriage length
		var marriageLength = this.getMarriageLength();
		if (marriageLength == 0) {
			marriageLength = "an unknown number of ";
		}
		$("#results_marriage_length").html(marriageLength + " years");

		// number of children
		var childrenHTML = "They had ";
		switch (this.children.length) {
			case 0: childrenHTML += "<span class='age'>no children</span>."; break;
			case 1: childrenHTML += "<span class='age'>one child</span> in <span class='age'>" + this.firstChildBirthDate + "</span>."; break;
			default: childrenHTML += "<span class='age'>" + this.children.length + " children</span> between <span class='age'>" + this.firstChildBirthDate + "</span> and <span class='age'>" + this.lastChildBirthDate + "</span> (a <span class='age'>" + (this.lastChildBirthDate - this.firstChildBirthDate) + "-year span</span>)."; break;
		}
		$("#results_children").html(childrenHTML);

		var fatherEvents = [];
		var motherEvents = [];

		// age of parents at birth of each other
		var ageAtBirths = ageAtBirth(this.father, this.mother);
		if (ageAtBirths.person1) {
			fatherEvents.push({ event: 'birth', name: 'Wife', age: ageAtBirths.person1, year: this.mother.birthDate });
		} else if (ageAtBirths.person2) {
			motherEvents.push({ event: 'birth', name: 'Husband', age: ageAtBirths.person2, year: this.father.birthDate });
		}

		// ages at marriage
		var marriageAges = agesAtMarriage(this);
		if (this.marriageDate) {
			if (this.father.firstName) {
				fatherEvents.push({ event: 'Marriage', age: marriageAges.husband, year: this.marriageDate });
			}
			if (this.mother.firstName) {
				motherEvents.push({ event: 'Marriage', age: marriageAges.wife, year: this.marriageDate });
			}
		}

		// ages at death (spouses)
		var ageAtDeaths = ageAtDeath(this.father, this.mother);
		if (ageAtDeaths.person1) {
			fatherEvents.push({ event: 'death', name: 'Wife', age: ageAtDeaths.person1, year: this.mother.deathDate });
		} else if (ageAtDeaths.person2) {
			motherEvents.push({ event: 'death', name: 'Husband', age: ageAtDeaths.person2, year: this.father.deathDate });
		}

		// ages at birth of children
		for (var c in this.children) {
			var child = this.children[c];

			var ageAtBirths = ageAtBirth(this.father, child);
			if (ageAtBirths.person1) {
				fatherEvents.push({ event: 'birth', name: child.firstName, age: ageAtBirths.person1, year: child.birthDate });
			}

			var ageAtBirths = ageAtBirth(this.mother, child);
			if (ageAtBirths.person1) {
				motherEvents.push({ event: 'birth', name: child.firstName, age: ageAtBirths.person1, year: child.birthDate });
			}
		}

		// ages at death of children
		for (var c in this.children) {
			var child = this.children[c];

			var ageAtDeaths = ageAtDeath(this.father, child);
			if (ageAtDeaths.person1) {
				fatherEvents.push({ event: 'death', name: child.firstName, age: ageAtDeaths.person1, year: child.deathDate });
			}

			var ageAtDeaths = ageAtDeath(this.mother, child);
			if (ageAtDeaths.person1) {
				motherEvents.push({ event: 'death', name: child.firstName, age: ageAtDeaths.person1, year: child.deathDate });
			}
		}

		fatherEvents.sort(sortArray);
		motherEvents.sort(sortArray);

		// parse parents' info and create HTML
		if (fatherEvents.length > 0) {
			for (var e in fatherEvents) {
				var s = (fatherEvents[e].age == 1) ? '' : 's';
				var eventTitle = '';
				if (fatherEvents[e].name) {
					eventTitle += fatherEvents[e].name + "&rsquo;s ";
				} 
				eventTitle += fatherEvents[e].event;
				fatherHTML += getEventHTML(eventTitle, fatherEvents[e].year, fatherEvents[e].age);
			}
		} else {
			fatherHTML = "<tr><td class='event'>No events available</td><td></td></tr>";
		}
		if (motherEvents.length > 0) {
			for (var e in motherEvents) {
				var s = (motherEvents[e].age == 1) ? '' : 's';
				var eventTitle = '';
				if (motherEvents[e].name) {
					eventTitle += motherEvents[e].name + "&rsquo;s ";
				} 
				eventTitle += motherEvents[e].event;
				motherHTML += getEventHTML(eventTitle, motherEvents[e].year, motherEvents[e].age);
			}
		} else {
			motherHTML = "<tr><td class='event'>No events available</td><td></td></tr>";
		}

		// and put the HTML in
		$("#father_results").html(fatherHTML);
		$("#mother_results").html(motherHTML);

		// now parse children's info
		for (var c in this.children) {
			var childEvents = [];
			var child = this.children[c];

			// add siblings' births
			for (var sibling in this.children) {
				if (c != sibling) {
					birthAges = ageAtBirth(child, this.children[sibling]);
					if (birthAges.person1) {
						childEvents.push({ event: 'birth', name: this.children[sibling].firstName, age: birthAges.person1, year: this.children[sibling].birthDate });
					}
				}
			}

			// add siblings' deaths
			for (var sibling in this.children) {
				if (c != sibling) {
					deathAges = ageAtDeath(child, this.children[sibling]);
					if (deathAges.person1) {
						childEvents.push({ event: 'death', name: this.children[sibling].firstName, age: deathAges.person1, year: this.children[sibling].deathDate });
					}
				}
			}

			// add parents' deaths
			if (this.father.deathDate) {
				deathAges = ageAtDeath(child, this.father);
				if (deathAges.person1) {
					childEvents.push({ event: 'death', name: 'Father', age: deathAges.person1, year: this.father.deathDate });
				}
			}
			if (this.mother.deathDate) {
				deathAges = ageAtDeath(child, this.mother);
				if (deathAges.person1) {
					childEvents.push({ event: 'death', name: 'Mother', age: deathAges.person1, year: this.mother.deathDate });
				}
			}

			// sort the array
			childEvents.sort(sortArray);

			// parse it and create HTML
			var childNum = parseInt(c) + 1;
			var childObject = $("#child" + childNum + "_results");
			if (childEvents.length > 0) {
				for (var e in childEvents) {
					var s = (childEvents[e].age == 1) ? '' : 's';
					childHTML[c] += getEventHTML(childEvents[e].name + "&rsquo;s " + childEvents[e].event, childEvents[e].year, childEvents[e].age);
				}
			} else {
				childHTML[c] = "<tr><td class='event'>No events available</td><td></td></tr>";
			}
			childObject.html(childHTML[c]);

			// and update the name
			$("#child" + childNum + "_label").html(child.name);
			$("#child" + childNum + "_lifespan").html(child.lifespan);
		}
	}

	// update the global first/last dates based off this person's info
	this.updateDateBracket = function(person) {
		if (person.birthDate < this.firstDate) { this.firstDate = person.birthDate; }
		if (person.deathDate > this.lastDate) { this.lastDate = person.deathDate; }
		if (person.lastDate > this.lastDate) { this.lastDate = person.lastDate; }			// for people still living
	}

	// update global child first/last dates
	this.updateChildDateBracket = function(child) {
		if (child.birthDate < this.firstChildBirthDate) { this.firstChildBirthDate = child.birthDate; }
		if (child.birthDate > this.lastChildBirthDate) { this.lastChildBirthDate = child.birthDate; }
	}

	// load first/last dates
	this.updateDateBoundaries = function() {
		this.firstChildBirthDate = 5000;
		this.lastChildBirthDate = -5000;
		this.firstDate = 5000;
		this.lastDate = -5000;

		this.updateDateBracket(this.father);
		this.updateDateBracket(this.mother);
		for (var i in this.children) {
			this.updateDateBracket(this.children[i]);
			this.updateChildDateBracket(this.children[i]);
		}
	}

	// get marriage length for the parents
	this.getMarriageLength = function() {
		var marriage_length = 0;
		if (this.father.deathDate || this.mother.deathDate) {
			marriage_length = Math.min(this.father.deathDate, this.mother.deathDate) - this.marriageDate;
		} else {
			if (this.children.length > 0) {
				marriage_length = this.lastChildBirthDate - this.marriageDate;
				marriage_length += '+';		// 50+ years, for example, since we don't have a death date
			}
		}

		if (marriage_length > 0) {
			return marriage_length;
		} else {
			return 0;
		}
	}

	// draw the bar for a person (on the timeline)
	this.drawPersonBar = function(person, y) {
		if (!person) {
			console.log("Undefined");
			return;
		}

		cv = this.canvas;
		c = this.context;
		c.beginPath();

		c.fillStyle = "#000";

		startX = (person.birthDate - this.firstDecade) * (cv.width / this.timeSpan);
		if (person.deathDate) {
			endX = startX + (person.deathDate - person.birthDate) * (cv.width / this.timeSpan);
		} else if (person.lastDate) {
			endX = startX + (person.lastDate - person.birthDate) * (cv.width / this.timeSpan);
		} else {
			// go to the end if they're not dead
			endX = cv.width + 100;
		}

		c.lineWidth = 2;
		c.strokeStyle="#000";

		// draw line from startX to endX
		c.beginPath();
		c.moveTo(startX, y);
		c.lineTo(endX, y);
		c.stroke();
		c.closePath();

		// draw circle at startX,y and endX, y
		c.fillStyle = "#000";
		c.beginPath();
		c.arc(startX + 1, y, 3, 0, Math.PI * 2, false);
		c.fill();
		c.closePath();

		if (person.deathDate) {
			c.beginPath();
			c.arc(endX - 1, y, 3, 0, Math.PI * 2, false);
			c.fill();
			c.closePath();
		}

		// draw the name
		c.font = "bold 9px helvetica";
		c.textAlign = "right";
		c.textBaseline = "middle";
		c.fillStyle = "#730";
		c.strokeStyle = "#fff";
		c.lineWidth = 3;
		c.strokeText(person.firstName, startX - 10, y);
		c.fillText(person.firstName, startX - 10, y);
		c.closePath();
	}

	// draw the whole timeline
	this.drawTimeline = function() {
		cv = this.canvas;
		c = this.context;

		c.save();

		cv.height = 80 + (this.children.length * 20);
		$("#timeline").height(cv.height);

		c.fillStyle = "#fff";
		c.fillRect(0, 0, cv.width, cv.height);

		this.firstDecade = this.firstDate - (this.firstDate % 10) - 20;		// 1870
		this.lastDecade = this.lastDate - (this.lastDate % 10) + 20;		// 2020
		this.timeSpan = this.lastDecade - this.firstDecade;					// 140

		this.numberTickMarks = this.timeSpan / 10;				// 14
		this.tickMarkSize = cv.width / this.numberTickMarks;		// 46.4

		c.beginPath();
		// Draw the grid
		c.font = "bold 9px helvetica";
		c.textAlign = "center";
		c.textBaseline = "bottom";
		c.fillStyle = "#999";
		var curYear = this.firstDecade;
		for (var x=0; x<=this.numberTickMarks; x++) {
			displayX = Math.ceil(x * this.tickMarkSize);
			c.moveTo(displayX, 15);
			c.lineTo(displayX, cv.height - 5);

			if (x > 0 && x < this.numberTickMarks) {
				c.fillText(curYear, displayX, 12);
			}
			curYear += 10;
		}
		c.strokeStyle = "#ddd";
		c.strokeWidth = 1;
		c.stroke();
		c.closePath();

		c.fillStyle = "rgba(0, 0, 0, 0.05)";
		c.fillRect(0, 15, cv.width, 50);

		// Draw the marriage
		if (this.marriageDate) {
			c.beginPath();
			marriageX = (this.marriageDate - this.firstDecade) * (cv.width / this.timeSpan);
			c.moveTo(marriageX, 15);
			c.lineTo(marriageX, cv.height - 5);
			c.strokeStyle = "rgba(153, 200, 72, 0.9)";
			c.lineCap = 'round';
			c.lineWidth = 2;
			c.stroke();
			c.closePath();
		}
		
		// Draw the parents' bars
		curY = 30;
		this.drawPersonBar(this.father, curY);
		curY += 20;
		this.drawPersonBar(this.mother, curY);
		curY += 30;

		// Draw the children's bars
		for (child in this.children) {
			this.drawPersonBar(this.children[child], curY);
			curY += 20;
		}

		c.restore();
	}

	this.run = function() {
		this.load();
		this.analyze();
		this.drawTimeline();
	}
}

// empty class
function Person() { }


/* Utility functions */
/* -------------------------------------------------- */

// get first name (based off full name)
function getFirstName(name) {
	match = /^([^ ]+)/.exec(name);

	if (match && match[0]) {
		return match[0];
	} else {
		return '';
	}
}

// take a date and extract the year
function getYear(datestr) {
	if (!datestr) return false;

	match = /\d{4}/.exec(datestr);
	if (match && match[0]) {
		return match[0];
	} else {
		return false;
	}
}

// age of person1 at birth of person2
function ageAtBirth(person1, person2) {
	p1year = getYear(person1.birth);
	p2year = getYear(person2.birth);

	ages = {};
	if (p1year && p2year) {
		if (p1year <= p2year) {
			ages["person1"] = p2year - p1year;
		}

		if (p2year <= p1year) {
			ages["person2"] = p1year - p2year;
		}
	}

	if (ages["person1"] || ages["person2"]) {
		return ages;
	} else {
		return false;
	}
}

// age of person1 at death of person2
function ageAtDeath(person1, person2) {
	p1birthYear = getYear(person1.birth);
	p1deathYear = getYear(person1.death);
	p2birthYear = getYear(person2.birth);
	p2deathYear = getYear(person2.death);

	ages = {};

	if (p1birthYear && p1deathYear && p2birthYear && p2deathYear) {
		if (p1birthYear <= p2deathYear && p1deathYear >= p2deathYear) {
			ages["person1"] = p2deathYear - p1birthYear;
		}

		if (p2birthYear <= p1deathYear && p2deathYear >= p1deathYear) {
			ages["person2"] = p1deathYear - p2birthYear;
		}
	}

	if (ages["person1"] || ages["person2"]) {
		return ages;
	} else {
		return false;
	}
}

// get ages of parents at their marriage
function agesAtMarriage(family) {
	husband = family.father;
	wife = family.mother;
	if (!husband && !wife) return false;

	marriageYear = getYear(family.marriage);
	husbandYear = getYear(husband.birth);
	wifeYear = getYear(wife.birth);

	ages = { };
	if (marriageYear) {
		ages["husband"] = (husbandYear) ? marriageYear - husbandYear : "unknown";
		ages["wife"] = (wifeYear) ? marriageYear - wifeYear : "unknown";
	}

	if (ages["husband"] || ages["wife"]) {
		return ages;
	} else {
		return false;
	}
}

// take an integer age and put it into an "x year(s)" string
function getAgeString(age) {
	var s = (age == 1) ? '' : 's';
	return age + " year" + s;
}

// generate the analysis HTML for an event
function getEventHTML(title, year, age) {
	html = "<tr><td class='event'>" + title + " <span class='eventyear'>(" + year + ")</span></td>";
	html += "<td class='age'>" + getAgeString(age) + "</td></tr>";
	return html;
}

// used for sorting arrays
function sortArray(a, b) {
	return a.age - b.age
};



$(document).ready(function() {
	// set up the canvas
	var canvas = document.getElementById("timeline");
	canvas.width = $("#timeline").width();
	canvas.height = $("#timeline").height();
	if (canvas.getContext) {
		var context = canvas.getContext('2d');
	}

	// set up the family
	var family = new Family();
	family.canvas = canvas;
	family.context = context;
	family.run();

	// click handlers
	$("#sidebar input").change(function() {
		family.run();
	});

	// for removing children
	$(".remove_button").click(function() {
		var child_id = $(this).parent().attr("id");
		$(this).parent().remove();					// remove from sidebar
		$("#" + child_id + "_analysis").remove();	// remove the analysis table

		// renumber the remaining children
		var counter = 1;
		$("#sidebar .child").each(function() {
			$(this).attr("id", "child" + counter);

			$(this).children(".textbox").children(".person_name").attr("id", "child" + counter + "_name");
			$(this).children(".textbox").children(".person_name").attr("name", "child" + counter + "_name");
			$(this).children(".row").children(".textbox").children(".person_birth").attr("id", "child" + counter + "_birth");
			$(this).children(".row").children(".textbox").children(".person_birth").attr("name", "child" + counter + "_birth");
			$(this).children(".row").children(".textbox").children(".person_death").attr("id", "child" + counter + "_death");
			$(this).children(".row").children(".textbox").children(".person_death").attr("name", "child" + counter + "_death");

			counter++;	
		});

		counter = 1;
		$("#children_container > div").each(function() {
			$(this).attr("id", "child" + counter + "_analysis");
			$(this).children("h2").attr("id", "child" + counter + "_label");
			$(this).children("table").attr("id", "child" + counter + "_results");
			counter++;
		});

		family.run();
	});

	// click handler for "add a new child" link
	$(".addlink a").click(function() {
		// get new child ID
		var new_id = $("#sidebar .child").length + 1;

		// add new element
		var html = "<div id='child" + new_id + "' class='person child'>\n";
		html += "<span class='remove_button'>x</span>\n";
		html += "<h2>Child</h2>\n";
		html += "\n";
		html += "<section class='textbox'>\n";
		html += "\t<label>Name</label>\n";
		html += "\t<input type='text' id='child" + new_id + "_name' name='child" + new_id + "_name' />\n";
		html += "</section>\n";
		html += "\n";
		html += "<div class='row'>\n";
		html += "<section class='textbox small birth'>\n";
		html += "\t<label>Birth</label>\n";
		html += "\t<input type='text' id='child" + new_id + "_birth' name='child" + new_id + "_birth' />\n";
		html += "</section>\n";
		html += "\n";
		html += "<section class='textbox small death'>\n";
		html += "\t<label>Death</label>\n";
		html += "\t<input type='text' id='child" + new_id + "_death' name='child" + new_id + "_death' />\n";
		html += "</section>\n";
		html += "</div>\n";
		html += "</div>";

		$(html).insertBefore("#sidebar .addlink");

		$("#sidebar input").change(function() {
			family.run();
		});

		html = "<div id='child" + new_id + "_analysis'>\n";
		html += "\t<h2 id='child" + new_id + "_label'></h2>\n";
		html += "\t<h3 id='child" + new_id + "_lifespan'></h3>\n";
		html += "\t<table id='child" + new_id + "_results' class='analysis' cellspacing='0'></table>\n";
		html += "</div>";

		$("#children_container").append(html);

		return false;
	});
});

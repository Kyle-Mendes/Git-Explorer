var data;
var svg = d3.select("svg");

$("svg").mousedown(function () {
	$(this).mousemove(function () {
		var movementX = arguments[0].originalEvent.movementX,
			movementY = arguments[0].originalEvent.movementY,
			viewBox = this.getAttribute("viewBox").split(" ");

		if (movementX) { //move left
			viewBox[0] = +viewBox[0] - movementX * 2;
		}

		if (movementY) { // move down
			viewBox[1] = +viewBox[1] - movementY * 2;
		}

		svg.attr("viewBox", viewBox.join(" "))

	});
}).mouseup(function () {
	$(this).unbind('mousemove');
}).mouseout(function () {
	// $(this).unbind('mousemove');
});


function updateRepo(e) {
	e.preventDefault();

	console.log("getting")

	var uri = $('input').val();

	if (! uri) {
		alert('Please provide a url.');
	}

	var url = 'http://git.kyle.pink/api/repo=' + uri;

	$.ajax({
		url: url,
		type: 'GET',
		dataType: "jsonp",
		success: function (d) {
			console.log("got")
			data = d;
			updateSvg();
			$('.error').html("");
		},
		error: function() {
			$('.error').html("Something went wrong. Please check your url and try again.  Note, don't include the 'http://'");
		}
	});
}

function zoomOut() {
	var viewBox = svg.attr("viewBox").split(" ");
	viewBox[2] = +viewBox[2] + 400;
	viewBox[3] = +viewBox[3] + 400;

	svg.attr("viewBox", viewBox.join(" "))
}

function zoomIn() {
	var viewBox = svg.attr("viewBox").split(" ");
	viewBox[2] = +viewBox[2] - 400;
	viewBox[3] = +viewBox[3] - 400;

	svg.attr("viewBox", viewBox.join(" "))
}

function updateSvg() {
	$("svg").children().remove();

	var branches = data.branches;
	var commits = data.commits;

	var initialCommit = '';

	commitIds = Object.keys(commits);

	for (var i = commitIds.length - 1; i >= 0; i--) {
		if (! commits[commitIds[i]].parentId) {
			initialCommit = commits[commitIds[i]];
			break;
		}
	}

	var initialBranch = initialCommit.branch;

	var branchData = [];

	initialCommit.x = 500;
	initialCommit.y = -100;

	// If the initial branch isn't at [0] we move it to [0] for drawing purposes
	// Could also be sorting by oldest commit
	branches = branches.filter(function(b) { return b !== initialBranch })
	branches.unshift(initialBranch);

	// Set up the branches with their x location based off the initial branch (usually master)
	branchData[initialBranch] = {x: 500, y: 150, name: initialBranch, commits: []};

	branches.forEach(function(branch, i) {
		if (branch !== initialBranch) {
			var x = i % 2 ? 450 - (i * 50) : 500 + (i * 50),
				y = 150;

				branchData[branch] = {x: x, y: y, name: branch, commits: []};
		}
	});

	// Loop through the commits and recursively set the x and y position based off their parent commit and branch
	for (var commit in commits) {
		calculateCommitLocation(commits[commit]);
	}

	function calculateCommitLocation(commit) {
		if (! commit.x) {
			commit.x = branchData[commit.branch].x;
		}
		if (! commit.y) {
			commit.y = commitHeight(commits[commit.parentId]);
		}
	}

	// Recurslively set the commit Y based on their parent
	function commitHeight(commit) {
		if (commit && commit.y) {
			return commit.y + -50;
		} else if (commit) {
			return commitHeight(commits[commit.parentId]) + -50;
		}
	}

	for (var commit in commits) {
		var c = commits[commit];

		branchData[c.branch].commits.push(c)
	}

	var branchSvgData = [];

	for (var b in branchData) {
		branchSvgData.push(branchData[b]);
	}

	var branchGroup = svg.selectAll("g")
	.data(branchSvgData)
	.enter()
	.append("svg:g")
	.attr("class", function (d) {return d.name})
	.attr("transform", function(d) {
		return "translate(" + d.x + "," + d.y + ")";
	});

	var branchText = branchGroup.append("svg:text")
	.attr("text-anchor", "start")
	.text(function (d) { return d.name });

	var commitGroup = branchGroup.selectAll("g")
	.data(function(d, i) {
		return d.commits;
	})
	.enter()
	.append("svg:g")
	.attr("class", "commit")
	.append("svg:circle")
	.attr("r", 5)
	.attr("fill", "red")
	.attr("transform", function(d) {
        console.log(d)
		return "translate(20," + d.y + ")"; // 20 to center over text
	});

	for (var comm in commits) {
		var c = commits[comm];

		if (c.parentId.length &&
			commits[c.parentId]) {
				svg.append("line")
				.attr("x1", c.x + 20)
				.attr("y1", c.y + 150)
				.attr("x2", commits[c.parentId].x + 20) // 20 to center over text
				.attr("y2", commits[c.parentId].y + 150)
				.attr("stroke-width", 1)
				.attr("stroke", "red")
			}
	};
}

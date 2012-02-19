var nodes = {};

function Node(name, parent) {
	this.name = name;
	this.chart = parent.chart || parent;
	this.parent = parent;
	this.children = {};
	this.left = 0;
	this.width = 0;
	this.hidden = false;
	this.lines = [];

	this.link = "CSN2";

	nodes[name] = this;
}

Node.prototype.refresh_visibility = function(hidden_in_tree) {
	if (hidden_in_tree) {
		this.element.hide();
	} else {
		this.element.show();
	}

	if (this.hidden) {
		this.element.find('.expand').text('v');
		hidden_in_tree = true;
	} else {
		this.element.find('.expand').text('^');
	}

	// TODO: Only cascade if something has changed here...
	for (var i in this.children) {
		this.children[i].refresh_visibility(hidden_in_tree);
	}
}

Node.prototype.draw_lines = function() {
	var inner_node = this.element.find('.inner-node');
	var start_position = inner_node.offset();
	start_position.left += (inner_node.width()/2);
	start_position.top += inner_node.height();

	var line;
	while (line = this.lines.pop()) {
		line.remove();
	}

	for(var i in this.children) {
		if (this.children[i].element.is(':visible')) {
			inner_node = this.children[i].element.find('.inner-node');
			var end_position = inner_node.offset();
			end_position.left += inner_node.width()/2;
			draw_line(paper, this, start_position, end_position);
		}
		this.children[i].draw_lines();
	}
}

Node.prototype.calculate_size = function() {
	this.width = 0;
	this.height = 0;

	if (!(this.hidden)) {
		for(var i in this.children) {
			var c_size = this.children[i].calculate_size();
			this.width += c_size.width;
			if (c_size.height > this.height)
				this.height = c_size.height;
		}
	}

	if (this.width < NODE_WIDTH) {
		this.width = NODE_WIDTH;
	}

	this.height += LEVEL_HEIGHT;

	return {width: this.width, height: this.height};
}

// Returns true if positions have changed
Node.prototype.calculate_positions = function() {
	var position_changed = false;

	var left = this.left;

	for(var i in this.children) {
		if (this.children[i].left != left) {
			this.children[i].left = left;
			position_changed = true;
		}

		this.children[i].level = this.level + 1;
		left += this.children[i].width;
		position_changed = this.children[i].calculate_positions() || position_changed;
	}

	return position_changed;
}

Node.prototype.place = function() {
	this.chart.node_count++;

	this.element = $('#nodeTemplate').tmpl({"name": this.name, "children": this.children, "link": this.link}).css({
		"left": BASE_LEFT + this.left, 
		"width": this.width, 
		"top": BASE_LEVEL + this.level * LEVEL_HEIGHT
	}).appendTo($('body'));

	this.element.data('object', this);

	for(var i in this.children) {
		this.children[i].place();
	}
}

Node.prototype.position = function(callback) {
	this.element.animate({
		"left": BASE_LEFT + this.left, 
		"width": this.width, 
		"top": BASE_LEVEL + this.level * LEVEL_HEIGHT
	}, {"complete": callback});

	for(var i in this.children) {
		this.children[i].position(callback);
	}
}

Node.prototype.clear = function() {
	var line;
	while (line = this.lines.pop()) {
		line.remove();
	}

	for (var i in this.children) {
		this.children[i].clear();
	}
}

function Chart(name) {
	this.children = {};
	this.node_count = 0;
	this.name = name;
}

Chart.prototype.refresh_visibility = function() {
	if (this.hidden) {
		this.element.hide();
	} else {
		this.element.show();
	}

	for (var i in this.children) {
		this.children[i].refresh_visibility(this.hidden);
	}

	this.clear()
	this.draw_lines()
}

Chart.prototype.calculate_size = function() {
	this.width = 0;
	this.height = 0;

	if (!(this.hidden)) {
		for(var i in this.children) {
			var c_size = this.children[i].calculate_size();
			this.width += c_size.width;

			if (c_size.height > this.height)
				this.height = c_size.height;
		}
	}

	if (this.width < NODE_WIDTH) {
		this.width = NODE_WIDTH;
	}

	if (this.height < LEVEL_HEIGHT) {
		this.height = LEVEL_HEIGHT
	}

	return {width: this.width, height: this.height};
}

// Returns true if positions have changed
Chart.prototype.calculate_positions = function() {
	var position_changed = false;

	var left = this.left;

	for(var i in this.children) {
		if (this.children[i].left != left) {
			this.children[i].left = left;
			position_changed = true;
		}

		this.children[i].level = 0;
		left += this.children[i].width;
		position_changed = this.children[i].calculate_positions() || position_changed;
	}

	return position_changed;
}

Chart.prototype.place = function() {
	if (count(this.children) > 0) { 
		this.element = $('#chartTemplate').tmpl({"name": this.name}).css({
			"left": BASE_LEFT + this.left, 
			"width": this.width,
			"height": this.height + BASE_LEVEL
		}).appendTo($('body'));

		this.element.data('object', this);

		for(var i in this.children) {
			this.children[i].place();
		}
	}
}

Chart.prototype.position = function(callback) {
	for(var i in this.children) {
		this.children[i].position(callback);
	}
}

Chart.prototype.draw_lines = function() {
	for (var i in this.children) {
		this.children[i].draw_lines();
	}
}

Chart.prototype.redraw = function(options) {
	this.refresh_visibility();
	var old_width = this.width;

	var changed = (old_width != this.calculate_size().width);
	changed = this.calculate_positions() || changed;

	if (options && 'follow' in options) {
		if (changed && follow_on_move.is(':checked')) {
			scroll_to(options['follow']);
		}
	}
	

	if (changed) {
		for (var i in this.children) {
			this.children[i].clear();
		}

		var node_callbacks = 0;
		
		this.position($.proxy(function() {
			node_callbacks += 1;
			if (node_callbacks == this.node_count - 1) {
				this.draw_lines()

				if (options && 'callback' in options) {
					options['callback']();
				}
			}
		}, this));
	} else {
		if (options && 'follow' in options) {
			options['follow'].clear();
			options['follow'].draw_lines();
		}
	}
}

Chart.prototype.clear = function() {
	for (var i in this.children) {
		this.children[i].clear();
	}
}


function count_leading_tabs(line) {
	var tabs = 0;
	while (line.substring(0,1) == '\t') {
		tabs += 1
		line = line.substring(1)
	}
	return [tabs, line];
}

function load_indented_data(data) {
	var lines = data.split('\n');

	var obj = new Chart('BIG CHART')

	load_indented_lines(obj, 0, lines, 0, true);

	return obj.children;
}

function load_indented_lines(obj, level, lines, line_count, is_chart) {
	while (line_count < lines.length) {
		if (lines[line_count] == '' || lines[line_count].indexOf("#") == 0) {
			line_count++;
			continue;
		}

		var line = count_leading_tabs(lines[line_count]);

		if (line.indexOf("#") == 0) {
			line_count++;
			continue;
		}

		if (line[0] == level) {
			if (is_chart) {
				obj.children[line[1]] = new Chart(line[1])
			} else {
				obj.children[line[1]] = new Node(line[1], obj)
			}

			// Assume we can move in by one level and continue looking
			line_count = load_indented_lines(obj.children[line[1]], level + 1, lines, line_count + 1)
		} else {
			return line_count;
		}
	}
	return line_count;
}

function draw_line(paper, el, start_position, end_position) {
	// Try to straighten the lines
	var c;
	if (start_position.left == end_position.left) {
		// Easy
		c = paper.path("M" + start_position.left + " " + start_position.top + "L" + end_position.left + " " + end_position.top);
	} else {
		var middle_top = start_position.top + ((end_position.top - start_position.top)/2);
		c = paper.path("M" + start_position.left + " " + start_position.top + "L" + start_position.left + " " + middle_top + "L" + end_position.left + " " +middle_top + "L" + end_position.left + " " + end_position.top);
	}

	c.attr('stroke-width', 3);
	c.attr('stroke-opacity', 1);

	el.lines.push(c);
}

var paper = Raphael(0, 0, 10000, 10000);

function count(obj) {
	c = 0;
	for (i in obj) {
		if (obj.hasOwnProperty(i)) {
			c++;
		}
	}
	return c;
}

function scroll_to(node) {
	var node_position = node.element.offset();

	node_position.left += (node.width/2) - 100; // 200 is the width of the inner-node

	var top_offset = (0-($(window).height()/2));
	var left_offset =(0-($(window).width()/2));

	node_position.left += left_offset;
	node_position.top += top_offset;

	if (node_position.left < 0) {
		node_position.left = 0;
	}

	if (node_position.top < 0) {
		node_position.top = 0;
	}

	$.scrollTo(node_position, 400);
}

var BASE_LEVEL = 80;
var LEVEL_HEIGHT = 80;
var BASE_LEFT = 200;
var NODE_WIDTH = 210;

var CHART_SPACING = 500;

// function expand_all(el) {
// 	el.hidden = false;
// 	for(var i in el.children) {
// 		expand_all(el.children[i]);
// 	}
// }

var follow_on_move;
var charts;


$(function() {
	follow_on_move = $('#follow_on_move');
	$.get('layout.txt', function(data) {
		charts = load_indented_data(data);
		var left = 0;
		for (var i in charts) {
			var chart_li = $('<li></li>', {'text': charts[i].name}).data('object', charts[i]);
			$('#charts').append(chart_li);

			var c_size = charts[i].calculate_size();

			charts[i].left = left;
			charts[i].calculate_positions();

			left += c_size.width + CHART_SPACING;

			charts[i].place();
			charts[i].draw_lines();
		}

		$('#charts li').click(function() {
			scroll_to($(this).data('object'));
		})

		$('#menu .collapse').click(function() {
			var menu = $(this).parent();

			menu.toggleClass('collapsed');

			if (menu.hasClass('collapsed')) {
				menu.find('.collapse').text('v');
			} else {
				menu.find('.collapse').text('^');
			}
		});

		// $('#expand_all').click(function() {
		// 	expand_all(formatted_data);
		// 	redraw(formatted_data);
		// 	return false;
		// });

		$('.node .inner-node .expand').click(function() {
			var node_el = $(this).closest('.node');
			var node = node_el.data('object');
			node.hidden = !node.hidden;

			node.chart.redraw({follow: node});
		});

		$('.node .inner-node .link').click(function() {
			var node_el = $(this).closest('.node');
			var node = node_el.data('object');

			scroll_to(nodes[node.link]);
		});
	});
})
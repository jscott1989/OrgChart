function Node(name) {
	this.name = name;
	this.children = {};
	this.left = 0;
	this.width = 0;
	this.hidden = false;
	this.lines = [];
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

	if (!(this.hidden)) {
		for(var i in this.children) {
			this.width += this.children[i].calculate_size().width;
		}
	}

	if (this.width < 210) {
		this.width = 210;
	}

	return {width: this.width};
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

function Chart(name) {
	this.children = {};
}

Chart.prototype.refresh_visibility = function() {
	for (var i in this.children) {
		this.children[i].refresh_visibility();
	}
}

Chart.prototype.calculate_size = function() {
	this.width = 0;

	if (!(this.hidden)) {
		for(var i in this.children) {
			this.width += this.children[i].calculate_size().width;
		}
	}

	if (this.width < 210) {
		this.width = 210;
	}

	return {width: this.width};
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

	load_indented_lines(obj, 0, lines, 0);
	return obj;
}

function load_indented_lines(obj, level, lines, line_count) {
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
			obj.children[line[1]] = new Node(line[1])

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

var node_count = 0;
var BASE_LEVEL = 80;
var LEVEL_HEIGHT = 80;
var BASE_LEFT = 200;

function place_nodes(el, name) {
	node_count += 1;
	if (name) {
		if (count(el) > 1) { 
			el.element = $('#nodeTemplateChildren').tmpl({"name": name}).css({
				"left": BASE_LEFT + el.left, 
				"width": el.width,
				"top": BASE_LEVEL + el.level * LEVEL_HEIGHT
			}).appendTo($('body'));
		} else {
			el.element = $('#nodeTemplate').tmpl({"name": name}).css({
				"left": BASE_LEFT + el.left, 
				"width": el.width, 
				"top": BASE_LEVEL + el.level * LEVEL_HEIGHT
			}).appendTo($('body'));
		}
		el.element.data('object', el);
	}
	for(var i in el.children) {
		place_nodes(el.children[i], i);
	}
}

function position_nodes(el, name, callback) {
	if (name) {
		el.element.animate({
			"left": BASE_LEFT + el.left, 
			"width": el.width, 
			"top": BASE_LEVEL + el.level * LEVEL_HEIGHT
		}, {"complete": callback});
	}
	for(var i in el.children) {
		position_nodes(el.children[i], i, callback);
	}
}

// function expand_all(el) {
// 	el.hidden = false;
// 	for(var i in el.children) {
// 		expand_all(el.children[i]);
// 	}
// }

function clear_paper(el) {
	var line;
	while (line = el.lines.pop()) {
		line.remove();
	}

	for (var i in el.children) {
		clear_paper(el.children[i]);
	}
}

function redraw(formatted_data, options) {
	formatted_data.refresh_visibility();

	old_width = formatted_data.width;

	var changed = (old_width != formatted_data.calculate_size().width);
	changed = formatted_data.calculate_positions() || changed;

	if (options && 'follow' in options) {
		if (changed && follow_on_move.is(':checked')) {
			var node_position = options['follow'].element.offset();

			node_position.left += (options['follow'].width/2) - 100; // 200 is the width of the inner-node

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
	}
	

	if (changed) {

		for (var i in formatted_data.children) {
			clear_paper(formatted_data.children[i]);
		}

		var node_callbacks = 0;
		
		position_nodes(formatted_data, false, function() {
			node_callbacks += 1;
			if (node_callbacks == node_count - 1) {

				for (var i in formatted_data.children) {
						formatted_data.children[i].draw_lines();
				}
				

				if (options && 'callback' in options) {
					options['callback']();
				}
			}
		});
	} else {
		if (options && 'follow' in options) {
			clear_paper(options['follow']);
			options['follow'].draw_lines();
		}
	}
}

var follow_on_move;

$(function() {
	follow_on_move = $('#follow_on_move');
	$.get('layout.txt', function(data) {
		var formatted_data = load_indented_data(data);

		formatted_data.calculate_size();

		formatted_data.left = 0;
		formatted_data.calculate_positions();

		place_nodes(formatted_data);
		
		for (var i in formatted_data.children) {
			formatted_data.children[i].draw_lines();
		}

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

			redraw(formatted_data, {follow: node});
		});
	});
})
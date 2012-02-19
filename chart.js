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

	var obj = {'children': {}}

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
			obj.children[line[1]] = {'name': line[1], 'children': [], 'left': 0, 'width': 0, 'hidden': false, 'lines': []};

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

function draw_lines(el) {
	var inner_node = el.element.find('.inner-node');
	var start_position = inner_node.offset();
	start_position.left += (inner_node.width()/2);
	start_position.top += inner_node.height();

	var line;
	while (line = el.lines.pop()) {
		line.remove();
	}

	for(var i in el.children) {
		if (el.children[i].element.is(':visible')) {
			inner_node = el.children[i].element.find('.inner-node');
			var end_position = inner_node.offset();
			end_position.left += inner_node.width()/2;
			draw_line(paper, el, start_position, end_position);
		}
		draw_lines(el.children[i]);
	}
}

function calculate_width(el, caption) {
	el.width = 0;

	if (!(el.hidden)) {
		for(var i in el.children) {
			el.width += calculate_width(el.children[i], i);
		}
	}

	if (el.width < 210) {
		el.width = 210;
	}

	return el.width;
}

// Returns true if the positions have changed
function calculate_positions(el, level) {
	if (!level) {
		level = 0;
	}

	var position_changed = false;

	var left = el.left;

	for(var i in el.children) {
		if (el.children[i].left != left) {
			el.children[i].left = left;
			position_changed = true;
		}

		el.children[i].level = level;
		left += el.children[i].width;
		position_changed = calculate_positions(el.children[i], level + 1) || position_changed;
	}

	return position_changed;
}

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
		el.element.data('node', el);
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

function refresh_visibility(node, hidden_in_tree) {
	if ('element' in node) {
		if (hidden_in_tree) {
			node.element.hide();
		} else {
			node.element.show();
		}

		if (node.hidden) {
			node.element.find('.expand').text('v');
			hidden_in_tree = true;
		} else {
			node.element.find('.expand').text('^');
		}
	}

	for (var i in node.children) {
		refresh_visibility(node.children[i], hidden_in_tree);
	}
}

function expand_all(el) {
	el.hidden = false;
	for(var i in el.children) {
		expand_all(el.children[i]);
	}
}

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
	refresh_visibility(formatted_data);

	old_width = formatted_data.width;

	var changed = (old_width != calculate_width(formatted_data));
	changed = calculate_positions(formatted_data) || changed;

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
						draw_lines(formatted_data.children[i]);
				}
				

				if (options && 'callback' in options) {
					options['callback']();
				}
			}
		});
	} else {
		if (options && 'follow' in options) {
			clear_paper(options['follow']);
			draw_lines(options['follow']);
		}
	}
}

var follow_on_move;

$(function() {
	follow_on_move = $('#follow_on_move');
	$.get('layout.txt', function(data) {
		var formatted_data = load_indented_data(data);

		calculate_width(formatted_data);

		formatted_data.left = 0;
		calculate_positions(formatted_data);

		place_nodes(formatted_data);
		
		for (var i in formatted_data.children) {
			draw_lines(formatted_data.children[i]);
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

		$('#expand_all').click(function() {
			expand_all(formatted_data);
			redraw(formatted_data);
			return false;
		});

		$('.node .inner-node .expand').click(function() {
			var node_el = $(this).closest('.node');
			var node = node_el.data('node');
			node.hidden = !node.hidden;

			redraw(formatted_data, {follow: node});
		});
	});
})
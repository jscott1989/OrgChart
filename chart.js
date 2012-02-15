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

	var obj = {}

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
			obj[line[1]] = {}

			// Assume we can move in by one level and continue looking
			line_count = load_indented_lines(obj[line[1]], level + 1, lines, line_count + 1)
		} else {
			return line_count;
		}
	}
	return line_count;
}

function format_as_list(formatted_data) {
	var ul = $('<ul></ul>');

	for (i in formatted_data) {
		var li = $('<li><div class="positioning"></div><span>' + i + '</span></li>');
		li.append(format_as_list(formatted_data[i]));
		ul.append(li);
	}

	return ul
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

	el['_meta']['lines'].push(c);
}

var paper = Raphael(0, 0, 10000, 10000);

function draw_lines(el) {
	var inner_node = el['_meta']['node'].find('.inner-node');
	var start_position = inner_node.offset();
	start_position.left += (inner_node.width()/2);
	start_position.top += inner_node.height();

	var line;
	while (line = el['_meta']['lines'].pop()) {
		line.remove();
	}

	for(var i in el) {
		if (i != '_meta') {
			if (el[i]['_meta']['node'].is(':visible')) {
				inner_node = el[i]['_meta']['node'].find('.inner-node');
				var end_position = inner_node.offset();
				end_position.left += inner_node.width()/2;
				draw_line(paper, el, start_position, end_position);
			}
			draw_lines(el[i]);
		}
	}
}

function calculate_width(el, caption) {
	var width = 0;

	if (!('_meta' in el) || !('hidden' in el['_meta']) || !(el['_meta']['hidden'])) {
		for(var i in el) {
			if (i != '_meta') {
				width += calculate_width(el[i], i);
			}
		}
	}

	if (width < 210) {
		width = 210;
	}
	if (!('_meta' in el)) {
		el['_meta'] = {'lines': []};
	}

	el['_meta']['width'] = width;
	return width;
}

// Returns true if the positions have changed
function calculate_positions(el, level) {
	if (!level) {
		level = 0;
	}

	var ret = false;

	var left = el['_meta']['left'];

	for(var i in el) {
		if (i != '_meta') {
			if ((!('left' in el[i]['_meta'])) || (el[i]['_meta']['left'] != left)) {
				el[i]['_meta']['left'] = left;
				ret = true;
			}
			el[i]['_meta']['level'] = level;
			left += el[i]['_meta']['width'];
			ret = calculate_positions(el[i], level + 1) || ret;
		}
	}

	return ret;
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
		var node;
		if (count(el) > 1) { 
			node = $('#nodeTemplateChildren').tmpl({"name": name}).css({"left": BASE_LEFT + el['_meta']['left'], "width": el['_meta']['width'], "top": BASE_LEVEL + el['_meta']['level'] * LEVEL_HEIGHT}).appendTo($('body'));
		} else {
			node = $('#nodeTemplate').tmpl({"name": name}).css({"left": BASE_LEFT + el['_meta']['left'], "width": el['_meta']['width'], "top": BASE_LEVEL + el['_meta']['level'] * LEVEL_HEIGHT}).appendTo($('body'));
		}
		node.data('node', el);
		el['_meta']['node'] = node;
	}
	for(var i in el) {
		if (i != '_meta') {
			place_nodes(el[i], i);
		}
	}
}

function position_nodes(el, name, callback) {
	if (name) {
		var node = el['_meta']['node'];
		node.animate({"left": BASE_LEFT + el['_meta']['left'], "width": el['_meta']['width'], "top": BASE_LEVEL + el['_meta']['level'] * LEVEL_HEIGHT}, {"complete": callback});
	}
	for(var i in el) {
		if (i != '_meta') {
			position_nodes(el[i], i, callback);
		}
	}
}

function refresh_visibility(node, hidden_in_tree) {
	if ('_meta' in node && 'node' in node['_meta']) {
		if (hidden_in_tree) {
			node['_meta']['node'].hide();
		} else {
			node['_meta']['node'].show();
		}

		if (node['_meta']['hidden']) {
			node['_meta']['node'].find('.expand').text('v');
			hidden_in_tree = true;
		} else {
			node['_meta']['node'].find('.expand').text('^');
		}
	}

	for (var i in node) {
		if (i != '_meta') {
			refresh_visibility(node[i], hidden_in_tree);
		}
	}
}

function expand_all(el) {
	if ('_meta' in el && 'hidden' in el['_meta']) {
		delete(el['_meta']['hidden']);
	}
	for(var i in el) {
		if (i != '_meta') {
			expand_all(el[i]);
		}
	}
}

function clear_paper(el) {
	var line;
	while (line = el['_meta']['lines'].pop()) {
		line.remove();
	}

	for (var i in el) {
		if (i != '_meta') {
			clear_paper(el[i]);
		}
	}
}

function redraw(formatted_data, options) {
	refresh_visibility(formatted_data);

	old_width = formatted_data['_meta']['width'];

	var changed = (old_width != calculate_width(formatted_data));
	changed = calculate_positions(formatted_data) || changed;

	if (options && 'follow' in options) {
		if (changed && follow_on_move.is(':checked')) {
			var node_position = options['follow']['_meta']['node'].offset();

			node_position.left += (options['follow']['_meta']['width']/2) - 100; // 200 is the width of the inner-node

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

		for (var i in formatted_data) {
			if (i != '_meta') {
				clear_paper(formatted_data[i]);
			}
		}

		var node_callbacks = 0;
		
		position_nodes(formatted_data, false, function() {
			node_callbacks += 1;
			if (node_callbacks == node_count - 1) {

				for (var i in formatted_data) {
					if (i != '_meta') {
						draw_lines(formatted_data[i]);
					}
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

		formatted_data['_meta']['left'] = 0;
		calculate_positions(formatted_data);

		place_nodes(formatted_data);
		
		for (var i in formatted_data) {
			if (i != '_meta') {
				draw_lines(formatted_data[i]);
			}
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
			if (node['_meta']['hidden']) {
				// Show children
				delete(node['_meta']['hidden']);
			} else {
				// Hide children
				node['_meta']['hidden'] = true;
			}

			redraw(formatted_data, {follow: node});
		});
	});
})
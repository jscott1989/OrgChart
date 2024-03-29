/**
 * Copyright (C) 2012 Jonathan Scott (http://jscott.me)
 * Used under license to Sunderland City Council Adult Services
 */
var nodes = {};

function Node(id, name, link, urls, parent, is_shortcut) {
	this.id = base64_encode(id).replace(/=/g, '');
	this.name = name;
	this.is_shortcut = is_shortcut;
	this.link = link;
	this.urls = urls;
	this.chart = parent.chart || parent;
	this.parent = parent;
	this.children = {};
	this.left = 0;
	this.width = 0;
	this.hidden = false;
	this.lines = [];

	nodes[id] = this;
}

Node.prototype.refresh_visibility = function(hidden_in_tree) {
	if (hidden_in_tree) {
		this.element.hide();
	} else {
		this.element.show();
	}

	if (this.hidden) {
		this.element.find('.expand').removeClass('expanded');
		hidden_in_tree = true;
	} else {
		this.element.find('.expand').addClass('expanded');
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
	this.element = $('#nodeTemplate').tmpl({"name": this.name, "children": this.children, "link": this.link, "urls": this.urls}).css({
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

// Ensure that this node is visible by expanding the parents down to this
Node.prototype.expandTo = function() {
	var node = this.parent;
	while (!node.is_chart) {
		node.hidden = false;
		node = node.parent;
	}
	node.redraw();
}

function Chart(id, name) {
	this.id = base64_encode(id).replace(/=/g, '');
	this.children = {};
	this.node_count = 0;
	this.name = name;
	this.is_chart = true;
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
		if (changed) {
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

function split_first(haystack, needle) {
	for (var i = 0, j = haystack.length; i < j; i++) {
		if (haystack.substring(i,i+1) === needle) { return [haystack.substring(0, i), haystack.substring(i+1)]; }
	}
	return [haystack];
}

function count_leading_tabs(line) {
	var tabs = 0;
	while (line.substring(0,1) == '\t') {
		tabs += 1
		line = line.substring(1)
	}

	var is_shortcut = false;

	if (line.substr(0,1) == '!') {
		is_shortcut = true;
		line = line.substr(1);
	}

	line = line.split("->")
	var line_id = 0;
	if (line.length == 1) {
		line.push(undefined);
	} else {
		line_id = 1;
	}

	var urls = split_first(line[line_id], ':');
	line[line_id] = urls[0];

	if (urls.length > 1) {
		urls = urls[1].split(',');
	} else {
		urls = [];
	}
	var id = line[0];
	var name = line[0];

	var ids = split_first(line[0], '&');
	if (ids.length > 1) {
		id = ids[0];
		name = ids[1];
	}

	return [tabs, id, name, line[1], urls, is_shortcut];
}

function load_indented_data(data) {
	var lines = data.split('\n');

	var obj = new Chart('', '')

	load_indented_lines(obj, 0, lines, 0, true);

	return obj.children;
}

function load_indented_lines(obj, level, lines, line_count, is_chart) {
	while (line_count < lines.length) {
		var line = count_leading_tabs(lines[line_count]);

		if (lines[line_count] == '' || line[1].substr(0,1) == '#') {
			line_count++;
			continue;
		}

		if (line[0] == level) {
			if (is_chart) {
				obj.children[line[1]] = new Chart(line[1], line[2])
			} else {
				obj.children[line[1]] = new Node(line[1], line[2], line[3], line[4], obj, line[5])
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

var paper;

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
	if ('expandTo' in node) {
		node.expandTo();
	}
	
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

function base64_encode (data) {
    // http://kevin.vanzonneveld.net
    // +   original by: Tyler Akins (http://rumkin.com)
    // +   improved by: Bayron Guevara
    // +   improved by: Thunder.m
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: Pellentesque Malesuada
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   improved by: Rafał Kukawski (http://kukawski.pl)
    // *     example 1: base64_encode('Kevin van Zonneveld');
    // *     returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
    // mozilla has this native
    // - but breaks in 2.0.0.12!
    //if (typeof this.window['atob'] == 'function') {
    //    return atob(data);
    //}
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        enc = "",
        tmp_arr = [];

    if (!data) {
        return data;
    }

    do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1 << 16 | o2 << 8 | o3;

        h1 = bits >> 18 & 0x3f;
        h2 = bits >> 12 & 0x3f;
        h3 = bits >> 6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);

    enc = tmp_arr.join('');
    
    var r = data.length % 3;
    
    return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);

}

var BASE_LEVEL = 80;
var LEVEL_HEIGHT = 80;
var BASE_LEFT = 200;
var NODE_WIDTH = 210;

var CHART_SPACING = 900;

// function expand_all(el) {
// 	el.hidden = false;
// 	for(var i in el.children) {
// 		expand_all(el.children[i]);
// 	}
// }

var charts;


$(function() {
	$.get('layout.txt', function(data) {
		charts = load_indented_data(data);
		var left = 0;
		var height = 0;
		for (var i in charts) {
			var chart_li = $('#shortcutTemplate').tmpl({"name": charts[i].name, "type": "chart", "id": charts[i].id});

			chart_li.data('object', charts[i])
			$('#shortcuts').append(chart_li);

			var c_size = charts[i].calculate_size();

			charts[i].left = left;
			charts[i].calculate_positions();

			left += c_size.width + CHART_SPACING;
			if (c_size.height > height) {
				height = c_size.height;
			}

			charts[i].place();
		}

		$('#map').css({"width": left, "height": height + 500});

		paper = Raphael(0, 0, left, height + 500);

		for (var i in charts) {
			charts[i].draw_lines();
		}

		for (var i in nodes) {
			if (nodes[i].is_shortcut) {
				var shortcut_li = $('#shortcutTemplate').tmpl({"name": nodes[i].name, "type": "node", "id": nodes[i].id});
				shortcut_li.data('object', nodes[i])
				shortcut_li.insertAfter($('#shortcut_' + nodes[i].chart.id));
			}
		}

		$('#shortcuts li').click(function() {
			scroll_to($(this).data('object'));
		})

		$('#menu .collapse').click(function() {
			var menu = $(this).parent();

			menu.toggleClass('collapsed');
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

		$('.url').click(function() {
			window.open($(this).data('target'));
		});

		$('#breakout').click(function() {
			top.location = self.location;
		})


		if (top.location != self.location) {
			$('#breakout').show();
		}
	});
})
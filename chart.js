function count_leading_tabs(line) {
	tabs = 0;
	while (line.substring(0,1) == '\t') {
		tabs += 1
		line = line.substring(1)
	}
	return [tabs, line];
}

function load_indented_data(data) {
	lines = data.split('\n');

	obj = {}

	load_indented_lines(obj, 0, lines, 0);
	return obj;
}

function load_indented_lines(obj, level, lines, line_count) {
	while (line_count < lines.length) {
		line = count_leading_tabs(lines[line_count]);

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
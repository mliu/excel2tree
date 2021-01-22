var tree, diagonal, svg, root, line, treeData, numNodes, csvData;
var i = 0,
    duration = 750,
    treeHeight = 3,
    circleRadius = 15;

document.addEventListener("DOMContentLoaded", function() {
    var oFileIn = document.getElementById('fileInput');
    if (oFileIn.addEventListener) {
        oFileIn.addEventListener('change', filePicked, false);
    }
    var render = document.getElementById('submit');
    if (render.addEventListener) {
        render.addEventListener('click', () => { generateTree(csvData) }, false);
    }
});

function filePicked(oEvent) {
    // Get The File From The Input
    var oFile = oEvent.target.files[0];
    var sFilename = oFile.name;
    // Create A File Reader HTML5
    var reader = new FileReader();

    // Ready The Event For When A File Gets Selected
    reader.onload = function(e) {
        // Parse CSV string
        csvData = Papa.parse(e.target.result);
        generateTree(csvData);
    };

    // Tell JS To Start Reading The File.. You could delay this if desired
    reader.readAsBinaryString(oFile);
}

function insertTree(root, depth, rowData) {
    if (depth >= treeHeight) {
        return;
    }

    var currentName = rowData[depth];
    var node = root.children.find(el => el.name == currentName);
    if (node) {
        node.childrenCount++;
        insertTree(node, depth + 1, rowData);
    } else {
        node = { name: currentName, parent: root.name, children: [], childrenCount: 0 };
        root.children.push(node);
        insertTree(node, depth + 1, rowData);
    }
}

function extractRowData(row) {
    return row.slice(1, treeHeight + 1);
}

function generateTree(csvData) {
    treeHeight = document.getElementById('treeHeight').value;
    numNodes = csvData.data.length;
    treeData = [{
        "name": "Root",
        "parent": "null",
        "children": [],
        "childrenCount": numNodes,
    }];

    csvData.data.forEach((row, idx) => {
        if (idx === 0 || row.length == 1) {
            return;
        }

        // Insert the node into the tree
        var rowData = extractRowData(row);
        insertTree(treeData[0], 0, rowData);
    });

    // Cleanup previous tree (if any)
    var output = document.getElementById("output");
    output.innerHTML = '';

    var margin = { top: 50, right: 120, bottom: 20, left: 120 },
        width = getNodeXOffset(treeHeight) + margin.right + margin.left,
        height = numNodes * (circleRadius * 2) - margin.top - margin.bottom;

    tree = d3.layout.tree()
        .size([height, width]);

    diagonal = d3.svg.diagonal()
        .projection(function(d) { return [d.y, d.x]; });

    line = d3.svg.line()
        .x(function(d) { return d.lx; })
        .y(function(d) { return d.ly; });

    svg = d3.select("#output").append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    root = treeData[0];
    root.x0 = height / 2;
    root.y0 = 0;

    update(root);

    d3.select(self.frameElement).style("height", "500px");
}

function getNodeXOffset(treeHeight) {
    return treeHeight * 180 + (treeHeight * treeHeight * 30);
}

function update(source) {
    var useStraightLine = document.getElementById("straightLine").checked;
    // Compute the new tree layout.
    var nodes = tree.nodes(root).reverse(),
        links = tree.links(nodes);

    // Normalize for fixed-depth.
    nodes.forEach(function(d) { d.y = getNodeXOffset(d.depth); });

    // Update the nodes…
    var node = svg.selectAll("g.node")
        .data(nodes, function(d) { return d.id || (d.id = ++i); });

    // Enter any new links at the parent's previous position.
    if (useStraightLine) {
        // Update the links…
        var link = svg.selectAll("line")
            .data(links, function(d) { return d.target.id; });

        link.enter().append("line")
            .attr("class", "link")
            .attr("x1", function(d) { return d.source.y0; })
            .attr("y1", function(d) { return d.source.x0; })
            .attr("x2", function(d) { return d.target.y0; })
            .attr("y2", function(d) { return d.target.x0; });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("x1", function(d) {
                return d.source.y;
            })
            .attr("y1", function(d) {
                return d.source.x;
            })
            .attr("x2", function(d) {
                return d.target.y;
            })
            .attr("y2", function(d) {
                return d.target.x;
            });

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("x1", function(d) {
                return d.source.y;
            })
            .attr("y1", function(d) {
                return d.source.x;
            })
            .attr("x2", function(d) {
                return d.target.y;
            })
            .attr("y2", function(d) {
                return d.target.x;
            })
            .remove();
    } else {
        // Update the links…
        var link = svg.selectAll("path.link")
            .data(links, function(d) { return d.target.id; });

        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d",
                function(d) {
                    var o = { x: source.x0, y: source.y0 };
                    return diagonal({ source: o, target: o });
                });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = { x: source.x, y: source.y };
                return diagonal({ source: o, target: o });
            })
            .remove();
    }

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
        .on("click", click);

    var circleFillFunc = function(d) {
        if (d._children) {
            return "hsl(190, 35%, 50%)";
        } else {
            alphaValue = Math.max(Math.round(100 - d.childrenCount / numNodes * 200), 45);
            return "hsl(190, 35%, " + alphaValue + "%)";
        }
    };

    nodeEnter.append("circle")
        .attr("r", circleRadius)
        .style("fill", circleFillFunc);

    nodeEnter.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .text(function(d) {
            return Math.round(d.childrenCount / numNodes * 100) + "%"
        })
        .style("fill-opacity", 1e-6);

    nodeEnter.append("text")
        .attr("x", function(d) { return d.children || d._children ? -circleRadius - 5 : circleRadius + 5; })
        .attr("dy", ".35em")
        .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
        .text(function(d) { return d.name; })
        .style("fill-opacity", 1e-6);

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

    nodeUpdate.select("circle")
        .attr("r", circleRadius)
        .style("fill", circleFillFunc);

    nodeUpdate.selectAll("text")
        .style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
        .remove();

    nodeExit.select("circle")
        .attr("r", circleRadius);

    nodeExit.selectAll("text")
        .style("fill-opacity", 1e-6);

    // Stash the old positions for transition.
    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

// Toggle children on click.
function click(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
    update(d);
}
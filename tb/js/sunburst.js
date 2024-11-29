// Set dimensions
const sunburstWidth = document.getElementById("sunburst-container").offsetWidth;
const radius = sunburstWidth / 2;

// Create SVG container
const sunburstSVG = d3.select("#sunburst-container")
    .append("svg")
    .attr("width", sunburstWidth)
    .attr("height", radius * 1.5)
    .append("g")
    .attr("transform", `translate(${radius},${radius})`);


// Tooltip for hovering
const sb_tooltip = d3.select("#sb_tooltip");

// Color scale (for regions and categories)
const color = d3.scaleOrdinal(d3.schemeCategory10);

// Create arcs
const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .innerRadius(d => d.y0)
    .outerRadius(d => d.y1);

// Load data from CSV
d3.csv("data/preprocessed_data_tb.csv").then(data => {

    // Convert CSV to hierarchical JSON
    function buildHierarchy(data) {
        const root = { name: "Root", children: [] };

        const regions = d3.group(data, d => d.g_whoregion);
        for (const [region, countries] of regions) {
            const regionNode = { name: region, children: [] };
            const countryGroups = d3.group(countries, d => d.county);

            for (const [country, records] of countryGroups) {
                const countryNode = { name: country, children: [] };
                records.forEach(record => {
                    countryNode.children.push({
                        name: record.iso2,
                        value: +record.e_inc_100k,
                    });
                });
                regionNode.children.push(countryNode);
            }
            root.children.push(regionNode);
        }
        return root;
    }

    const hierarchyData = buildHierarchy(data);

    const root = d3.hierarchy(hierarchyData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

    // Partition layout for sunburst chart
    const partition = d3.partition().size([2 * Math.PI, radius]);

    partition(root);

    // Add paths for each segment
    const path = sunburstSVG.selectAll("path")
        .data(root.descendants())
        .join("path")
        .attr("d", arc)
        .attr("fill", d => color(d.depth))  // Color by depth (region, country, etc.)
        .attr("stroke", "#fff")
        .on("mouseover", function (event, d) {
            d3.select(this).attr("opacity", 0.7);

            // Show tooltip
            sb_tooltip.style("display", "inline-block")
                .html(`<strong>${d.data.name}</strong><br>Value: ${d.value}`);
        })
        .on("mousemove", function (event) {
            sb_tooltip.style("top", (event.pageY + 5) + "px")
                .style("left", (event.pageX + 5) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 1);

            // Hide tooltip
            sb_tooltip.style("display", "none");
        })
        .on("click", function (event, d) {
            // Zoom into the clicked segment
            zoom(d);
        })
        .append("title")
        .text(d => `${d.data.name}: ${d.value}`);

    // Add labels for each segment (display on higher-level nodes and avoid overlap)
    sunburstSVG.selectAll("text")
        .data(root.descendants().filter(d => d.depth && (d.x1 - d.x0) > 0.03))
        .join("text")
        .attr("transform", d => {
            const angle = (d.x0 + d.x1) / 2 * 180 / Math.PI - 90;
            const rotate = angle > 90 ? angle + 180 : angle;
            return `translate(${arc.centroid(d)}) rotate(${rotate})`;
        })
        .text(d => d.data.name)
        .attr("fill", "white")
        .style("font-size", "12px")
        .style("pointer-events", "none");

    // Zoom function to display a specific category
    function zoom(d) {
        // Create a new partition for the clicked segment and update arcs
        const newRoot = d;

        partition(newRoot);

        sunburstSVG.selectAll("path")
            .data(newRoot.descendants())
            .join("path")
            .transition().duration(500)
            .attr("d", arc)
            .attr("fill", d => color(d.depth));

        sunburstSVG.selectAll("text")
            .data(newRoot.descendants().filter(d => d.depth && (d.x1 - d.x0) > 0.03))
            .join("text")
            .transition().duration(500)
            .attr("transform", d => {
                const angle = (d.x0 + d.x1) / 2 * 180 / Math.PI - 90;
                const rotate = angle > 90 ? angle + 180 : angle;
                return `translate(${arc.centroid(d)}) rotate(${rotate})`;
            })
            .text(d => d.data.name)
            .attr("fill", "white")
            .style("font-size", "12px")
            .style("pointer-events", "none");
    }
});

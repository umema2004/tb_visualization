// Setting up the visualization
const margins = { top: 20, right: 30, bottom: 60, left: 50 };
let timelineWidth = document.getElementById("timeline-container").offsetWidth;
const width = timelineWidth - margins.left - margins.right;
const height = 400 - margins.top - margins.bottom;

// Create SVG for timeline visualization
const timelineSVG = d3.select("#timeline-container")
    .append("svg")
    .attr("width", width + margins.left + margins.right)
    .attr("height", height + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

const g = timelineSVG.append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

// Scales
const xScale = d3.scaleLinear().range([0, width]);
const yScale = d3.scaleLinear().range([height, 0]);
const sizeScale = d3.scaleLinear().range([5, 20]);
const color_Scale = d3.scaleOrdinal()
    .domain(["AMR", "EUR", "EMR", "AFR", "SEA", "WPR"])
    .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"]);

// Axis
const xAxis = g.append("g").attr("transform", `translate(0,${height})`);
const yAxis = g.append("g");

// Tooltip
const tooltip = d3.select("#timeline_tooltip");

// Animation control
let yearIndex = 0;
let isPaused = false;

d3.csv("data/preprocessed_data_tb.csv").then(data => {
    data.forEach(d => {
        d.year = +d.year;
        d.incidence = +d.e_inc_100k;
        d.mortality = +d.e_mort_100k;
        d.population = +d.e_pop_num;
    });

    const years = [...new Set(data.map(d => d.year))];
    const minYear = d3.min(years);
    const maxYear = d3.max(years);

    // Populate the year dropdown dynamically
    const yearSelect = d3.select("#year-select");
    yearSelect.selectAll("option")
        .data(years)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);

    yearSelect.property("value", minYear);

    // Set axis domains
    xScale.domain([0, 500]);
    yScale.domain([0, d3.max(data, d => d.mortality)]);
    sizeScale.domain([0, d3.max(data, d => d.population)]);

    // Render axis
    xAxis.call(d3.axisBottom(xScale));
    yAxis.call(d3.axisLeft(yScale));

    let selectedRegion = "All"; // default region filter

    // Update function for the visualization
    const update = year => {
        let filteredData = data.filter(d => d.year === year && d.mortality >= 10);
        if (selectedRegion !== "All") {
            filteredData = filteredData.filter(d => d.g_whoregion === selectedRegion);
        }

        const circles = g.selectAll("circle").data(filteredData, d => `${d.g_whoregion}-${d.country}`);

        circles.enter()
            .append("circle")
            .attr("cx", d => xScale(d.incidence))
            .attr("cy", d => yScale(d.mortality))
            .attr("r", d => sizeScale(d.population))
            .attr("fill", d => color_Scale(d.g_whoregion))
            .attr("opacity", 0.05)
            .on("mouseover", function (event, d) {
                tooltip.style("opacity", 1)
                    .html(`
                        <b>Region:</b> ${d.g_whoregion}<br>
                        <b>Country:</b> ${d.country}<br>
                        <b>Year:</b> ${d.year}<br>
                        <b>Incidence:</b> ${d.incidence}<br>
                        <b>Mortality:</b> ${d.mortality}<br>
                        <b>Population:</b> ${d.population.toLocaleString()}
                    `)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 28}px`);
                d3.select(this).attr("stroke", "black").attr("stroke-width", 2);
            })
            .on("mouseout", function () {
                tooltip.style("opacity", 0);
                d3.select(this).attr("stroke", "none");
            })
            .merge(circles)
            .transition()
            .duration(500)
            .attr("cx", d => xScale(d.incidence))
            .attr("cy", d => yScale(d.mortality))
            .attr("r", d => sizeScale(d.population))
            .attr("fill", d => color_Scale(d.g_whoregion));

        circles.exit().remove();
    };

  
    // Year change interval for animation
    d3.interval(() => {
        if (isPaused) return; 
        yearIndex = (yearIndex + 1) % years.length; 
        const year = years[yearIndex]; 
        d3.select("#year-display").text(year);  
        update(year);  
    }, 1000);

// Initial update for the min year
update(minYear);
});
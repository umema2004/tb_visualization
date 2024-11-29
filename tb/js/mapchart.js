// Setting the dimensions dynamically for the map chart
const mapWidth = document.getElementById("map-container").offsetWidth;
const mapHeight = 400; // Fixed height for consistency
const map_margins = { top: 20, right: 30, bottom: 40, left: 50 };

// Create SVG for the map chart
const mapSVG = d3.select("#map-container")
    .append("svg")
    .attr("width", mapWidth)
    .attr("height", mapHeight)
    .append("g")
    .attr("transform", `translate(${map_margins.left},${map_margins.top})`);


// Set up the map projection and path
const projection = d3.geoMercator().scale(150).translate([mapWidth / 2, mapHeight / 1.5]);
const path = d3.geoPath().projection(projection);


// Set up color scale
const colorScale = d3.scaleSequential(d3.interpolateReds)
    .domain([0, 500]);  // Adjust domain based on max `e_inc_100k`

// Add Legend
const legendHeight = 200;
const legendWidth = 20;

const legend = mapSVG.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${mapWidth - 50}, 50)`); // Move legend to the right side

const legendScale = d3.scaleLinear()
    .domain(colorScale.domain())
    .range([legendHeight, 0]);

const legendAxis = d3.axisRight(legendScale)
    .ticks(5);

legend.selectAll("rect")
    .data(d3.range(0, 500, 10)) // Change range and step if needed
    .enter().append("rect")
    .attr("y", d => legendScale(d))
    .attr("width", legendWidth)
    .attr("height", 10)
    .attr("fill", d => colorScale(d));

legend.append("g")
    .attr("transform", `translate(${legendWidth}, 0)`)
    .call(legendAxis);


// Load GeoJSON and CSV data
Promise.all([
    d3.json("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"),
    d3.csv("data/preprocessed_data_tb.csv")
]).then(([geoData, csvData]) => {
    
    // Map CSV data with GeoJSON
    const dataMap = new Map(csvData.map(d => [d.iso3, d]));

    // Create a group element for all map elements (to apply zoom behavior)
    const mapGroup = mapSVG.append("g");

    // Draw map paths within the group
    mapGroup.selectAll("path")
        .data(geoData.features)
        .enter().append("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", d => {
            const iso3 = d.properties.ISO_A3;
            const value = dataMap.get(iso3) ? +dataMap.get(iso3).e_inc_100k : null;
            return value ? colorScale(value) : "#eee";
        })
        .on("mouseover", function (event, d) {
            const iso3 = d.properties.ISO_A3;
            const data = dataMap.get(iso3);

            // Display tooltip
            const tooltipHtml = `
                <strong>${d.properties.ADMIN}</strong><br>
                Estimated Population: ${data ? data.e_pop_num : "N/A"}<br>
            
                TB Incidence Number: ${data ? data.e_inc_num : "N/A"}<br>
                TB-HIV Percentage: ${data ? data.e_tbhiv_prct : "N/A"}%<br>
                Mortality Excluding TB-HIV (per 100k): ${data ? data.e_mort_exc_tbhiv_100k : "N/A"}<br>
            `;

            d3.select("body").append("div").attr("class", "map_tooltip")
                .html(tooltipHtml)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
            
            d3.select(this).attr("fill", "orange");
        })
        .on("mousemove", function(event) {
            d3.select(".map_tooltip")
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("fill", d => {
                const iso3 = d.properties.ISO_A3;
                const value = dataMap.get(iso3) ? +dataMap.get(iso3).e_inc_100k : null;
                return value ? colorScale(value) : "#eee";
            });
            d3.select(".map_tooltip").remove();
        })
        .on("click", function(event, d) {
            const iso3 = d.properties.ISO_A3;
            const data = dataMap.get(iso3);

            // Highlight clicked country
            mapGroup.selectAll("path").classed("highlight", false);  // Reset previous highlights
            d3.select(this).classed("highlight", true);  // Highlight the clicked country

            // Display the info panel
            const infoPanel = document.getElementById("info-panel");
            infoPanel.style.display = "block";
            infoPanel.innerHTML = `
                <strong>${d.properties.ADMIN}</strong><br>
                Estimated Population: ${data ? data.e_pop_num : "N/A"}<br>
                
                TB Incidence Number: ${data ? data.e_inc_num : "N/A"}<br>
                TB-HIV Percentage: ${data ? data.e_tbhiv_prct : "N/A"}%<br>
                Mortality Excluding TB-HIV (per 100k): ${data ? data.e_mort_exc_tbhiv_100k : "N/A"}<br>
            `;
            infoPanel.style.left = `${event.pageX + 10}px`;
            infoPanel.style.top = `${event.pageY - 100}px`;
        });

    // Add zoom and pan functionality
    const zoom = d3.zoom()
        .scaleExtent([1, 8])  // Min and max zoom levels
        .translateExtent([[0, 0], [width, height]])  // Limits to the SVG area
        .on("zoom", (event) => {
            mapGroup.attr("transform", event.transform);
            mapGroup.selectAll("path").attr("d", path);
        });

    mapSVG.call(zoom);  // Apply the zoom behavior to the SVG container

}).catch(error => console.error(error));
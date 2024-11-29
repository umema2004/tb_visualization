const fdContainer = document.getElementById("fd-container");
const fdWidth = fdContainer.offsetWidth;
const fdHeight = fdContainer.offsetHeight;

const fdSVG = d3.select("#fd-container")
    .append("svg")
    .attr("width", fdWidth)
    .attr("height", fdHeight)
    .append("g")
    .call(d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", zoomed))
    .append("g");



// Force-directed visualization logic

const fd_tooltip = d3.select("#fd_tooltip");

function zoomed(event) {
    fdSVG.attr("transform", event.transform);
}

d3.csv("data/preprocessed_data_tb.csv").then(function(data) {
    const uniqueYears = [...new Set(data.map(d => d.year))].sort();
    d3.select("#yearSelect")
        .selectAll("option")
        .data(uniqueYears)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    const uniqueRegions = [...new Set(data.map(d => d.g_whoregion))];
    d3.select("#regionSelect")
        .selectAll("option")
        .data(uniqueRegions)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    function renderGraph(selectedYear, selectedRegion) {
        fdSVG.selectAll("*").remove();

        let filteredData = data;
        if (selectedYear) {
            filteredData = filteredData.filter(row => row.year == selectedYear);
        }
        if (selectedRegion) {
            filteredData = filteredData.filter(row => row.g_whoregion === selectedRegion);
        }

        const nodes = {};
        filteredData.forEach(row => {
            if (!nodes[row.country]) {
                nodes[row.country] = {
                    id: row.country,
                    region: row.g_whoregion,
                    incidence: +row.e_inc_num,
                    incidence_rate: +row.e_inc_100k,
                    population: +row.e_pop_num,
                    mortality: +row.e_mort_num,
                    mortality_rate: +row.e_mort_100k,
                    tbhiv_mortality: +row.e_mort_tbhiv_num,
                    iso2: row.iso2,
                    iso3: row.iso3
                };
            }
        });

        const links = [];
        const countries = Object.keys(nodes);
        countries.forEach((countryA, i) => {
            countries.slice(i + 1).forEach(countryB => {
                if (nodes[countryA].region === nodes[countryB].region) {
                    links.push({
                        source: countryA,
                        target: countryB,
                        value: 1
                    });
                }
            });
        });

        const nodesArray = Object.values(nodes);

        const nodeScale = d3.scaleLinear()
            .domain([d3.min(nodesArray, d => d.population), d3.max(nodesArray, d => d.population)])
            .range([3, 20]);

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        const simulation = d3.forceSimulation(nodesArray)
            .force("link", d3.forceLink(links).id(d => d.id).distance(50))
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(fdWidth / 2, fdHeight / 2))
            .on("tick", ticked);

        const link = fdSVG.append("g")
            .selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .attr("stroke-width", 0.5);

        const node = fdSVG.append("g")
            .selectAll("circle")
            .data(nodesArray)
            .enter()
            .append("circle")
            .attr("r", d => nodeScale(d.population))
            .attr("fill", d => colorScale(d.region))
            .call(drag(simulation))
            .on("mouseover", showTooltip)
            .on("mouseout", hideTooltip)
            .on("click", expandNode);

        function ticked() {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        }

        function showTooltip(event, d) {
            fd_tooltip.style("display", "block")
                .html(`
                    <h3>${d.id} (${d.iso2}/${d.iso3})</h3>
                    <div class="metric"><strong>Region:</strong> ${d.region}</div>
                    <div class="metric"><strong>Population:</strong> ${d.population.toLocaleString()}</div>
                    <hr>
                    <div class="metric"><strong>Total Incidence:</strong> ${d.incidence.toLocaleString()}</div>
                    <div class="metric"><strong>Incidence Rate:</strong> ${d.incidence_rate.toFixed(2)} per 100k</div>
                    <hr>
                    <div class="metric"><strong>Total Mortality:</strong> ${d.mortality.toLocaleString()}</div>
                    <div class="metric"><strong>Mortality Rate:</strong> ${d.mortality_rate.toFixed(2)} per 100k</div>
                    <div class="metric"><strong>TB-HIV Mortality:</strong> ${d.tbhiv_mortality.toLocaleString()}</div>
                `)
                .style("left", `${Math.min(event.pageX + 10, fdWidth - 150)}px`) 
                .style("top", `${Math.min(event.pageY + 10, fdHeight - 100)}px`);
        }

        function hideTooltip() {
            fd_tooltip.style("display", "none");
        }

        function expandNode(event, d) {
            node.transition()
                .attr("r", originalNode => 
                    originalNode === d 
                    ? nodeScale(d.population) * 1.5 
                    : nodeScale(originalNode.population)
                )
                .attr("fill", originalNode => 
                    originalNode === d 
                    ? "orange" 
                    : colorScale(originalNode.region)
                );
        }

        function drag(simulation) {
            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }

            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }

            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }
    }

    d3.select("#yearSelect").on("change", function() {
        renderGraph(this.value, d3.select("#regionSelect").property("value"));
    });

    d3.select("#regionSelect").on("change", function() {
        renderGraph(d3.select("#yearSelect").property("value"), this.value);
    });

    d3.select("#resetButton").on("click", function() {
        renderGraph(null, null);
    });

    renderGraph(null, null);
});

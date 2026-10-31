const margin = { top: 15, right: 20, bottom: 40, left: 50 };
const width = 450 - margin.left - margin.right;
const height = 230 - margin.top - margin.bottom;

let rawData = [];      // National data
let rawStateData = []; // State data

let selectedYear = "All";
let selectedRoadUser = "All";
let selectedRemoteness = "All";

let svgTrend, xTrend, yTrend, xAxisTrend, yAxisTrend, linePath;
let svgRU, xRU, yRU, xAxisRU, yAxisRU;
let svgAge, xAge, yAge, xAxisAge, yAxisAge;
let svgFatalities, xFatalities, yFatalities, xAxisFatalities, yAxisFatalities;
let svgBedDays, xBedDays, yBedDays, xAxisBedDays, yAxisBedDays;

let svgStateHosp, xStateHosp, yStateHosp, xAxisStateHosp, yAxisStateHosp;
let svgStateAios, xStateAios, yStateAios, xAxisStateAios, yAxisStateAios;

const tooltip = d3.select("#tooltip");

function init() {
    setupNavigation();
    setupCharts();

    Promise.all([
        d3.csv("assets/data/national_master.csv"),
        d3.csv("assets/data/d3state_hospitalisation_ALOS.csv")
    ]).then(([national, state]) => {
        
        national.forEach(d => {
            d.Year = d['Calendar year'] || d.Year;
            d.RoadUser = d['Road user'] || d.RoadUser || "Unknown";
            d.AgeGroup = d['Age group'] || d.AgeGroup || "Unknown";
            
            let rawRemote = d['ABS remoteness area'] || d.Remoteness;
            if (!rawRemote || rawRemote.trim() === "" || rawRemote.toLowerCase() === "missing" || rawRemote === "?") {
                d.Remoteness = "Unknown";
            } else {
                d.Remoteness = rawRemote;
            }

            d.Total = +(d['Sum(Hospitalisations)'] || d.Hospitalisations || 0);
            d.DiedCases = +(d['Sum(Died_cases)'] || d.Died_cases || 0);
            d.AvgBedDays = +(d['Avg_Bed_Days'] || d.AvgBedDays || 0);
        });
        rawData = national;

        state.forEach(d => {
            d.Year = d['calendar year'] || d.Year;
            d.State = d['state or territory'] || d.State;
            d.Total = +(d['Sum(Hospitalisations)'] || 0);
            d.AIOS = +(d['AIOS'] || 0);
        });
        rawStateData = state;

        populateDropdowns();
        updateDashboard();
    }).catch(error => console.error("Error loading CSVs:", error));

    d3.select("#year-select").on("change", function() { selectedYear = this.value; updateDashboard(); });
    d3.select("#ru-select").on("change", function() { selectedRoadUser = this.value; updateDashboard(); });
    d3.select("#remote-select").on("change", function() { selectedRemoteness = this.value; updateDashboard(); });
}

function setupNavigation() {
    d3.selectAll(".nav-tab").on("click", function() {
        d3.selectAll(".nav-tab").classed("active", false);
        d3.select(this).classed("active", true);

        const targetId = d3.select(this).attr("data-target");
        d3.selectAll(".view-section").classed("active-view", false);
        d3.select("#" + targetId).classed("active-view", true);

        
        if (targetId === "view-glossary") {
            d3.select("#data-controls").style("display", "none");
        } else if (targetId === "view-state") {
            d3.select("#data-controls").style("display", "block");
            
            d3.selectAll(".national-filter").style("display", "none");
            updateDashboard();
        } else {
            d3.select("#data-controls").style("display", "block");
            d3.selectAll(".national-filter").style("display", "block");
            updateDashboard(); 
        }
    });
}

function populateDropdowns() {
    const years = Array.from(new Set(rawData.map(d => d.Year))).sort();
    const roadUsers = Array.from(new Set(rawData.map(d => d.RoadUser))).sort();
    const remoteness = Array.from(new Set(rawData.map(d => d.Remoteness))).sort();

    const yearSelect = d3.select("#year-select");
    years.forEach(y => yearSelect.append("option").attr("value", y).text(y));
    const ruSelect = d3.select("#ru-select");
    roadUsers.forEach(r => ruSelect.append("option").attr("value", r).text(r));
    const remoteSelect = d3.select("#remote-select");
    remoteness.forEach(r => remoteSelect.append("option").attr("value", r).text(r));
}

function createSvgBase(selector, doubleWidth = false) {
    let w = doubleWidth ? (width * 2) + 20 : width;
    let svg = d3.select(selector).append("svg")
        .attr("viewBox", `0 0 ${w + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    
    let x = doubleWidth ? d3.scaleLinear().range([0, w]) : d3.scaleBand().range([0, width]).padding(0.2);
    let y = d3.scaleLinear().range([height, 0]);
    let xAxis = svg.append("g").attr("transform", `translate(0,${height})`);
    let yAxis = svg.append("g");
    return { svg, x, y, xAxis, yAxis };
}

function setupCharts() {
    let trendObj = createSvgBase("#chart-trend", true);
    svgTrend = trendObj.svg; xTrend = trendObj.x; yTrend = trendObj.y; xAxisTrend = trendObj.xAxis; yAxisTrend = trendObj.yAxis;
    linePath = svgTrend.append("path").attr("fill", "none").attr("stroke", "#2980b9").attr("stroke-width", 2.5);

    let ruObj = createSvgBase("#chart-ru");
    svgRU = ruObj.svg; xRU = ruObj.x; yRU = ruObj.y; xAxisRU = ruObj.xAxis; yAxisRU = ruObj.yAxis;

    let ageObj = createSvgBase("#chart-age");
    svgAge = ageObj.svg; xAge = ageObj.x; yAge = ageObj.y; xAxisAge = ageObj.xAxis; yAxisAge = ageObj.yAxis;

    let fatObj = createSvgBase("#chart-fatalities");
    svgFatalities = fatObj.svg; xFatalities = fatObj.x; yFatalities = fatObj.y; xAxisFatalities = fatObj.xAxis; yAxisFatalities = fatObj.yAxis;

    let bedObj = createSvgBase("#chart-beddays");
    svgBedDays = bedObj.svg; xBedDays = bedObj.x; yBedDays = bedObj.y; xAxisBedDays = bedObj.xAxis; yAxisBedDays = bedObj.yAxis;

    let stateHospObj = createSvgBase("#chart-state-hosp");
    svgStateHosp = stateHospObj.svg; xStateHosp = stateHospObj.x; yStateHosp = stateHospObj.y; xAxisStateHosp = stateHospObj.xAxis; yAxisStateHosp = stateHospObj.yAxis;

    let stateAiosObj = createSvgBase("#chart-state-aios");
    svgStateAios = stateAiosObj.svg; xStateAios = stateAiosObj.x; yStateAios = stateAiosObj.y; xAxisStateAios = stateAiosObj.xAxis; yAxisStateAios = stateAiosObj.yAxis;
}

function updateDashboard() {
    let currentData = rawData.filter(d => 
        (selectedYear === "All" || d.Year == selectedYear) &&
        (selectedRoadUser === "All" || d.RoadUser === selectedRoadUser) &&
        (selectedRemoteness === "All" || d.Remoteness === selectedRemoteness)
    );

    let totalDied = d3.sum(currentData, d => d.DiedCases);
    let avgBed = d3.mean(currentData, d => d.AvgBedDays) || 0; 
    
    d3.select("#kpi-died").transition().duration(500).tween("text", function() {
        const i = d3.interpolateRound(parseInt(this.textContent.replace(/,/g, '')) || 0, totalDied);
        return function(t) { this.textContent = d3.format(",")(i(t)); };
    });
    d3.select("#kpi-bed").text(avgBed.toFixed(2) + " Days");

    let trendData = rawData.filter(d => (selectedRoadUser === "All" || d.RoadUser === selectedRoadUser) && (selectedRemoteness === "All" || d.Remoteness === selectedRemoteness));
    let aggTrend = Array.from(d3.rollup(trendData, v => d3.sum(v, d => d.Total), d => d.Year), ([Year, Total]) => ({Year: +Year, Total})).sort((a,b) => d3.ascending(a.Year, b.Year));
    drawTrend(aggTrend);

    let aggRU = Array.from(d3.rollup(currentData, v => d3.sum(v, d => d.Total), d => d.RoadUser), ([RoadUser, Total]) => ({RoadUser, Total})).sort((a,b) => d3.descending(a.Total, b.Total));
    drawBarChart(aggRU, svgRU, xRU, yRU, xAxisRU, yAxisRU, "RoadUser", "Total", "#3498db", true);

    let aggAge = Array.from(d3.rollup(currentData, v => d3.sum(v, d => d.Total), d => d.AgeGroup), ([AgeGroup, Total]) => ({AgeGroup, Total})).sort((a,b) => d3.ascending(a.AgeGroup, b.AgeGroup));
    drawBarChart(aggAge, svgAge, xAge, yAge, xAxisAge, yAxisAge, "AgeGroup", "Total", "#2ecc71", false);

    let aggFatalities = Array.from(d3.rollup(currentData, v => d3.sum(v, d => d.DiedCases), d => d.RoadUser), ([RoadUser, Total]) => ({RoadUser, Total})).sort((a,b) => d3.descending(a.Total, b.Total));
    drawBarChart(aggFatalities, svgFatalities, xFatalities, yFatalities, xAxisFatalities, yAxisFatalities, "RoadUser", "Total", "#e74c3c", true);

    let aggBedDays = Array.from(d3.rollup(currentData, v => d3.mean(v, d => d.AvgBedDays), d => d.AgeGroup), ([AgeGroup, Total]) => ({AgeGroup, Total})).sort((a,b) => d3.ascending(a.AgeGroup, b.AgeGroup));
    drawBarChart(aggBedDays, svgBedDays, xBedDays, yBedDays, xAxisBedDays, yAxisBedDays, "AgeGroup", "Total", "#9b59b6", false);

    let currentStateData = rawStateData.filter(d => selectedYear === "All" || d.Year == selectedYear);
    
    let aggStateHosp = Array.from(d3.rollup(currentStateData, v => d3.sum(v, d => d.Total), d => d.State), ([State, Total]) => ({State, Total})).sort((a,b) => d3.descending(a.Total, b.Total));
    drawBarChart(aggStateHosp, svgStateHosp, xStateHosp, yStateHosp, xAxisStateHosp, yAxisStateHosp, "State", "Total", "#e67e22", false);

    let aggStateAios = Array.from(d3.rollup(currentStateData, v => d3.mean(v, d => d.AIOS), d => d.State), ([State, Total]) => ({State, Total})).sort((a,b) => d3.descending(a.Total, b.Total));
    drawBarChart(aggStateAios, svgStateAios, xStateAios, yStateAios, xAxisStateAios, yAxisStateAios, "State", "Total", "#16a085", false);
}


function drawTrend(data) {
    xTrend.domain(d3.extent(data, d => d.Year));
    yTrend.domain([0, d3.max(data, d => d.Total) || 100]);
    xAxisTrend.transition().duration(500).call(d3.axisBottom(xTrend).tickFormat(d3.format("d")));
    yAxisTrend.transition().duration(500).call(d3.axisLeft(yTrend).ticks(5));
    linePath.datum(data).transition().duration(500).attr("d", d3.line().x(d => xTrend(d.Year)).y(d => yTrend(d.Total)));
}


function drawBarChart(data, svg, x, y, xAxis, yAxis, categoryKey, valueKey, color, rotateText) {
    x.domain(data.map(d => d[categoryKey]));
    y.domain([0, d3.max(data, d => d[valueKey]) || 10]);
    
    let axisCall = xAxis.transition().duration(500).call(d3.axisBottom(x));
    if (rotateText) {
        axisCall.selectAll("text").attr("transform", "rotate(-20)").style("text-anchor", "end").style("font-size", "10px");
    } else {
        axisCall.selectAll("text").style("font-size", "10px");
    }
    
    yAxis.transition().duration(500).call(d3.axisLeft(y).ticks(5));

    svg.selectAll("rect").data(data, d => d[categoryKey]).join(
        enter => enter.append("rect").attr("x", d => x(d[categoryKey])).attr("y", height).attr("width", x.bandwidth()).attr("height", 0).attr("fill", color)
            .call(e => e.transition().duration(750).attr("y", d => y(d[valueKey])).attr("height", d => height - y(d[valueKey]))),
        update => update.call(u => u.transition().duration(750).attr("x", d => x(d[categoryKey])).attr("width", x.bandwidth()).attr("y", d => y(d[valueKey])).attr("height", d => height - y(d[valueKey]))),
        exit => exit.call(e => e.transition().duration(750).attr("y", height).attr("height", 0).remove())
    ).on("mouseover", function(e, d){ showTooltip(e, d[categoryKey], d[valueKey]); }).on("mouseout", hideTooltip);
}

function showTooltip(event, label, val) {
    d3.select(event.currentTarget).attr("opacity", 0.7);
    tooltip.classed("hidden", false)
           .html(`<strong>${label}</strong><br>Value: ${typeof val === 'number' ? (val % 1 !== 0 ? val.toFixed(2) : d3.format(",")(val)) : val}`)
           .style("left", (event.pageX + 10) + "px")
           .style("top", (event.pageY - 20) + "px");
}

function hideTooltip(event) {
    d3.select(event.currentTarget).attr("opacity", 1);
    tooltip.classed("hidden", true);
}

window.onload = init;
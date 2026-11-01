let rawData = [];
let rawStateData = [];
let rawEquityData = [];

let allYears = [];
let allRoadUsers = [];
let allRemoteness = [];

let selectedYears = new Set();
let selectedRoadUsers = new Set();
let selectedRemoteness = new Set();

window.getSelectedYears = () => selectedYears;

let activeTabId = "view-hospitalised";

let svgTrend, xTrend, yTrend, xAxisTrend, yAxisTrend, linePath, trendDotsGroup;
let svgRU, xRU, yRU, xAxisRU, yAxisRU;
let svgAge, xAge, yAge, xAxisAge, yAxisAge;
let svgStateHosp, xStateHosp, yStateHosp, xAxisStateHosp, yAxisStateHosp;
let svgStateAlos, xStateAlos, yStateAlos, xAxisStateAlos, yAxisStateAlos;
let svgEquityHosp, xEquityHosp, yEquityHosp, xAxisEquityHosp, yAxisEquityHosp;
let svgEquityAlosGroup;





function init() {
    setupNavigation();
    setupCharts();

    Promise.all([
        d3.csv("assets/data/national_master.csv"),
        d3.csv("assets/data/d3state_hospitalisation_ALOS.csv"),
        d3.csv("assets/data/first_nations_equity_gap.csv")
    ]).then(([national, state, equity]) => {
        
        national.forEach(d => {
            d.Year = String(d['Calendar year'] || d.Year).trim();
            d.RoadUser = d['Road user'] || d.RoadUser || "Unknown";
            d.AgeGroup = d['Age group'] || d.AgeGroup || "Unknown";
            
            let rawRemote = d['ABS remoteness area'] || d.Remoteness;
            if (!rawRemote || rawRemote.trim() === "" || rawRemote.toLowerCase() === "missing" || rawRemote === "?") {
                d.Remoteness = "Unknown";
            } else {
                d.Remoteness = rawRemote.trim();
            }

            d.Total = +(d['Sum(Hospitalisations)'] || d.Hospitalisations || 0);
            d.DiedCases = +(d['Sum(Died_cases)'] || d.Died_cases || 0);
            d.SumBedDays = +(d['Sum(Bed days)'] || d['Sum(Bed Days)'] || 0);
        });
        rawData = national;

        state.forEach(d => {
            d.Year = String(d['calendar year'] || d.Year).trim();
            d.State = (d['state or territory'] || d.State || "").trim();
            d.Total = +(d['Sum(Hospitalisations)'] || 0);
            d.SumBedDays = +(d['Sum(Bed Days)'] || 0);
            d.ALOS = +(d['AIOS'] || d['ALOS'] || (d.Total === 0 ? 0 : d.SumBedDays / d.Total));
        });
        rawStateData = state;

        equity.forEach(d => {
            d.Year = String(d.Year).trim();
            d.Status = (d.Status || "").trim();
            d.Remoteness = (d.Remoteness || "").trim();
            d.Total = +d.Hospitalisations || 0;
            d.SumBedDays = +d.Bed_Days || 0;
            d.ALOS = +d.ALOS || (d.Total === 0 ? 0 : +(d.SumBedDays / d.Total).toFixed(2));
        });
        rawEquityData = equity;

        allYears = Array.from(new Set(rawData.map(d => d.Year))).sort();
        allRoadUsers = Array.from(new Set(rawData.map(d => d.RoadUser))).sort();
        allRemoteness = Array.from(new Set(rawData.map(d => d.Remoteness))).sort();

        selectedYears = new Set(allYears);
        selectedRoadUsers = new Set(allRoadUsers);
        selectedRemoteness = new Set(allRemoteness);

        setupChecklistFilters();

        updateDashboard();

    }).catch(error => {
        console.error("Critical error encountered while loading datasets:", error);
    });
}




function setupNavigation() {
    d3.selectAll(".nav-tab").on("click", function() {
        d3.selectAll(".nav-tab").classed("active", false).attr("aria-selected", "false");
        d3.select(this).classed("active", true).attr("aria-selected", "true");

        activeTabId = d3.select(this).attr("data-target");

        d3.selectAll(".view-section").classed("active-view", false);
        d3.select("#" + activeTabId).classed("active-view", true);

        if (activeTabId === "view-glossary") {
            d3.select("#data-controls").style("display", "none");
        } else if (activeTabId === "view-equity") {
            d3.select("#data-controls").style("display", "block");
            d3.selectAll(".national-filter").style("display", "none");
            d3.selectAll(".equity-filter").style("display", "inline-block");
            updateDashboard();
            if (typeof window.updateFirstNationsChart === "function") {
                window.updateFirstNationsChart(true);
            }
        } else if (activeTabId === "view-state") {
            d3.select("#data-controls").style("display", "block");
            d3.selectAll(".national-filter").style("display", "none");
            d3.selectAll(".equity-filter").style("display", "none");
            updateDashboard();
        } else {
            d3.select("#data-controls").style("display", "block");
            d3.selectAll(".national-filter").style("display", "block");
            d3.selectAll(".equity-filter").style("display", "none");
            updateDashboard(); 
        }
    });
}


function setupChecklistFilters() {
    document.addEventListener("click", () => {
        d3.selectAll(".filter-dropdown").classed("open", false)
            .select(".dropdown-trigger").attr("aria-expanded", "false");
    });

    function buildDropdown(dropdownId, listId, selectAllId, summaryId, items, selectedSet, defaultAllText) {
        const dropdown = d3.select(dropdownId);
        const trigger = dropdown.select(".dropdown-trigger");
        const panel = dropdown.select(".dropdown-panel");
        const list = d3.select(listId);
        const selectAllCheckbox = d3.select(selectAllId);
        const summary = d3.select(summaryId);

        trigger.on("click", function(event) {
            event.stopPropagation();
            const isOpen = dropdown.classed("open");
            d3.selectAll(".filter-dropdown").classed("open", false)
                .select(".dropdown-trigger").attr("aria-expanded", "false");
            
            if (!isOpen) {
                dropdown.classed("open", true);
                trigger.attr("aria-expanded", "true");
            }
        });

        panel.on("click", function(event) {
            event.stopPropagation();
        });

        list.html("");
        items.forEach(val => {
            const itemLabel = list.append("label").attr("class", "checkbox-label");
            const checkbox = itemLabel.append("input")
                .attr("type", "checkbox")
                .attr("value", val)
                .property("checked", selectedSet.has(val));
            itemLabel.append("span").text(val);

            checkbox.on("change", function() {
                if (this.checked) {
                    selectedSet.add(val);
                } else {
                    selectedSet.delete(val);
                }
                updateDropdownState();
                updateDashboard();
            });
        });

        selectAllCheckbox.on("change", function() {
            const isChecked = this.checked;
            if (isChecked) {
                items.forEach(v => selectedSet.add(v));
            } else {
                selectedSet.clear();
            }
            list.selectAll("input[type='checkbox']").property("checked", isChecked);
            updateSummary();
            updateDashboard();
        });

        function updateDropdownState() {
            const count = selectedSet.size;
            selectAllCheckbox.property("checked", count === items.length);
            selectAllCheckbox.property("indeterminate", count > 0 && count < items.length);
            updateSummary();
        }

        function updateSummary() {
            const count = selectedSet.size;
            if (count === items.length) {
                summary.text(defaultAllText);
            } else if (count === 0) {
                summary.text("None selected");
            } else if (count === 1) {
                summary.text(Array.from(selectedSet)[0]);
            } else {
                summary.text(`${count} selected`);
            }
        }

        updateDropdownState();
    }

    buildDropdown("#dropdown-year", "#list-year", "#check-all-year", "#summary-year", allYears, selectedYears, "All Years");
    buildDropdown("#dropdown-ru", "#list-ru", "#check-all-ru", "#summary-ru", allRoadUsers, selectedRoadUsers, "All Road Users");
    buildDropdown("#dropdown-remote", "#list-remote", "#check-all-remote", "#summary-remote", allRemoteness, selectedRemoteness, "All Areas");
}




function createSvgBase(selector, isWide = false, xLabel = "", yLabel = "") {
    const w = isWide ? trendWidth : width;
    const totalW = w + margin.left + margin.right;
    const totalH = height + margin.top + margin.bottom;

    const svg = d3.select(selector).append("svg")
        .attr("viewBox", `0 0 ${totalW} ${totalH}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const x = isWide ? d3.scaleLinear().range([0, w]) : d3.scaleBand().range([0, w]).padding(0.25);
    const y = d3.scaleLinear().range([height, 0]);

    const xAxis = svg.append("g")
        .attr("class", "chart-axis x-axis")
        .attr("transform", `translate(0,${height})`);

    const yAxis = svg.append("g")
        .attr("class", "chart-axis y-axis");

    if (xLabel) {
        svg.append("text")
            .attr("class", "axis-title")
            .attr("x", w / 2)
            .attr("y", height + margin.bottom - 12)
            .attr("text-anchor", "middle")
            .text(xLabel);
    }

    if (yLabel) {
        svg.append("text")
            .attr("class", "axis-title")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 18)
            .attr("text-anchor", "middle")
            .text(yLabel);
    }

    return { svg, x, y, xAxis, yAxis, w };
}


function setupCharts() {
    let trendObj = createSvgBase("#chart-trend", true, "Calendar Year", "Hospital Admissions");
    svgTrend = trendObj.svg; xTrend = trendObj.x; yTrend = trendObj.y; xAxisTrend = trendObj.xAxis; yAxisTrend = trendObj.yAxis;
    linePath = svgTrend.append("path")
        .attr("fill", "none")
        .attr("stroke", "#2980b9")
        .attr("stroke-width", 3);
    trendDotsGroup = svgTrend.append("g").attr("class", "trend-dots-group");

    let ruObj = createSvgBase("#chart-ru", false, "Road User Category", "Admissions");
    svgRU = ruObj.svg; xRU = ruObj.x; yRU = ruObj.y; xAxisRU = ruObj.xAxis; yAxisRU = ruObj.yAxis;

    let ageObj = createSvgBase("#chart-age", false, "Age Group", "Admissions");
    svgAge = ageObj.svg; xAge = ageObj.x; yAge = ageObj.y; xAxisAge = ageObj.xAxis; yAxisAge = ageObj.yAxis;

    let stateHospObj = createSvgBase("#chart-state-hosp", false, "State / Territory", "Admissions");
    svgStateHosp = stateHospObj.svg; xStateHosp = stateHospObj.x; yStateHosp = stateHospObj.y; xAxisStateHosp = stateHospObj.xAxis; yAxisStateHosp = stateHospObj.yAxis;

    let stateAlosObj = createSvgBase("#chart-state-alos", false, "State / Territory", "ALOS (Days)");
    svgStateAlos = stateAlosObj.svg; xStateAlos = stateAlosObj.x; yStateAlos = stateAlosObj.y; xAxisStateAlos = stateAlosObj.xAxis; yAxisStateAlos = stateAlosObj.yAxis;

}




function updateDashboard() {
    let currentData = rawData.filter(d => 
        selectedYears.has(d.Year) &&
        selectedRoadUsers.has(d.RoadUser) &&
        selectedRemoteness.has(d.Remoteness)
    );

    updateContextualKPIs(currentData);

    let trendData = rawData.filter(d => 
        selectedRoadUsers.has(d.RoadUser) && 
        selectedRemoteness.has(d.Remoteness)
    );
    let aggTrend = Array.from(
        d3.rollup(trendData, v => d3.sum(v, d => d.Total), d => d.Year), 
        ([Year, Total]) => ({ Year: +Year, Total })
    ).sort((a,b) => d3.ascending(a.Year, b.Year));

    if (selectedYears.size > 0 && selectedYears.size < allYears.length) {
        aggTrend = aggTrend.filter(d => selectedYears.has(String(d.Year)));
    }
    drawTrendChart(aggTrend);

    let aggRU = Array.from(
        d3.rollup(currentData, v => d3.sum(v, d => d.Total), d => d.RoadUser), 
        ([RoadUser, Total]) => ({ RoadUser, Total })
    ).sort((a,b) => d3.descending(a.Total, b.Total));
    drawBarChart(aggRU, svgRU, xRU, yRU, xAxisRU, yAxisRU, "RoadUser", "Total", "#2980b9", true, "Admissions");

    let aggAge = Array.from(
        d3.rollup(currentData, v => d3.sum(v, d => d.Total), d => d.AgeGroup), 
        ([AgeGroup, Total]) => ({ AgeGroup, Total })
    ).sort((a,b) => d3.ascending(a.AgeGroup, b.AgeGroup));
    drawBarChart(aggAge, svgAge, xAge, yAge, xAxisAge, yAxisAge, "AgeGroup", "Total", "#16a085", false, "Admissions");

    let currentStateData = rawStateData.filter(d => selectedYears.has(d.Year));
    
    let aggStateHosp = Array.from(
        d3.rollup(currentStateData, v => d3.sum(v, d => d.Total), d => d.State), 
        ([State, Total]) => ({ State, Total })
    ).sort((a,b) => d3.descending(a.Total, b.Total));
    drawBarChart(aggStateHosp, svgStateHosp, xStateHosp, yStateHosp, xAxisStateHosp, yAxisStateHosp, "State", "Total", "#d35400", false, "Admissions");

    let aggStateAlos = Array.from(d3.rollup(currentStateData, v => {
        let bSum = d3.sum(v, x => x.SumBedDays);
        let hSum = d3.sum(v, x => x.Total);
        return hSum === 0 ? 0 : +(bSum / hSum).toFixed(2);
    }, d => d.State), ([State, Total]) => ({ State, Total })).sort((a,b) => d3.descending(a.Total, b.Total));
    drawBarChart(aggStateAlos, svgStateAlos, xStateAlos, yStateAlos, xAxisStateAlos, yAxisStateAlos, "State", "Total", "#27ae60", false, "ALOS (Days)");

    if (typeof window.updateFirstNationsChart === "function") {
        window.updateFirstNationsChart(true);
    }
}


function updateContextualKPIs(currentNationalData) {
    const kpiLabel1 = d3.select("#kpi-label-1");
    const kpiLabel2 = d3.select("#kpi-label-2");
    const kpiVal1 = d3.select("#kpi-died");
    const kpiVal2 = d3.select("#kpi-bed");

    if (activeTabId === "view-state") {
        let sData = rawStateData.filter(d => selectedYears.has(d.Year));
        let totalHosp = d3.sum(sData, d => d.Total);
        let totalBed = d3.sum(sData, d => d.SumBedDays);
        let avgAlos = totalHosp === 0 ? 0 : (totalBed / totalHosp);

        kpiLabel1.text("Total State Hospitalisations");
        kpiVal1.text(d3.format(",")(totalHosp));
        kpiLabel2.text("National Mean ALOS");
        kpiVal2.text(avgAlos.toFixed(2) + " Days");

    } else if (activeTabId === "view-equity") {
        let eData = rawEquityData.filter(d => selectedYears.has(d.Year));
        let fnData = eData.filter(d => d.Status === "First Nations");
        let fnTotalHosp = d3.sum(fnData, d => d.Total);
        let fnTotalBed = d3.sum(fnData, d => d.SumBedDays);
        let fnAlos = fnTotalHosp === 0 ? 0 : (fnTotalBed / fnTotalHosp);

        kpiLabel1.text("First Nations Admissions");
        kpiVal1.text(d3.format(",")(fnTotalHosp));
        kpiLabel2.text("First Nations Mean ALOS");
        kpiVal2.text(fnAlos.toFixed(2) + " Days");

    } else {
        let totalDied = d3.sum(currentNationalData, d => d.DiedCases);
        let totalBedDays = d3.sum(currentNationalData, d => d.SumBedDays);
        let totalHosp = d3.sum(currentNationalData, d => d.Total);
        let avgBed = totalHosp === 0 ? 0 : (totalBedDays / totalHosp);

        kpiLabel1.text("Total Fatalities (Died Cases)");
        kpiVal1.text(d3.format(",")(totalDied));
        kpiLabel2.text("Average Bed Days (ALOS)");
        kpiVal2.text(avgBed.toFixed(2) + " Days");
    }
}





function showTooltip(event, htmlContent) {
    tooltip.classed("hidden", false)
           .attr("aria-hidden", "false")
           .html(htmlContent)
           .style("left", (event.pageX + 14) + "px")
           .style("top", (event.pageY - 28) + "px");
}


function hideTooltip() {
    tooltip.classed("hidden", true)
           .attr("aria-hidden", "true");
}

window.onload = init;
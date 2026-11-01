let fnRawDataset = [];
let fnYearsDomain = [];
let fnSvg, fnInnerChart;
let fnGridGroup, fnBarsGroup, fnXAxisGroup, fnYAxisGroup;
let fnYAxisTitle, fnXAxisTitle;

const updateEquityLegend = () => {
    const isAllOverview = fnActiveGeo === "All" && fnActiveMetric === "counts";
    d3.select("#tier-legend").style("display", isAllOverview ? "inline-flex" : "none");

    const box = d3.select("#legend-non-box");
    const label = d3.select("#legend-non-label");
    if (fnActiveGeo === "Major Cities") {
        box.style("background-color", "#94a3b8").style("border-color", "#94a3b8");
        label.text("Non-Indigenous (Cities Slate)");
    } else if (fnActiveGeo === "Regional") {
        box.style("background-color", "#64748b").style("border-color", "#64748b");
        label.text("Non-Indigenous (Regional Slate)");
    } else if (fnActiveGeo === "Remote") {
        box.style("background-color", "#334155").style("border-color", "#334155");
        label.text("Non-Indigenous (Remote Slate)");
    } else {
        box.style("background-color", "#64748b").style("border-color", "#64748b");
        label.text("Non-Indigenous (Slate)");
    }
};

const setupEquityDropdown = (dropdownSelector, listSelector, summarySelector, options, getActiveId, onSelect) => {
    const dropdown = d3.select(dropdownSelector);
    const trigger = dropdown.select(".dropdown-trigger");
    const panel = dropdown.select(".dropdown-panel");
    const list = d3.select(listSelector);
    const summary = d3.select(summarySelector);
    const radioName = dropdownSelector.replace(/[^a-zA-Z0-9_-]/g, "");

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

    const renderOptions = () => {
        list.html("");
        const activeId = getActiveId();

        options.forEach(opt => {
            const label = list.append("label").attr("class", "checkbox-label");
            const radio = label.append("input")
                .attr("type", "radio")
                .attr("name", radioName)
                .attr("value", opt.id)
                .property("checked", opt.id === activeId);

            label.append("span").text(opt.label);

            label.on("click", function(event) {
                event.preventDefault();
                dropdown.classed("open", false);
                trigger.attr("aria-expanded", "false");
                if (opt.id !== getActiveId()) {
                    onSelect(opt.id, opt.label);
                    renderOptions();
                }
            });
        });

        const activeOpt = options.find(o => o.id === activeId) || options[0];
        if (activeOpt) {
            summary.text(activeOpt.label);
        }
    };

    renderOptions();
};

const setupEquityDropdowns = () => {
    setupEquityDropdown(
        "#dropdown-equity-geo",
        "#list-equity-geo",
        "#summary-equity-geo",
        fn_filters_geo,
        () => fnActiveGeo,
        (selectedId) => {
            fnActiveGeo = selectedId;
            fn_filters_geo.forEach(f => {
                f.isActive = f.id === selectedId;
            });
            updateEquityLegend();
            updateChart(true);
        }
    );

    setupEquityDropdown(
        "#dropdown-equity-metric",
        "#list-equity-metric",
        "#summary-equity-metric",
        fn_filters_metric,
        () => fnActiveMetric,
        (selectedId) => {
            fnActiveMetric = selectedId;
            fn_filters_metric.forEach(f => {
                f.isActive = f.id === selectedId;
            });
            updateEquityLegend();
            updateChart(true);
        }
    );

    updateEquityLegend();
};

const findRecord = (year, status, remoteness) => {
    return fnRawDataset.find(d =>
        d.year === year &&
        d.status.toLowerCase() === status.toLowerCase() &&
        d.remoteness.toLowerCase() === remoteness.toLowerCase()
    );
};

const buildCohortRecord = (year, status, remotenessArray) => {
    const matchingRows = fnRawDataset.filter(d =>
        d.year === year &&
        d.status.toLowerCase() === status.toLowerCase() &&
        remotenessArray.some(rem => rem.toLowerCase() === d.remoteness.toLowerCase())
    );

    const hospitalisations = d3.sum(matchingRows, d => d.hospitalisations);
    const bed_days = d3.sum(matchingRows, d => d.bed_days);
    const alos = hospitalisations > 0 ? (bed_days / hospitalisations) : 0;

    const fnRows = fnRawDataset.filter(d =>
        d.year === year &&
        d.status.toLowerCase() === "first nations" &&
        remotenessArray.some(rem => rem.toLowerCase() === d.remoteness.toLowerCase())
    );
    const nonRows = fnRawDataset.filter(d =>
        d.year === year &&
        d.status.toLowerCase() === "non-indigenous" &&
        remotenessArray.some(rem => rem.toLowerCase() === d.remoteness.toLowerCase())
    );

    const fn_hosp = d3.sum(fnRows, d => d.hospitalisations);
    const non_hosp = d3.sum(nonRows, d => d.hospitalisations);
    const total_hosp = fn_hosp + non_hosp;
    const share_pct = total_hosp > 0 ? ((fn_hosp / total_hosp) * 100) : 0;
    const cohort_share_pct = status === "First Nations" ? share_pct : (100 - share_pct);

    return {
        year,
        status,
        remotenessLabel: remotenessArray.length === 1 ? remotenessArray[0] : "All Remoteness Areas",
        hospitalisations,
        bed_days,
        alos,
        fn_hosp,
        non_hosp,
        share_pct,
        cohort_share_pct
    };
};

const initChart = () => {
    const container = d3.select("#first_nations_chart");
    container.selectAll("*").remove();

    fnSvg = container
        .append("svg")
        .attr("viewBox", `0 0 ${fnWidth} ${fnHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("role", "img")
        .attr("aria-label", "Interactive bar chart of road trauma hospitalisations by Indigenous status and remoteness");

    fnInnerChart = fnSvg
        .append("g")
        .attr("transform", `translate(${fnMargin.left}, ${fnMargin.top})`);

    fnGridGroup = fnInnerChart.append("g").attr("class", "grid-lines");
    fnBarsGroup = fnInnerChart.append("g").attr("class", "bars-layer");
    fnXAxisGroup = fnInnerChart
        .append("g")
        .attr("class", "chart-axis x-axis")
        .attr("transform", `translate(0, ${fnInnerHeight})`);
    fnYAxisGroup = fnInnerChart.append("g").attr("class", "chart-axis y-axis");

    fnYAxisTitle = fnSvg
        .append("text")
        .attr("class", "axis-title")
        .attr("x", fnMargin.left)
        .attr("y", 26)
        .text("Traffic Hospitalisations (Count)");

    fnXAxisTitle = fnSvg
        .append("text")
        .attr("class", "axis-title")
        .attr("text-anchor", "end")
        .attr("x", fnWidth - fnMargin.right)
        .attr("y", fnHeight - 20)
        .text("Year (2011-2021)");
};

const getRemotenessTierClass = (rem) => {
    if (rem === "Major Cities") return "tier-cities";
    if (rem === "Regional") return "tier-regional";
    if (rem === "Remote") return "tier-remote";
    return "";
};

const getActiveYearsDomain = () => {
    if (typeof window.getSelectedYears === "function") {
        const sel = window.getSelectedYears();
        if (sel) {
            return fnYearsDomain.filter(y => sel.has(String(y)) || sel.has(Number(y)));
        }
    }
    return fnYearsDomain;
};

const prepareChartData = () => {
    const isStackedOverview = fnActiveGeo === "All" && fnActiveMetric === "counts";
    const geoScope = fnActiveGeo === "All" ? FN_REMOTENESS_LEVELS : [fnActiveGeo];
    const visibleYears = getActiveYearsDomain();

    return visibleYears.map(year => {
        const cohortBars = FN_COHORTS.map(status => {
            const cohortClass = status === "First Nations" ? "fn" : "non";
            let segments = [];

            if (isStackedOverview) {
                const nationalCohortTotal = d3.sum(FN_REMOTENESS_LEVELS, rem => {
                    const rec = findRecord(year, status, rem);
                    return rec ? rec.hospitalisations : 0;
                });

                let runningTotal = 0;
                segments = FN_REMOTENESS_LEVELS.map(rem => {
                    const record = buildCohortRecord(year, status, [rem]);
                    const y0 = runningTotal;
                    runningTotal += record.hospitalisations;
                    const y1 = runningTotal;
                    const pctOfCohort = nationalCohortTotal > 0
                        ? ((record.hospitalisations / nationalCohortTotal) * 100)
                        : 0;

                    return {
                        year,
                        status,
                        cohortClass,
                        tierClass: getRemotenessTierClass(rem),
                        remoteness: rem,
                        remotenessLabel: rem,
                        y0,
                        y1,
                        val: record.hospitalisations,
                        hospitalisations: record.hospitalisations,
                        bed_days: record.bed_days,
                        alos: record.alos,
                        fn_hosp: record.fn_hosp,
                        non_hosp: record.non_hosp,
                        share_pct: record.share_pct,
                        cohort_share_pct: record.cohort_share_pct,
                        cohortTotal: nationalCohortTotal,
                        pctOfCohort,
                        isStacked: true
                    };
                });
            } else {
                const record = buildCohortRecord(year, status, geoScope);
                const metricValue = fnActiveMetric === "counts" ? record.hospitalisations : record.alos;

                segments = [{
                    year,
                    status,
                    cohortClass,
                    tierClass: getRemotenessTierClass(fnActiveGeo),
                    remoteness: fnActiveGeo,
                    remotenessLabel: record.remotenessLabel,
                    y0: 0,
                    y1: metricValue,
                    val: metricValue,
                    hospitalisations: record.hospitalisations,
                    bed_days: record.bed_days,
                    alos: record.alos,
                    fn_hosp: record.fn_hosp,
                    non_hosp: record.non_hosp,
                    share_pct: record.share_pct,
                    cohort_share_pct: record.cohort_share_pct,
                    cohortTotal: record.hospitalisations,
                    pctOfCohort: 100,
                    isStacked: false
                }];
            }

            return {
                status,
                cohortClass,
                segments,
                totalValue: d3.max(segments, s => s.y1) || 0
            };
        });

        return {
            year,
            cohortBars
        };
    });
};

const updateChart = (animate = false) => {
    if (!fnBarsGroup) return;
    const data = prepareChartData();
    const visibleYears = getActiveYearsDomain();
    const transitionDuration = animate ? 600 : 0;
    const t = d3.transition().duration(transitionDuration).ease(d3.easeCubicInOut);

    const isStackedOverview = fnActiveGeo === "All" && fnActiveMetric === "counts";
    fnBarsGroup.classed("is-stacked", isStackedOverview);
    let maxY = 0;
    data.forEach(yGroup => {
        yGroup.cohortBars.forEach(cBar => {
            cBar.segments.forEach(seg => {
                if (seg.y1 > maxY) maxY = seg.y1;
            });
        });
    });

    const headroomFactor = fnActiveMetric === "counts" ? 1.08 : 1.12;
    const finalMaxY = maxY > 0 ? (maxY * headroomFactor) : 10;

    fnXScaleYear.domain(visibleYears).range([0, fnInnerWidth]);
    fnXScaleCohort.domain(FN_COHORTS).range([0, fnXScaleYear.bandwidth()]);
    fnYScale.domain([0, finalMaxY]).nice().range([fnInnerHeight, 0]);

    const currentMetricConfig = fn_filters_metric.find(f => f.id === fnActiveMetric);
    fnYAxisTitle.text(currentMetricConfig ? currentMetricConfig.axisTitle : "Value");

    const yGrid = d3.axisLeft(fnYScale)
        .ticks(6)
        .tickSize(-fnInnerWidth)
        .tickFormat("");

    fnGridGroup.transition(t).call(yGrid);

    const yAxis = d3.axisLeft(fnYScale)
        .ticks(6)
        .tickFormat(d => fnActiveMetric === "counts" ? fnFormatNumber(d) : fnFormatOneDec(d));

    fnYAxisGroup.transition(t).call(yAxis);

    const xAxis = d3.axisBottom(fnXScaleYear).tickSizeOuter(0);
    fnXAxisGroup.transition(t).call(xAxis);

    const yearGroups = fnBarsGroup
        .selectAll(".year-group")
        .data(data, d => d.year);

    yearGroups.join(
        enter => enter
            .append("g")
            .attr("class", "year-group")
            .attr("transform", d => `translate(${fnXScaleYear(d.year)}, 0)`),
        update => update.call(u => u.transition(t)
            .attr("transform", d => `translate(${fnXScaleYear(d.year)}, 0)`)),
        exit => exit.call(e => e.transition(t).style("opacity", 0).remove())
    ).each(function(yearData) {
        const yearGroupSelection = d3.select(this);

        const cohortGroups = yearGroupSelection
            .selectAll(".cohort-group")
            .data(yearData.cohortBars, d => d.status);

        cohortGroups.join(
            enter => enter
                .append("g")
                .attr("class", d => `cohort-group cohort-${d.cohortClass}`)
                .attr("transform", d => `translate(${fnXScaleCohort(d.status)}, 0)`),
            update => update.call(u => u.transition(t)
                .attr("transform", d => `translate(${fnXScaleCohort(d.status)}, 0)`)),
            exit => exit.remove()
        ).each(function(cohortData) {
            const cohortGroupSelection = d3.select(this);

            const segments = cohortGroupSelection
                .selectAll(".bar-seg")
                .data(cohortData.segments, d => `${d.status}-${d.remoteness}`);

            segments.join(
                enter => enter
                    .append("rect")
                    .attr("class", d => `bar-seg ${d.cohortClass} ${d.tierClass}`)
                    .attr("x", 0)
                    .attr("width", fnXScaleCohort.bandwidth())
                    .attr("y", fnInnerHeight)
                    .attr("height", 0)
                    .call(enterSel => enterSel.transition(t)
                        .attr("y", d => fnYScale(d.y1))
                        .attr("height", d => Math.max(0, fnYScale(d.y0) - fnYScale(d.y1)))
                    ),
                update => update
                    .attr("class", d => `bar-seg ${d.cohortClass} ${d.tierClass}`)
                    .attr("x", 0)
                    .call(updateSel => updateSel.transition(t)
                        .attr("width", fnXScaleCohort.bandwidth())
                        .attr("y", d => fnYScale(d.y1))
                        .attr("height", d => Math.max(0, fnYScale(d.y0) - fnYScale(d.y1)))
                    ),
                exit => exit
                    .call(exitSel => exitSel.transition(t)
                        .attr("y", fnInnerHeight)
                        .attr("height", 0)
                        .remove()
                    )
            )
            .on("mouseover", handleBarMouseOver)
            .on("mousemove", handleBarMouseMove)
            .on("mouseout", handleBarMouseOut);
        });
    });
};


function handleBarMouseOver(event, d) {
    d3.select(this)
        .raise()
        .classed("hovered", true);
    const fnShareText = fnFormatOneDec(d.share_pct);
    const cohortShareText = fnFormatOneDec(d.cohort_share_pct);

    let htmlContent = "";

    if (d.isStacked) {
        htmlContent = `
            <div class="tooltip-title">${d.status} (${d.year}) &bull; ${d.remoteness}</div>
            <div class="tooltip-row">
                <span>Segment Count:</span>
                <strong>${fnFormatNumber(d.hospitalisations)}</strong>
            </div>
            <div class="tooltip-row">
                <span>Cumulative Column Total:</span>
                <strong>${fnFormatNumber(d.cohortTotal)}</strong>
            </div>
            <div class="tooltip-row">
                <span>Share of National Cohort:</span>
                <strong>${fnFormatOneDec(d.pctOfCohort)}%</strong>
            </div>
            <div class="tooltip-row">
                <span>Total Bed Days:</span>
                <strong>${fnFormatNumber(d.bed_days)}</strong>
            </div>
            <div class="tooltip-row">
                <span>Average Stay (ALOS):</span>
                <strong>${fnFormatOneDec(d.alos)} days</strong>
            </div>
            <div class="tooltip-row highlight">
                <span>Local Area Trauma Share:</span>
                <strong>${cohortShareText}% (FN: ${fnShareText}%)</strong>
            </div>
        `;
    } else {
        const isCounts = fnActiveMetric === "counts";
        htmlContent = `
            <div class="tooltip-title">${d.status} (${d.year}) &bull; ${d.remotenessLabel}</div>
            <div class="tooltip-row">
                <span>${isCounts ? "Hospitalisations:" : "Average Stay (ALOS):"}</span>
                <strong>${isCounts ? fnFormatNumber(d.hospitalisations) : `${fnFormatOneDec(d.alos)} days`}</strong>
            </div>
            <div class="tooltip-row">
                <span>Total Bed Days:</span>
                <strong>${fnFormatNumber(d.bed_days)}</strong>
            </div>
            ${isCounts ? `
            <div class="tooltip-row">
                <span>Average Stay (ALOS):</span>
                <strong>${fnFormatOneDec(d.alos)} days</strong>
            </div>` : `
            <div class="tooltip-row">
                <span>Hospitalisations:</span>
                <strong>${fnFormatNumber(d.hospitalisations)}</strong>
            </div>`}
            <div class="tooltip-row highlight">
                <span>Local Area Trauma Share:</span>
                <strong>${cohortShareText}% (FN: ${fnShareText}%)</strong>
            </div>
        `;
    }

    fnTooltip
        .html(htmlContent)
        .style("display", "block")
        .style("opacity", 1)
        .attr("aria-hidden", "false");

    positionTooltip(event);
}

function handleBarMouseMove(event) {
    positionTooltip(event);
}

function handleBarMouseOut() {
    d3.select(this).classed("hovered", false);
    fnTooltip
        .style("opacity", 0)
        .style("display", "none")
        .attr("aria-hidden", "true");
}

function positionTooltip(event) {
    const node = fnTooltip.node();
    const tooltipWidth = node ? node.offsetWidth : 240;
    const tooltipHeight = node ? node.offsetHeight : 170;

    let left = event.pageX + 16;
    let top = event.pageY - (tooltipHeight / 2);

    if (event.clientX + tooltipWidth + 24 > window.innerWidth) {
        left = event.pageX - tooltipWidth - 16;
    }

    if (top < window.scrollY + 10) {
        top = window.scrollY + 10;
    } else if (event.clientY + (tooltipHeight / 2) > window.innerHeight - 10) {
        top = event.pageY - tooltipHeight - 10;
    }

    fnTooltip
        .style("left", `${left}px`)
        .style("top", `${top}px`);
}

d3.csv(FN_DATA_PATH).then(data => {
    fnRawDataset = data.map(d => {
        const getVal = key => {
            const found = Object.keys(d).find(k => k.trim().toLowerCase() === key.toLowerCase());
            return found ? d[found] : "";
        };

        const year = parseInt(getVal("year"), 10);
        const status = String(getVal("status")).trim();
        const remoteness = String(getVal("remoteness")).trim();
        const hospitalisations = parseInt(getVal("hospitalisations"), 10) || 0;
        const bed_days = parseInt(getVal("bed_days"), 10) || 0;
        const alos = parseFloat(getVal("alos")) || (hospitalisations > 0 ? bed_days / hospitalisations : 0);

        return {
            year,
            status,
            remoteness,
            hospitalisations,
            bed_days,
            alos
        };
    });

    const uniqueYears = Array.from(new Set(fnRawDataset.map(d => d.year)))
        .filter(y => !isNaN(y))
        .sort((a, b) => a - b);
    fnYearsDomain = uniqueYears;

    setupEquityDropdowns();
    initChart();
    updateChart(false);

    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            updateChart(false);
        }, 150);
    });

}).catch(err => {
    console.error("Error loading First Nations CSV file:", err);
    d3.select("#first_nations_chart")
        .append("p")
        .style("color", "#c00")
        .text("Error loading dataset. Please verify the relative path to assets/data/first_nations_equity_gap.csv.");
});

window.updateFirstNationsChart = updateChart;
window.initFirstNationsChart = initChart;

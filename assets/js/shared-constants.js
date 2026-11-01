const margin = { top: 25, right: 30, bottom: 65, left: 65 };
const width = 480 - margin.left - margin.right;
const height = 250 - margin.top - margin.bottom;
const trendWidth = (width * 2) + margin.left + margin.right + 20;

const fontSizeScale = d3.scaleLinear()
    .domain([315, 1000])
    .range([47, 15]);

const fnMargin = { top: 52, right: 30, bottom: 62, left: 68 };
const fnWidth = 860;
const fnHeight = 470;
const fnInnerWidth = fnWidth - fnMargin.left - fnMargin.right;
const fnInnerHeight = fnHeight - fnMargin.top - fnMargin.bottom;

const FN_DATA_PATH = "./assets/data/first_nations_equity_gap.csv";

const FN_COHORTS = ["First Nations", "Non-Indigenous"];
const FN_REMOTENESS_LEVELS = ["Major Cities", "Regional", "Remote"];

const FN_COLOR_FN = "#b3471b";
const FN_COLORS_NON = {
    "Major Cities": "#94a3b8",
    "Regional": "#64748b",
    "Remote": "#334155"
};

const fn_filters_geo = [
    { id: "All", label: "All Overview", isActive: true },
    { id: "Major Cities", label: "Major Cities", isActive: false },
    { id: "Regional", label: "Regional", isActive: false },
    { id: "Remote", label: "Remote", isActive: false }
];

const fn_filters_metric = [
    {
        id: "counts",
        label: "Hospitalisation Volume (Counts)",
        axisTitle: "Traffic Hospitalisations (Count)",
        isActive: true
    },
    {
        id: "alos",
        label: "Clinical Severity (ALOS)",
        axisTitle: "Average Length of Stay (Days)",
        isActive: false
    }
];

let fnActiveGeo = "All";
let fnActiveMetric = "counts";

const fnXScaleYear = d3.scaleBand().paddingInner(0.24).paddingOuter(0.12);
const fnXScaleCohort = d3.scaleBand().padding(0.15);
const fnYScale = d3.scaleLinear();

const fnFormatNumber = d3.format(",");
const fnFormatOneDec = d3.format(".1f");

const tooltip = d3.select("#tooltip");
const fnTooltip = d3.select("#chart-tooltip");
function drawTrendChart(data) {
    if (!data || data.length === 0) return;

    xTrend.domain(d3.extent(data, d => d.Year));
    yTrend.domain([0, (d3.max(data, d => d.Total) || 100) * 1.08]);

    xAxisTrend.transition().duration(600)
        .call(d3.axisBottom(xTrend).tickFormat(d3.format("d")).ticks(data.length));
    
    yAxisTrend.transition().duration(600)
        .call(d3.axisLeft(yTrend).ticks(5).tickFormat(d3.format("~s")));

    const lineGenerator = d3.line()
        .x(d => xTrend(d.Year))
        .y(d => yTrend(d.Total))
        .curve(d3.curveMonotoneX);

    linePath.datum(data)
        .transition().duration(600)
        .attr("d", lineGenerator);

    trendDotsGroup.selectAll("circle.trend-dot")
        .data(data, d => d.Year)
        .join(
            enter => enter.append("circle")
                .attr("class", "trend-dot")
                .attr("cx", d => xTrend(d.Year))
                .attr("cy", d => yTrend(d.Total))
                .attr("r", 0)
                .attr("fill", "#2980b9")
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 2)
                .call(e => e.transition().duration(600).attr("r", 5)),
            update => update.call(u => u.transition().duration(600)
                .attr("cx", d => xTrend(d.Year))
                .attr("cy", d => yTrend(d.Total))),
            exit => exit.call(e => e.transition().duration(400).attr("r", 0).remove())
        )
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 7).attr("fill", "#e74c3c");
            showTooltip(event, `<strong>Year: ${d.Year}</strong><br>Admissions: ${d3.format(",")(d.Total)} cases`);
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 5).attr("fill", "#2980b9");
            hideTooltip();
        });
}
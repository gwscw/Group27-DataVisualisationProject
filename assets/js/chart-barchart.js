function drawBarChart(data, svg, x, y, xAxis, yAxis, categoryKey, valueKey, color, rotateLabels, unitName) {
    x.domain(data.map(d => d[categoryKey]));
    y.domain([0, (d3.max(data, d => d[valueKey]) || 10) * 1.1]);

    let axisCall = xAxis.transition().duration(600).call(d3.axisBottom(x));
    if (rotateLabels) {
        axisCall.selectAll("text")
            .attr("transform", "rotate(-25)")
            .attr("dx", "-0.7em")
            .attr("dy", "0.2em")
            .style("text-anchor", "end");
    } else {
        axisCall.selectAll("text")
            .attr("transform", null)
            .style("text-anchor", "middle");
    }

    yAxis.transition().duration(600)
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => (d >= 1000 ? d3.format("~s")(d) : d)));

    svg.selectAll("rect.bar-mark")
        .data(data, d => d[categoryKey])
        .join(
            enter => enter.append("rect")
                .attr("class", "bar-mark")
                .attr("x", d => x(d[categoryKey]))
                .attr("y", height)
                .attr("width", x.bandwidth())
                .attr("height", 0)
                .attr("fill", color)
                .attr("rx", 3)
                .call(e => e.transition().duration(700)
                    .attr("y", d => y(d[valueKey]))
                    .attr("height", d => Math.max(0, height - y(d[valueKey])))),
            update => update.call(u => u.transition().duration(700)
                .attr("x", d => x(d[categoryKey]))
                .attr("width", x.bandwidth())
                .attr("y", d => y(d[valueKey]))
                .attr("height", d => Math.max(0, height - y(d[valueKey])))),
            exit => exit.call(e => e.transition().duration(400)
                .attr("y", height)
                .attr("height", 0)
                .remove())
        )
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 0.75);
            let displayVal = typeof d[valueKey] === 'number' 
                ? (d[valueKey] % 1 !== 0 ? d[valueKey].toFixed(2) : d3.format(",")(d[valueKey])) 
                : d[valueKey];
            showTooltip(event, `<strong>${d[categoryKey]}</strong><br>${unitName}: ${displayVal}`);
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 1);
            hideTooltip();
        });
}
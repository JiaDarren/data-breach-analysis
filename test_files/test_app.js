function page_start(){
    var filePath="clean_data.csv";
    d3.csv(filePath).then(function(raw_data){
        // console.log(raw_data)
        plot2(raw_data);
    });

}

var plot2 = function(raw_data) {
    let use_records = true
    let org_key = 'Method category'

    function getData(org_key, use_records) {
        let valid_data = d3.filter(raw_data, d => d['Method'] != "")
        let group_data = d3.rollup(
            valid_data,
            v => ((use_records) ? d3.sum(v, a => a['Records']) : v.length),
            d => d['Organization type'].toLowerCase(),
            d => d[org_key].toLowerCase()
        )
        sorted_data = Array.from(group_data).sort(
            function(a, b) { 
                return d3.sum(a[1].values()) < d3.sum(b[1].values())
            }
        ).slice(0,10)
        
        let data = new Map()
        sorted_data.forEach(x => {
            data.set(x[0], x[1])
        })
        return [sorted_data, data]
    }
    function getStackedData(data, colorScale) {
        return (
            d3.stack()
                .keys(Array.from(colorScale.domain()).reverse())
                .value(function (d,key) {
                    let val = d[1].get(key)
                    if (val == undefined) {
                        return 0
                    }
                    return val;
                })(data)
        )
    }

    [sorted_data, data] = getData(org_key, use_records)

    // Canvas Settings
    let width = 900
    let height = 600
    let padding = {
        'right':(
            (!use_records && org_key == "Method") ? 150 : 75
        ),
        'left':125,
        'top':25,
        'bottom':75
    }
    let axes_padding = {
        'bottom': padding.bottom / 2,
        'left': 125
    }
    let size = 12
    let legend_offset = (
        (!use_records && org_key == "Method") ? 50 : 200
    )
    let legend_height = padding.top + 40
    let legend_padding = 5

    // Set up canvas
    let svg = d3.select("#plot2")
        .append("svg")
        .attr("width", width)
        .attr("height", height)

    // Set up scales
    var xScale = d3.scaleLinear()
        .domain([
            0,
            d3.max(data, d => d3.sum(d[1].values()))
        ])
        .range([padding.left, width - padding.right]);
    var yScale = d3.scaleBand()
        .domain(
            Array.from(data.keys())
        )
        .range([height-padding.bottom, padding.top])
        .padding(0.1);
    
    var catScale = d3.scaleOrdinal().domain([
            "hacked",
            "rogue contractor/employee", 
            "stolen/lost",
            "poor security", 
            "accidentally exposed",
            "unknown"
        ]).range([
            "#DC3522",
            "#EE7F38",
            "#9eacd9",
            "#44302A",
            "#1E1E20",
            "#9e9e9e"
        ]);
    var methodScale = d3.scaleOrdinal().domain([
            'hacked',
            'hacked/misconfiguration',
            'improper setting, hacked',
            'poor security / hacked',
            'ransomware hacked',
            'social engineering',
            'zero-day vulnerabilities',

            'inside job',
            'inside job, hacked',
            'poor security/inside job',
            'rogue contractor',

            'intentionally lost',
            'lost / stolen computer',
            'lost / stolen media',

            'poor security',
            'misconfiguration/poor security',
            'unprotected api',
            'unsecured s3 bucket',

            'accidentally exposed',
            'accidentally published',
            'accidentally uploaded',
            'data exposed by misconfiguration',
            'public aws server',

            'unknown'
        ]).range([
            "#f63223",
            "#d82720",
            "#bb1d1b",
            "#9e1417",
            "#820b12",
            "#68040b",
            "#4e0000",

            "#ee7f38",
            "#b96425",
            "#884914",
            "#5a2f05",

            "#9eacd9",
            "#6170ab",
            "#23397e",

            "#44302a",
            "#39241f",
            "#2e1814",
            "#240c05",

            "#1e1e20",
            "#18181a",
            "#121215",
            "#0a0a0d",
            "#000000",

            "#9e9e9e"
        ]);

    var colorScale = ((org_key == 'Method category') ? catScale : methodScale)

    // Build Axis
    let xAxis = d3.axisBottom().scale(xScale);
    let yAxis = d3.axisLeft().scale(yScale);

    svg.append("g")
        .call(xAxis)
        .attr("class", "xAxis")
        .attr("transform", "translate(0, " + (height - padding.bottom) + ")")

    svg.append("g")
        .call(yAxis)
        .attr("class", "yAxis")
        .attr("transform", "translate(" + padding.left + ", 0)")

    // Add axes title
    svg.append("text")
        .attr("class", "xlabel")
        .attr("text-anchor", "end")
        .attr("x", (width + padding.left - padding.right) / 2)
        .attr("y", height - padding.bottom + axes_padding.bottom)
        .text(
            ((use_records) ? "Number of Records Compromised" : "Number of Data Breaches")
        );

    svg.append("text")
        .attr("class", "ylabel")
        .attr("text-anchor", "end")
        .attr("x", -1 * height / 3)
        .attr("y", padding.left - axes_padding.left)
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text("Organization Type");
    
    // Build Tooltip
    var tooltip = d3.select("#plot2")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")
        .style("position", "absolute")
    // Mouseover functions
    var mouseover = function(d) {
        tooltip
            .style("opacity", 1)

        svg.selectAll(".bars").style("opacity", 0.5)
        d3.select(this)
            .style("stroke", "black")
            .style("opacity", 1)
    }
    var mousemove = function(event, d) {
        // console.log(d3.select(this.parentNode).datum().key)
        tooltip
            .html(
                "Method: " + 
                d3.select(this.parentNode).datum().key + 
                ((use_records) ? "<br>Records Compromised: " : "<br>Number of Data Breaches: ") + 
                (d[1] - d[0])
            )
            .style("left", (event.pageX) + "px")
            .style("top", (event.pageY - 80) + "px")
    }
    var mouseleave = function(d) {
        tooltip
            .style("opacity", 0)
        svg.selectAll(".bars").style("opacity", 1)
        d3.select(this)
            .style("stroke", "none")
            .style("opacity", 1)
    }

    // Generate Stacked bar-plot for Method
    let stacked = getStackedData(data, colorScale)
    // console.log(stacked)

    svg.append("g")
        .attr("class", "stackedplot")
        .selectAll("gbars")
        .data(stacked).enter()
        .append("g")
        .attr("class","gbars")
        .attr("fill", d => colorScale(d.key))
        .selectAll("rect")
            .data(d => d).enter()
            .append("rect")
                .attr("class","bars")
                .attr("y", function(d, i) {
                    return yScale(d.data[0]);
                })
                .attr("x", function(d) {
                    // console.log(d, d[1], yScale(d[1]))
                    return xScale(d[0]);
                    // return heightScale(d[0]);
                })
                .attr("height", function(d) {
                    return yScale.bandwidth();
                })
                .attr("width", function(d) {
                    return xScale(d[1]) - xScale(d[0]);
                })
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave)
    
    // Add legend
    let legend = svg.append("g").attr("class", "legend")
    legend.selectAll("legendDots")
        .data(colorScale.domain())
        .enter()
        .append("rect")
            .attr("class", "legendDots")
            .attr("x", width - padding.right - legend_offset)
            .attr("y", function(d,i){ return legend_height + i*(size+legend_padding)})
            .attr("width", size)
            .attr("height", size)
            .style("fill", function(d){ return colorScale(d)})
    legend.selectAll("legendText")
        .data(colorScale.domain())
        .enter()
        .append("text")
            .attr("class", "legendText")
            .attr("x", width - padding.right - legend_offset + size*1.2)
            .attr("y", function(d,i){ return legend_height + i*(size+legend_padding) + size * 3/4})
            .style("fill", "#71635F")
            .text(function(d){ return d})
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")

    // Set title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", padding.top + 25)
        .attr("text-anchor", "middle")
        .text("Web Organizations are the Most Targeted Type of Organization")

    // Update function
    let update = function(use_records, org_key) {
        padding = {
            'right':(
                (!use_records && org_key == "Method") ? 150 : 75
            ),
            'left':125,
            'top':25,
            'bottom':75
        }
        legend_offset = (
            (!use_records && org_key == "Method") ? 50 : 200
        )

        // Generate new data
        let [sorted_data, data] = getData(org_key, use_records)
        
        // update new Scales
        xScale.domain([
                0,
                d3.max(data, d => d3.sum(d[1].values()))
            ])
            .range([padding.left, width - padding.right])

        yScale.domain(
                Array.from(data.keys())
            )
            .range([height-padding.bottom, padding.top])
            .padding(0.1);
        colorScale = ((org_key == 'Method category') ? catScale : methodScale)

        // Build new axis:
        xAxis = d3.axisBottom().scale(xScale);
        yAxis = d3.axisLeft().scale(yScale);

        svg.selectAll("g.yAxis")
            .transition()
            .duration(1000)
            .call(yAxis)
            .attr("class", "yAxis")
            .attr("transform", "translate(" + padding.left + ", 0)")

        svg.selectAll("g.xAxis")
            .transition()
            .duration(1000)
            .call(xAxis)
            .attr("class", "xAxis")
            .attr("transform", "translate(0, " + (height - padding.bottom) + ")")

        // Update x Axis label
        svg.selectAll(".xlabel").text(
            ((use_records) ? "Number of Records Compromised" : "Number of Data Breaches")
        )

        // update stacked barplot
        // console.log(colorScale.range())
        let stacked = getStackedData(data, colorScale)
        // console.log(data)
        plot_selection = svg.selectAll('.stackedplot')
            .selectAll('.gbars')
            .data(stacked)
            .join(
                function(enter) {
                    return enter.append('g')
                        .attr("class","gbars")
                        .attr("fill", d => colorScale(d.key))
                },
                function(update) { return update; },
                function(exit) { return exit.remove(); }
            )
            .selectAll('rect')
            .data(function(d) { 
                // console.log(d)
                return d; 
            })
            .join(
                function(enter) {
                    return enter.append('rect')
                        .attr("class","bars")
                        .attr("y", function(d) {
                            return yScale(d.data[0]);
                        })
                        .attr("x", function(d) {
                            return xScale(d[0]);
                        })
                        .attr("height", yScale.bandwidth())
                        .attr("width", function(d) {
                            return xScale(d[1]) - xScale(d[0]);
                        })
                        .on("mouseover", mouseover)
                        .on("mousemove", mousemove)
                        .on("mouseleave", mouseleave)
                        .style("opacity", 0)

                },
                function(update) { 
                    return update.transition().
                        delay(function(d, i) {
                            return i * 50;
                        })
                        .attr("y", function(d) {
                            return yScale(d.data[0]);
                        })
                        .attr("x", function(d) {
                            return xScale(d[0]);
                        })
                        .attr("height", yScale.bandwidth())
                        .attr("width", function(d) {
                            return xScale(d[1]) - xScale(d[0]);
                        }); 
                },
                function(exit) { 
                    return exit.transition()
                        .delay(function(d, i) {
                            return i * 50;
                        })
                        // .style("opacity", 0)
                        .remove(); 
                    }
            )
            .transition()
            .delay(function(d, i) {
                return i * 50;
            })
                .attr("y", function(d, i) {
                    return yScale(d.data[0]);
                })
                .attr("x", function(d) {
                    // console.log(d, d[1], yScale(d[1]))
                    return xScale(d[0]);
                    // return heightScale(d[0]);
                })
                .attr("height", function(d) {
                    return yScale.bandwidth();
                })
                .attr("width", function(d) {
                    return xScale(d[1]) - xScale(d[0]);
                })
                .style("opacity", 1)

        // Update legend
        dot_selection = legend.selectAll(".legendDots")
            .data(colorScale.domain())
            .join(
                function(enter) {
                    return enter.append("rect")
                            .attr("class", "legendDots")
                            .attr("x", width - padding.right - legend_offset)
                            .attr("y", function(d,i){ return legend_height + i*(size+legend_padding)})
                            .attr("width", size)
                            .attr("height", size)
                            .style("fill", function(d){ return colorScale(d)})
                            .style("opacity", 0)
                },
                function(update) { return update; },
                function(exit) { 
                    return exit.transition()
                        .delay(function(d, i) {
                            return i * 10;
                        })
                        .style("opacity", 0)
                        .remove(); 
                }
            )
            .transition()
            .delay(function(d, i) {
                return i * 10;
            })
            .attr("x", width - padding.right - legend_offset)
            .attr("y", function(d,i){ return legend_height + i*(size+legend_padding)})
            .style("fill", function(d){ return colorScale(d)})
            .style("opacity", 1)

        text_selection = legend.selectAll(".legendText")
            .data(colorScale.domain())
            .join(
                function(enter) {
                    return enter.append("text")
                            .attr("class", "legendText")
                            .attr("x", width - padding.right - legend_offset + size*1.2)
                            .attr("y", function(d,i){ return legend_height + i*(size+legend_padding) + size * 3/4})
                            .style("fill", "#71635F")
                            .text(function(d){ return d})
                            .attr("text-anchor", "left")
                            .style("alignment-baseline", "middle")
                            .style("opacity", 0)
                },
                function(update) { return update.text(function(d){ return d}); },
                function(exit) { 
                    return exit.transition()
                        .delay(function(d, i) {
                            return i * 10;
                        })
                        .style("opacity", 0)
                        .remove(); 
                }
            )
            .transition()
            .delay(function(d, i) {
                return i * 10;
            })
            .attr("x", width - padding.right - legend_offset + size*1.2)
            .attr("y", function(d,i){ return legend_height + i*(size+legend_padding) + size * 3/4})
            .style("opacity", 1)
        
                
        // console.log(colorScale.domain())
        // console.log('selection', colorScale.domain().length, Array.from(dot_selection))
    }
    // Radio button
    var method_radio = d3.select("#method_radio").attr('name', 'method_cat').on("change", function (d) {
        // console.log(d.target.value)
        org_key = d.target.value

        update(use_records, org_key)
    })
    var record_radio = d3.select("#record_radio").attr('name', 'method_cat').on("change", function (d) {
        use_records = d.target.value == "Records"
        // console.log(use_records)

        update(use_records, org_key)
    })

    
}

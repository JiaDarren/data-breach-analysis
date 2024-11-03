function page_start(){
    var filePath="clean_data.csv";
    d3.csv(filePath).then(function(raw_data){
        console.log(raw_data)
        let data = createSuperCat(raw_data);

        plot1(data);
        plot2(data);
        plot3(data);
        plot4(data);
        plot5(data);
    });

}

var createSuperCat = function(raw_data) {
    method_categories = {
        'hacked':[
            'hacked',
            'hacked/misconfiguration',
            'improper setting, hacked',
            'poor security / hacked',
            'ransomware hacked',
            'social engineering',
            'zero-day vulnerabilities'
        ],
        'poor security':[
            'poor security',
            'misconfiguration/poor security',
            'unprotected api',
            'unsecured s3 bucket'
        ],
        'accidentally exposed':[
            'accidentally exposed',
            'accidentally published',
            'accidentally uploaded',
            'data exposed by misconfiguration',
            'public aws server'
        ],
        'stolen/lost':[
            'intentionally lost',
            'lost / stolen computer',
            'lost / stolen media'
        ],
        'rogue contractor/employee':[
            'inside job',
            'inside job, hacked',
            'poor security/inside job',
            'rogue contractor'
        ]
    }


    function get_method_cat(x){
        for (method of Object.keys(method_categories)) {
            if (method_categories[method].includes(x)) {
                return method
            }
        }
        return "unknown"
    }


    for (let i = 0; i < raw_data.length; i++) {
        let method = raw_data[i]['Method']
        raw_data[i]['Method category'] = get_method_cat(method)
    } 
    return raw_data
}
var plot1 = function(raw_data) {
    data = d3.filter(raw_data, function(d){
        return !(
            isNaN(d['Records']) || 
            (d['Records'] == "") || 
            isNaN(d['Year']) ||
            (d['Year'] == "") 
            || (parseFloat(d['Records']) > 2000000000)
        )
    })


    const width = 700
    const height = 400
    const padding = {
        'right':75,
        'left':100,
        'top':10,
        'bottom':75
    }
    const axes_padding = {
        'bottom': padding.bottom / 2,
        'left': 90
    }

    // Set up canvas
    let svg = d3.select("#plot1")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
    
    // Build scales
    var xScale = d3.scaleLinear()
        .domain([
            d3.min(data, d => parseFloat(d['Year'])),
            d3.max(data, d => parseFloat(d['Year']))
        ])
        .range([padding.left, width - padding.right]);
    var yScale = d3.scaleLinear()
        .domain([
            d3.min(data, d => parseFloat(d['Records'])),
            d3.max(data, d => parseFloat(d['Records']))
        ])
        .range([height - padding.bottom, padding.top]);
    
    // Build axis:
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
        .text("Year");

    svg.append("text")
        .attr("class", "ylabel")
        .attr("text-anchor", "end")
        .attr("x", -1 * height / 9)
        .attr("y", padding.left - axes_padding.left)
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text("Number of Records Compromised");
    
    // Plot scatterplot
    svg.append("g")
        .selectAll()
        .data(data)
        .enter()
        .append("circle")
            .attr("cx", function(d) { return xScale(parseFloat(d['Year'])) })
            .attr("cy", function(d) { 
                if (isNaN(yScale(parseFloat(d['Records'])))) {
                    console.log(d, yScale(parseFloat(d['Records'])))
                }
                return yScale(parseFloat(d['Records'])) 
            })
            .attr("r", 3)
            .attr("fill", "#db5757")
    
    // Set title
    svg.append("text")
        .attr("class", "title")
        .attr("x", padding.left + 250)
        .attr("y", padding.top + 20)
        .attr("text-anchor", "middle")
        .text("More Data than Ever has been Compromised by Data Breaches")
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
    let width = 850
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
var plot3 = function(raw_data) {
    let grouped_data = Array.from(d3.rollup(
        raw_data,
        v => d3.sum(v, a => a['Records']),
        d => d['Entity']
    ))
    let sorted_data = grouped_data.sort(function(a, b) { 
        return a[1] < b[1]
    }).slice(0,10)
    let num_records = new Map()
    sorted_data.forEach(x => {
        num_records.set(x[0], x[1])
    })

    // console.log(num_records)

    const width = 1300
    const height = 400
    const padding = {
        'right':75,
        'left':125,
        'top':75,
        'bottom':75
    }
    const axes_padding = {
        'bottom': padding.bottom / 2,
        'left': 100
    }

    // Set up canvas
    let svg = d3.select("#plot3")
        .append("svg")
        .attr("width", width)
        .attr("height", height)

    // Build scales
    var xScale = d3.scaleBand()
        .domain(Array.from(num_records.keys()))
        .range([padding.left, width - padding.right])
        .padding(0.3)
    var yScale = d3.scaleLinear()
        .domain([
            d3.min(num_records, d => d[1]),
            d3.max(num_records, d => d[1])
        ])
        .range([height-padding.bottom, padding.top]);
    
    // Build axis:
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
        .text("Entity");

    svg.append("text")
        .attr("class", "ylabel")
        .attr("text-anchor", "end")
        .attr("x", -1 * height / 4)
        .attr("y", padding.left - axes_padding.left)
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text("Number of Records Compromised");

    // Plot data
    svg.append("g")
    .selectAll()
    .data(num_records)
    .enter()
    .append("rect")
        .attr("x", function(d, i) { 
            return xScale(d[0]); 
        })
        .attr("y", function(d, i) { return yScale(d[1]); })
        .attr("width", function(d) { return xScale.bandwidth(); })
        .attr("height", function(d) { 
            return (height - padding.bottom) - yScale(d[1]);
        })
        .attr("fill", function(d) {

            if (d[1] >= yScale.domain()[1]) { 
                return "#db5757"; 
            }
            else{
                return "#9e9e9e"
            }
        })

    // Set title
    svg.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", padding.top)
        .attr("text-anchor", "middle")
        .text("Yahoo is the Most Insecure Entity")
}
var plot4 = function(raw_data) {
    let valid_data = d3.filter(raw_data, d => d['Method'] != "")
    let group_data = Array.from(d3.rollup(
        valid_data,
        v => d3.sum(v, a => a['Records']),
        // v => v.length,
        d => d['Year'],
        d => d['Method category'].toLowerCase()
    )).sort(function(a, b) { 
        return a[0] > b[0]
    })
    group_data = group_data.map(function(x) {
        let prop_map = new Map()
        // console.log(Array.from(x[1].keys()))
        for (let pair of x[1]) {
            if (d3.sum(x[1].values()) > 0) {
                prop_map.set(pair[0], x[1].get(pair[0]) / d3.sum(x[1].values()))
            }
            else {
                prop_map.set(pair[0], 1)
            }
        }
        
        return [x[0], prop_map]
    })

    let methods = []
    group_data.forEach(function(x) {
        methods.push(Array.from(x[1].keys()))
    })
    console.log(group_data)

    methods = Array.from(new Set(methods.flat()))

    let stacked = d3.stack()
            .keys(methods)
            .value(function (d,key) {
                let val = d[1].get(key)
                if (val == undefined) {
                    return 0
                }
                return val;
            })
            (group_data)

    // console.log(methods)
    // console.log(stacked)

    const width = 900
    const height = 600
    const padding = {
        'right':275,
        'left':75,
        'top':75,
        'bottom':75
    }
    const axes_padding = {
        'bottom': padding.bottom / 2,
        'left': padding.left / 2 + 10
    }
    const size = 12
    const legend_offset = 0-25
    const legend_height = padding.top
    const legend_padding = 5


    // Set up canvas
    let svg = d3.select("#plot4")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
    
    // Build scales
    var xScale = d3.scaleLinear()
        .domain([
            d3.min(group_data, d => parseFloat(d[0])),
            d3.max(group_data, d => parseFloat(d[0]))
        ])
        .range([padding.left, width - padding.right]);
    var yScale = d3.scaleLinear()
        .domain([
            0,
            d3.max(group_data, d => d3.sum(d[1].values()))
        ])
        .range([height - padding.bottom, padding.top]);
    var colorScale = d3.scaleOrdinal()
        .domain(methods)
        // .range(colors)
        .range(d3.quantize(d3.interpolate("#db5757", "#4b4453"), methods.length));
    // var colorScale = cat_colorScale;
    var colorScale = d3.scaleOrdinal()
            .domain([
                "hacked",
                "stolen/lost",
                "rogue contractor/employee", 
                "poor security", 
                "accidentally exposed",
                "unknown"
            ])
            .range([
                "#9e9e9e",
                "#db5757",
                "#DC3522",
                "#2A2C2B",
                "#a9a9a9",
                "#B4B4B5"
            ]);

    // Build axis:
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
        .text("Year");

    svg.append("text")
        .attr("class", "ylabel")
        .attr("text-anchor", "end")
        .attr("x", -1 * height / 6)
        .attr("y", padding.left - axes_padding.left)
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text("Proportion of Data Breaches (where the method was used)");

    // Create Mouseover functions
    // Three function that change the tooltip when user hover / move / leave a cell
    var mouseover = function(d, i) {
        // Tooltip.style("opacity", 1)
        d3.selectAll(".graphArea").style("opacity", .2)
        d3.selectAll(".legend_val").style("opacity", .2)

        d3.select(this)
            .style("stroke", "black")
            .style("opacity", 1)
        key = i.key.replaceAll(/[\s\/]/g, "_")
        d3.selectAll(".legend").selectAll("#dot" + key).style("opacity", 1)
        d3.selectAll(".legend").selectAll("#text" + key).style("opacity", 1)

    }
    var mousemove = function(d,i) {
        // console.log(i.key)
        // Tooltip.text(grp)
    }
    var mouseleave = function(d) {
        // Tooltip.style("opacity", 0)
        d3.selectAll(".graphArea").style("opacity", 1).style("stroke", "none")
        d3.selectAll(".legend_val").style("opacity", 1)
    }

    // Generate streamgraph
    svg.selectAll("stream_graph")
        .data(stacked)
        .enter()
        .append("path")
            .attr("class", "graphArea")
            .style("fill", function(d){return colorScale(d.key)})
            .attr("d", d3.area()
                .x(function(d, i) { 
                    // console.log(d.data[0])
                    return xScale(d.data[0]) 
                })
                .y0(function(d) { return yScale(d[0]) })
                .y1(function(d) { return yScale(d[1]) })
            )
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave)

    // Add legend
    let legend = svg.append("g").attr("class", "legend")
    // legend.append("rect")
    //     .attr("x", width - padding.right - legend_offset - 10)
    //     .attr("y", legend_height - 10)
    //     .attr("width", legend_offset + padding.right)
    //     .attr("height", methods.length * (size+legend_padding) + 20)
    //     .style("fill", "rgb(220, 220, 220)")
    legend.selectAll("legendDots")
        .data(methods)
        .enter()
        .append("rect")
            .attr("class", "legend_val")
            .attr("id", x => "dot" + x.replaceAll(/[\s\/]/g, "_"))
            .attr("x", width - padding.right - legend_offset)
            .attr("y", function(d,i){ return legend_height + i*(size+legend_padding)})
            .attr("width", size)
            .attr("height", size)
            .style("fill", function(d){ return colorScale(d)})
    legend.selectAll("legendText")
        .data(methods)
        .enter()
        .append("text")
            .attr("class", "legend_val")
            .attr("id", x => "text" + x.replaceAll(/[\s\/]/g, "_"))
            .attr("x", width - padding.right - legend_offset + size*1.2)
            .attr("y", function(d,i){ return legend_height + i*(size+legend_padding) + size * 3/4})
            .style("fill", "#71635F")
            .text(function(d){ return d})
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")


    // Set title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", padding.top * 1/2)
        .attr("text-anchor", "middle")
        .text("Poor Security Recently Plays Bigger Role in the Cause of Data Breaches")
}
var plot5 = function(raw_data) {
    let valid_data = d3.filter(raw_data, d => d['Method'] != "")
    // let group_data = d3.group(
    //     valid_data,
    //     d => d['Method']
    // )

    var sumstat = d3.rollup(
        valid_data,
        function(d) {
            q1 = d3.max([0, d3.quantile(d.map(function(g) { return g.Records;}).sort(d3.ascending),.25)])
            median = d3.max([0, d3.quantile(d.map(function(g) { return g.Records;}).sort(d3.ascending),.5)])
            q3 = d3.max([0, d3.quantile(d.map(function(g) { return g.Records;}).sort(d3.ascending),.75)])
            interQuantileRange = q3 - q1
            
            min = d3.max([0, q1 - 1.5 * interQuantileRange])
            max = d3.max([0, q3 + 1.5 * interQuantileRange])

            // min = d3.min(d, a => parseFloat(a.Records))
            // max = d3.max(d, a => parseFloat(a.Records))

            return({q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max})
        },
        d => d['Method category']
    )
    let single_sumstat = d3.filter(sumstat, d => d[1].q1 == d[1].q3)
    let mult_sumstat = d3.filter(sumstat, d => d[1].q1 < d[1].q3)
    
    // console.log('sumstat', sumstat)

    // console.log(group_data)
    const width = 900
    const height = 600
    const padding = {
        'right':75,
        'left':100,
        'top':75,
        'bottom':75
    }
    const axes_padding = {
        'bottom': padding.bottom / 2,
        'left': 90
    }

    // Set up canvas
    let svg = d3.select("#plot5")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
    

    // Build scales
    var xScale = d3.scaleBand()
        .domain(Array.from(sumstat.keys()))
        .range([padding.left, width - padding.right])
        .padding(0.3);
    var yScale = d3.scaleLinear()
        .domain([
            d3.min(sumstat, d => d[1].min),
            d3.max(sumstat, d => d[1].max)
        ])
        .range([height - padding.bottom, padding.top]);
    // var xScale = d3.scaleBand()
    //     .domain(mult_sumstat.map(x => x[0]).flat(2))
    //     .range([padding.left, width - padding.right])
    //     .padding(0.3);
    // var yScale = d3.scaleLinear()
    //     .domain([
    //         d3.min(mult_sumstat, d => d[1].min),
    //         d3.max(mult_sumstat, d => d[1].max)
    //     ])
    //     .range([height - padding.bottom, padding.top]);
    // console.log(yScale.domain())

    // Build axis:
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
        .text("Method");

    svg.append("text")
        .attr("class", "ylabel")
        .attr("text-anchor", "end")
        .attr("x", -1 * height / 3)
        .attr("y", padding.left - axes_padding.left)
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text("Number of Records Compromised");

    // Show the main vertical line
    svg
        .selectAll("vertLines")
        .data(mult_sumstat)
        .enter()
        .append("line")
            .attr("x1", function(d){ return(xScale(d[0])) + xScale.bandwidth() / 2 })
            .attr("x2", function(d){ return(xScale(d[0])) + xScale.bandwidth() / 2 })
            .attr("y1", function(d){ return(yScale(d[1].min))})
            .attr("y2", function(d){ return(yScale(d[1].max))})
            .attr("stroke", "black")
            .style("width", 40)

    // rectangle for the main box
    svg
        .selectAll("boxes")
        .data(mult_sumstat)
        .enter()
        .append("rect")
            .attr("x", function(d){ 
                return(xScale(d[0])) 
            })
            .attr("y", function(d){ 
                return (yScale(d[1].q3)) 
            })
            .attr("height", function(d){ 
                // console.log(d)
                return (yScale(d[1].q1) - yScale(d[1].q3)) 
            })
            .attr("width", xScale.bandwidth() )
            .attr("stroke", "black")
            .style("fill", function(d){
                if (d[0] != "poor security") { return "#9e9e9e"; }
                return "#db5757"
            })

    // Show the median
    svg
        .selectAll("medianLines")
        .data(mult_sumstat)
        .enter()
        .append("line")
            .attr("x1", function(d){ return(xScale(d[0])) })
            .attr("x2", function(d){ return(xScale(d[0]) + xScale.bandwidth()) })
            .attr("y1", function(d){ return(yScale(d[1].median))})
            .attr("y2", function(d){ return(yScale(d[1].median))})
            .attr("stroke", "black")
            .style("width", 80)

    // Show single points
    svg
        .selectAll("singlePts")
        .data(single_sumstat)
        .enter()
        .append("circle")
            .attr("cx", function(d){ return(xScale(d[0])) + xScale.bandwidth() / 2})
            .attr("cy", function(d){ return(yScale(d[1].median))})
            .attr("r", 3)
            .attr("fill", "#db5757")
    
    // Set title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", padding.top * 1/2)
        .attr("text-anchor", "middle")
        .text("Most Data Breaches are caused by Poor Security")
}

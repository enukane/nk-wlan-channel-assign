var cy = cytoscape({
    container: $("#graph"),
    style: [
        {
            selector: "node",
            style: {
                'label': 'data(id)',
            }
        }
    ]
});
console.log(cy)

cy.zoomingEnabled(false)
cy.panningEnabled(false)

cy.add({
    group: 'nodes',
    label: "n0",
    data: {
        weight: 50,
        id: "n0",
    },
    position: {
        x: 500,
        y: 500
    },
    locked: true
})

cy.add({
    group: 'nodes',
    data: {
        id: "n1",
        weight: 50
    },
    position: {
        x: 100,
        y: 100
    },
    locked: true
})

cy.add({
    group: 'nodes',
    data: {
        id: "n2",
        weight: 50
    },
    position: {
        x: 100,
        y: 500
    },
    locked: true
})


cy.add({
    group: "edges",
    data: {
        id: "n0-n1",
        source: "n0",
        target: "n1"
    }
})

var layout = cy.elements().layout({
    name: "random"
});
layout.run()

cy.$("#n0").style({ "background-color": "red" })
cy.$("#n1").style({ "background-color": "blue" })
cy.$("#n2").style({ "background-color": "green" })

cy.$("#n0").position({ x: 0, y: 0 })
cy.$("#n1").position({ x: 100, y: 100 })
cy.$("#n2").position({ x: 100, y: 0 })

console.log("id")
console.log(cy.$("#n0").id())
console.log("pos")
console.log(cy.$("#n0").position())
console.log("neighborhood")
console.log(cy.$("#n0").neighborhood())
console.log("connected-nodes")
let nodes = cy.$("#n0").neighborhood().connectedNodes()
for (let i = 0; i < nodes.length; i++) {
    console.log(nodes[i].id())
}

/* variables */
var __aps = []
var __px2meter = 1

var __channel_color_map = {
    // W52
    36: {color: "firebrick"},
    40: {color: "red"},
    44: {color: "coral"},
    48: {color: "sandybrown"},

    // W53
    52: {color: "darkorange"},
    56: {color: "orange"},
    60: {color: "gold"},
    64: {color: "lemonchiffon"},

    // W56
    100: {color: "olive"},
    104: {color: "yellowgreen"},
    108: {color: "lawngreen"},
    112: {color: "darkseagreen"},
    116: {color: "green"},
    120: {color: "lime"},
    124: {color: "springgreen"},
    128: {color: "turquoise"},
    132: {color: "cyan"},
    136: {color: "dodgerblue"},
    140: {color: "navy"},
    144: {color: "blue"},
}
var __channel_list = Object.keys(__channel_color_map)

/* utilities */

/** graph manipulation */
function renew_graph() {
    cy.reset();
    cy.destroy();
    cy = cytoscape({
        container: $("#graph"),
        style: [
            {
                selector: "node",
                style: {
                    'content': 'data(id)'
                }
            }
        ]
    });
}

function graph_add_ap(x, y, name) {
    cy.add({
        group: 'nodes',
        data: {
            id: name,
            weight: 50
        },
        position: {
            x: x,
            y: y
        },
        locked: true
    })
}

function graph_set_ap_color(name, color) {
    console.log(name, color)
    cy.$("#" + name).style({ "background-color": color })
}

function graph_add_edge_between(apA, apB) {
    let apA_name = apA.name
    let apB_name = apB.name

    cy.add({
        group: "edges",
        data: {
            id: apA_name + "-" + apB_name,
            source: apA_name,
            target: apB_name
        }
    })

}

function graph_get_adjacent_ap(ap_name) {
    let nodes = cy.$("#" + ap_name).neighborhood().connectedNodes() 
    var ary = []
    for (j = 0; j < nodes.length; j++) {
        let cur_node = nodes[j].id()
        if (cur_node == ap_name ) {
            continue
        }
        ary.push(nodes[j].id())
    }

    return ary
}

/** main logic **/
function calc_distance_m(x0, y0, x1, y1, px2meter) {
    return Math.sqrt(Math.pow(Math.abs(x0 - x1) * px2meter, 2) + Math.pow(Math.abs(y0 - y1) * px2meter, 2));
}

function calc_free_space_loss_db(freq_hz, dist_m) {
    speed_of_light_mps = 299792458; // [m / s]
    wave_length = speed_of_light_mps / freq_hz;
    dB = 20 * Math.log10(4 * Math.PI * dist_m / wave_length)
    //los = Math.pow((4 * Math.PI * distM) / waveLength, 2);
    return dB
}

function is_aps_are_adjacent(apA, apB) {
    let power_thresh_dbm = get_power_threshold()
    let apA_power_db = apA.powerdb || 0
    let dist_m = calc_distance_m(apA.x, apA.y, apB.x, apB.y, __px2meter)
    let loss_db = calc_free_space_loss_db(2412 * 1000 * 1000, dist_m)

    console.log(apA_power_db, loss_db, power_thresh_dbm)

    if ((apA_power_db - loss_db) > power_thresh_dbm) {
        return true
    }

    return false
}

function calculate_and_add_edge() {
    for (let i = 0; i < __aps.length; i++) {
        for (j = i; j < __aps.length; j++) {
            if (i == j) {
                continue
            }

            if (is_aps_are_adjacent(__aps[i], __aps[j])) {
                graph_add_edge_between(__aps[i], __aps[j])
            }
        }
    }
}

function get_aps_name() {
    let ary = []
    for (let i = 0; i < __aps.length; i++) {
        ary.push(__aps[i].name)
    }
    return ary
}

function shuffle(array) {
    for (let i = array.length - 1; i >= 0; i--) {
        let rand = Math.floor(Math.random() * (i + 1));
        [array[i], array[rand]] = [array[rand], array[i]]
    }
    return array;
}

function get_neighbors_color_indeces(ap_name, color_map) {
    let neighbor_aps = graph_get_adjacent_ap(ap_name)
    let color_idxs = []
    for (let i = 0; i < neighbor_aps.length; i++) {
        let nbr_name = neighbor_aps[i]
        if (color_map[nbr_name] == undefined) {
            continue
        }

        color_idxs.push(color_map[nbr_name])
    }

    return color_idxs
}

function solve_greedy_algorithm() {
    let color_map = {}
    let aps = get_aps_name()
    aps = shuffle(aps)
    console.log(aps)

    for (let i = 0; i < aps.length; i++) {
        let ap_name = aps[i]
        console.log(ap_name)
        let neighbors_color_idxs = get_neighbors_color_indeces(ap_name, color_map)
        console.log(neighbors_color_idxs)

        for (let idx = 0; idx < 1000; idx++) {
            if (!neighbors_color_idxs.includes(idx)) {
                color_map[ap_name] = idx
                break
            }
        }
        console.log("done")
    }

    return color_map
}

function color_idx_map_to_channel(color_map) {
    let map = {}
    for (let ap_name in color_map) {
        let color_idx = color_map[ap_name]
        let channel = __channel_list[color_idx]

        map[ap_name] = channel
    }

    return map
}


function assign_channel() {
    let solution_map = solve_greedy_algorithm()
    console.log(solution_map)
    let ap2channel_map = color_idx_map_to_channel(solution_map)
    console.log(ap2channel_map)

    /* assign color */
    for (let ap_name in ap2channel_map) {
        graph_set_ap_color(ap_name, __channel_color_map[ap2channel_map[ap_name]].color)
    }

    /* output to text */
    $("#output_channel_assign").val(JSON.stringify(ap2channel_map))
}

function recalculate() {
    console.log("recalculate")

    renew_graph()

    for (let i = 0; i < __aps.length; i++) {
        let ap = __aps[i]
        let ap_x = ap.x
        let ap_y = ap.y
        let ap_name = "ap" + i
        __aps[i].name = ap_name

        graph_add_ap(ap_x, ap_y, ap_name)
    }

    calculate_and_add_edge()

    assign_channel()
}

/* html element */
function get_power_threshold() {
    return parseInt($("#power_thresh").val())
}

/* handlers */

function change_config(e) {
    var file = e.target.files[0]
    console.log("change_config file=", file)

    if (!file.type.match("application/json")) {
        alert("unknown config file type, select json")
        return
    }

    var reader = new FileReader()
    reader.onload = function (e) {
        var config_json = JSON.parse(reader.result)

        if (!config_json.ap || !config_json.px2meter) {
            alert("Irregular config detected: no ap or px2meter")
        }

        __aps = config_json.ap
        __px2meter = config_json.px2meter

        recalculate()
    }
    reader.readAsText(file)
    console.log("hoge")

}

/* main  */
$("#button-config-upload").on("change", function (e) { change_config(e) })
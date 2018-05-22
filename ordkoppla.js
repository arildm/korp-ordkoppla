/**
 * @author Arild Matsson <arild@klavaro.se>
 */

$(document).ready(function () {

    /* TODO
     * - hide new words unless important (what is important?
     * - new words appear at pos of old word
     */

    var url = 'https://ws.spraakbanken.gu.se/ws/korp/v7/';
    var url_relations = url + 'relations';

    var nodes;
    var edges;
    var graph;
    var graph_dict = {};
    var count = 0;
    var start_nodes = [];

    var network_options = {
        nodes: {
            shape: 'ellipse',
            color: {background: 'white', border: 'darkgray'}
        },
        groups: {
            normal: {
                color: {background: 'white', border: 'darkgray'}
            },
            loading: {
                color: {background: 'lightblue', border: 'blue'}
            }
        },
        physics: {
            maxVelocity: 5,
            barnesHut: {
                avoidOverlap: 0.4,
                springLength: 0,
                centralGravity: 0,
                springConstant: 0.1
            }
        },
        interaction: {
            hover: true
        }
    };

    function init() {
        nodes = new vis.DataSet([]);
        edges = new vis.DataSet([]);
        graph = new vis.Network($('#ordkoppla').get(0), {
            nodes: nodes,
            edges: edges
        }, network_options);
        graph.on('selectNode', function (params) {
            params.nodes.forEach(function (id) {
                search(nodes.get(id).label)
            });
        }).on('hoverNode', function (params) {
            nodes.update({id: params.node, physics: false});
        }).on('blurNode', function (params) {
            nodes.update({id: params.node, physics: !start_nodes.includes(params.node)});
            graph.unselectAll();
        });
    }

    function start(words) {
        $.each(words, function (i, word) {
            x = (i - words.length / 2 + .5) * $('#ordkoppla').width() / words.length;
            var node = addWordNode(word, {'x': x, 'y': 0,
                'physics': false,
                'font': {'size': 24}
            });
            start_nodes.push(node.id);
            search(word);
        });
    }

    function search(word) {
        nodes.update({id: graph_dict[word], group: 'loading'});
        $.ajax({
            url: url_relations,
            data: {corpus: 'WIKIPEDIA-SV', word: word},
            dataType: "json",
            success: function (json) {
                if (json.relations !== undefined) {
                    relations(word, json);
                }
            },
            complete: function () {
                nodes.update({id: graph_dict[word], group: 'normal'});
            }
        });
    }

    function relations(from, json) {
        // Finding the direction of a link.
        function dep_or_head(item) {
            return item.head === from ? 'dep' : 'head';
        }

        // Sort by frequency, filter by POS, select top few.
        allowed_pos = ['NN', 'VB'];
        var selection = json.relations.sort(function (a, b) {
            return b.freq - a.freq;
        });
        selection = selection.filter(function(item) {
            return allowed_pos.includes(item[dep_or_head(item) + 'pos']);
        }).slice(0, 8);

        // Add each link to the graph.
        selection.forEach(function (item) {
            // The from word can be either head or dep; add the other one.
            var to = clean(item[dep_or_head(item)]);
            addWord(from, to, Math.log(item.freq));
        });
    }

    function addWordNode(word, options) {
        if (graph_dict[word] === undefined) {
            nodes.add($.extend({id: ++count, label: word}, options));
            graph_dict[word] = count;
        }
        return nodes.get(graph_dict[word]);
    }

    function addWord(from, to, weight) {
        // Add node if new.
        addWordNode(to);
        // Add or thicken edge.
        addEdge(from, to, weight);
    }

    function addEdge(from, to, weight) {
        // Edge ID deterministically created from node IDs.
        var edge_id = [graph_dict[from], graph_dict[to]].sort(function (a, b) {
            return a - b
        }).join('-');
        if (!edges.get(edge_id)) {
            edges.add({
                id: edge_id,
                from: graph_dict[from],
                to: graph_dict[to],
                value: weight,
                length: 1 / weight
            });
        }
    }

    function clean(lemgram) {
        return lemgram.replace(/\..*/, '');
    }

    $('#ordkoppla-controls form').submit(function (e) {
        e.preventDefault();
    });
    $('#ordkoppla-submit').click(function () {
        init();
        start([$('#word1').val(), $('#word2').val()]);
    });

});

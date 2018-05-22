/**
 * @author Arild Matsson <arild@klavaro.se>
 */

$(document).ready(function () {

    /* TODO
     * - interactive edges: show relations
     */

    var url = 'https://ws.spraakbanken.gu.se/ws/korp/v7/';
    var url_relations = url + 'relations';

    var nodes;
    var edges;
    var graph;
    var graph_dict;
    var count;
    var start_nodes;

    var allowed_pos = ['NN', 'VB'];
    var network_options = {
        nodes: {
            shape: 'ellipse',
            chosen: false,
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
                centralGravity: 0.2
            }
        },
        interaction: {hover: true}
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
                search(nodes.get(id).label);
            });
        }).on('hoverNode', function (params) {
            nodes.update({id: params.node, physics: false});
        }).on('blurNode', function (params) {
            nodes.update({
                id: params.node,
                physics: !start_nodes.includes(params.node)
            });
            graph.unselectAll();
        });
        graph_dict = {};
        count = 0;
        start_nodes = [];
    }

    function start(words) {
        $.each(words, function (i, word) {
            var node = addWordNode(word, {
                'x': 0, 'y': 0,
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
        var items = json.relations.map(function (item) {
            var part = item.head === from ? 'dep' : 'head';
            return {
                word: clean(item[part]),
                pos: item[part + 'pos'],
                item: item
            };
        });

        // Sort by frequency, filter by POS.
        items = items.sort(function (a, b) {
            return b.item.freq - a.item.freq;
        }).filter(function (item) {
            return allowed_pos.includes(item.pos);
        });

        // Add a few new words to the graph.
        var added = 0;
        items.forEach(function (item) {
            if (added < 6 && !graph_dict.hasOwnProperty(item.word)) {
                var xy = graph.getPositions(graph_dict[from])[graph_dict[from]];
                addWordNode(item.word, xy);
                added++;
            }
        });

        // Add links to the graph.
        items.forEach(function (item) {
            if (graph_dict.hasOwnProperty(item.word)) {
                addEdge(from, item.word, Math.log(item.item.freq));
            }
        });
    }

    function addWordNode(word, options) {
        if (graph_dict[word] === undefined) {
            nodes.add($.extend({id: ++count, label: word}, options));
            graph_dict[word] = count;
        }
        return nodes.get(graph_dict[word]);
    }

    function addEdge(from, to, weight) {
        var new_edge = {
            from: graph_dict[from],
            to: graph_dict[to],
            value: weight,
            length: 1 / weight
        };
        var edge_search = edges.get({
            filter: function (item) {
                return item.from == new_edge.from && item.to == new_edge.to;
            }
        });
        var edge_reverse_search = edges.get({
            filter: function (item) {
                return item.from == new_edge.to && item.to == new_edge.from;
            }
        });
        if (!edge_search.length) {
            if (edge_reverse_search.length) {
                edge_reverse_search.forEach(function (edge) {
                    edge.value = Math.log(Math.exp(edge.value) + Math.exp(weight));
                    edges.update(edge);
                });
            }
            else {
                edges.add(new_edge);
            }
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
        start([$('#word1').val()]);
    });

});

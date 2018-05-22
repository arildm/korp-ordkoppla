/**
 * @author Arild Matsson <arild@klavaro.se>
 */

$(document).ready(function () {

    /* TODO
     * - interactive edges: show relations
     * - configurable settings
     * - styled controls form
     */

    /**
     * Constants.
     */
    const url = 'https://ws.spraakbanken.gu.se/ws/korp/v7/';
    const url_relations = url + 'relations';

    /**
     * Configuration.
     */
    const allowed_pos = ['NN', 'VB'];
    const batch_size = 6;
    const corpus = 'WIKIPEDIA-SV';
    const network_options = {
        nodes: {
            chosen: false,
            group: 'normal'
        },
        groups: {
            normal: {
                color: {background: 'white', border: 'darkgray'}
            },
            loading: {
                color: {background: 'lightskyblue', border: 'dodgerblue'}
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

    /**
     * State variables.
     */
    var nodes;
    var edges;
    var graph;
    var graph_dict;
    var count;
    var start_nodes;

    /**
     * Initialize network graph.
     */
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

    /**
     * Enter start words to the graph.
     */
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

    /**
     * Perform word picture API call for a word.
     */
    function search(word) {
        nodes.update({id: graph_dict[word], group: 'loading'});
        $.ajax({
            url: url_relations,
            data: {corpus: corpus, word: word},
            dataType: 'json',
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

    /**
     * Handle the result of a word picture API call.
     */
    function relations(from, json) {
        // Either "head" or "dep" is interesting. Transform items to be easier to handle.
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
            if (added < batch_size && !graph_dict.hasOwnProperty(item.word)) {
                var xy = graph.getPositions(graph_dict[from])[graph_dict[from]];
                addWordNode(item.word, xy);
                added++;
            }
        });

        // Add links to the graph. Not just for the few nodes added now, but
        // also in case the from-word has a link to an already existing word.
        items.forEach(function (item) {
            if (graph_dict.hasOwnProperty(item.word)) {
                addEdge(from, item.word);
            }
        });
    }

    /**
     * Add a word to the graph, if it does not already exist.
     */
    function addWordNode(word, options) {
        if (graph_dict[word] === undefined) {
            nodes.add($.extend({id: ++count, label: word}, options));
            graph_dict[word] = count;
        }
        return nodes.get(graph_dict[word]);
    }

    /**
     * Add an edge between two words, if it does not already exist.
     */
    function addEdge(from, to) {
        // Edge ID deterministically created from node IDs.
        var edge_id = [graph_dict[from], graph_dict[to]].sort().join('-');
        if (!edges.get(edge_id)) {
            edges.add({
                id: edge_id,
                from: graph_dict[from],
                to: graph_dict[to]
            });
        }
    }

    /**
     * Simplify a lemgram to a word.
     */
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

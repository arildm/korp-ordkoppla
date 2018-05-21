/**
 * @author Arild Matsson <arild@klavaro.se>
 */

$(document).ready(function () {

    var url = 'https://ws.spraakbanken.gu.se/ws/korp/v7/';
    var url_relations = url + 'relations';

    var nodes;
    var edges;
    var graph;
    var graph_dict;
    var count;
    var iterated;

    function init() {
        nodes = new vis.DataSet([]);
        edges = new vis.DataSet([]);
        graph = new vis.Network($('#ordkoppla').get(0), {
            nodes: nodes,
            edges: edges
        }, {
            'nodes': {
                'shape': 'ellipse',
                'color': {'background': 'white', 'border': 'darkgray'}
            },
            'groups': {
                'start': {
                    'shape': 'text',
                    'physics': false,
                    'color': {'background': 'lightgray', 'border': 'darkgray'},
                    'font': {'size': 24}
                }
            },
            'physics': {
                'maxVelocity': 5,
                'barnesHut': {
                    'avoidOverlap': 0.4,
                    'springLength': 0,
                    'centralGravity': 0,
                    'springConstant': 0.1
                }
            }
        });
        graph_dict = {};
        count = 0;
        iterated = [];
    }

    function start(words) {
        $.each(words, function (i, word) {
            x = (i - words.length / 2 + .5) * $('#ordkoppla').width() / words.length;
            addWordNode(word, {
                'group': 'start',
                'x': x,
                'y': 0,
            });
            search(word);
        });
    }

    function search(word) {
        $.ajax({
            url: url_relations,
            data: {corpus: 'WIKIPEDIA-SV', word: word},
            dataType: "json",
            success: function (json) {
                if (json.relations !== undefined) {
                    relations(word, json);
                }
            }
        });
    }

    function relations(from, json) {
        // Select N most frequent links.
        var top_links = json.relations.sort(function (a, b) {
            return b.freq - a.freq;
        }).slice(0, 8);
        // Add each link to the graph.
        $.each(top_links, function () {
            // The from word can be either head or dep; add the other one.
            var to = (clean(this.head) === from) ? clean(this.dep) : clean(this.head);
            addWord(from, to);
        });
        iterated.push(from);
    }

    function iterate() {
        for (var word in graph_dict) {
            if (!iterated.includes(word)) {
                search(word);
            }
        }
    }

    function addWordNode(word, options) {
        if (graph_dict[word] === undefined) {
            nodes.add($.extend({id: ++count, label: word}, options));
            graph_dict[word] = count;
        }
        return nodes.get(graph_dict[word]);
    }

    function addWord(from, to) {
        // Add node if new.
        addWordNode(to);
        // Add or thicken edge.
        addEdge(from, to);
    }

    function addEdge(from, to) {
        // Edge ID deterministically created from node IDs.
        var edge_id = [graph_dict[from], graph_dict[to]].sort(function (a, b) {
            return a - b
        }).join('-');
        if (edge = edges.get(edge_id)) {
            edge.value += 1;
            edge.length *= 0.8;
            return edges.update(edge);
        }
        return edges.add({
            id: edge_id,
            from: graph_dict[from],
            to: graph_dict[to],
            value: 1,
            length: 1
        });
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
    }).click();
    $('#ordkoppla-iterate').click(function () {
        iterate();
    });

});

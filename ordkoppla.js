/**
 * @author Arild Matsson <arild@klavaro.se>
 */

$(document).ready(function() {

    var url = 'https://ws.spraakbanken.gu.se/ws/korp/v7/';
    var url_relations = url + 'relations';

    var graph_nodes = new vis.DataSet([]);
    var graph_edges = new vis.DataSet([]);
    var graph = new vis.Network($('#ordkoppla').get(0), {
        nodes: graph_nodes,
        edges: graph_edges
    }, {});
    var graph_dict = {};
    var count = 0;
    var iterated = [];

    function update(word) {
        word = clean(word);
        addWord(null, word);
        $.ajax({
            url: url_relations,
            data: {corpus: 'WIKIPEDIA-SV', word: word},
            dataType: "json",
            success: function(json) {
                if (json.relations !== undefined) {
                    relations(word, json);
                }
            }
        });
    }

    function relations(from, json) {
        // Select N most frequent links.
        var crop = json.relations.sort(function(a, b) {
            return b.freq - a.freq;
        }).slice(0, 8);
        $.each(crop, function() {
            var to = (clean(this.head) === from) ? clean(this.dep) : clean(this.head);
            addWord(from, to);
        });
        iterated.push(from);
    }

    function iterate() {
        for (word in graph_dict) {
            if (!iterated.includes(word)) {
                update(word);
            }
        }
    }

    function addWord(from, to) {
        // Add node if new.
        if (graph_dict[to] === undefined) {
            graph_nodes.add({id: ++count, label: to});
            graph_dict[to] = count;
        }
        // Add or thicken edge.
        if (!from) {
            return;
        }
        var edge_id = [graph_dict[from], graph_dict[to]].sort(function(a, b) {return a - b}).join('-');
        var edge = graph_edges.get(edge_id);
        if (!edge) {
            graph_edges.add({id: edge_id, from: graph_dict[from], to: graph_dict[to], value: 1, length: 1});
        }
        else {
            // graph_edges.update({id: edge_id, value: edge.value + 1, length: edge.length * .8});
            edge.value += 1;
            edge.length *= 0.8;
            graph_edges.update(edge);
        }
    }

    function clean(lemgram) {
        return lemgram.replace(/\..*/, '');
    }

    $('#ordkoppla-controls form').submit(function(e) {
        e.preventDefault();
    });
    $('#ordkoppla-submit').click(function() {
        update($('#word1').val());
        update($('#word2').val());
    }).click();
    $('#ordkoppla-iterate').click(function() {
        iterate();
    });

});

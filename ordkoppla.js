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
        addWord(word);
        $.ajax({
            url: url_relations,
            data: {corpus: 'WIKIPEDIA-SV', word: word},
            dataType: "json",
            success: function(json) {
                relations(word, json);
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
            addWordEdge(from, to);
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

    function addWord(word) {
        if (graph_dict[word] === undefined) {
            graph_nodes.add({id: ++count, label: word});
            graph_dict[word] = count;
        }
        return graph_dict[word];
    }

    function addWordEdge(from, to) {
        if (to === from) {
            return;
        }
        console.log(from + ' ' + to);
        console.log(graph_edges.get());
        edges = graph_edges.get({
            filter: function(item) {
                return (item.from === from && item.to === to)
                    || (item.from === to && item.to === from);
            }
        });
        console.log(edges);
        if (edges.length) {
            edges[0].width++;
        }
        else {
            graph_edges.add({from: addWord(from), to: addWord(to), width: 1});
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

/**
 * @author Arild Matsson <arild@klavaro.se>
 */


/* TODO
 * - interactive edges: show relations
 * - configurable settings
 * - styled controls form
 * - Distinguish by POS
 */

function Ordkoppla(element, config) {
    /**
     * Configuration.
     */
    this.config = $.extend({
        api_url: 'https://ws.spraakbanken.gu.se/ws/korp/v7/',
        allowed_pos: ['NN', 'VB'],
        batch_size: 6,
        corpus: 'WIKIPEDIA-SV',
        network_options: {
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
        }
    }, config);

    /**
     * Initialize network graph.
     */
    this.nodes = new vis.DataSet([]);
    this.edges = new vis.DataSet([]);
    this.graph = new vis.Network(element, {
        nodes: this.nodes,
        edges: this.edges
    }, this.config.network_options);
    this.graph.on('selectNode', (function (params) {
        params.nodes.forEach((function (id) {
            this.search(this.nodes.get(id).label);
        }).bind(this));
    }).bind(this)).on('hoverNode', (function (params) {
        this.nodes.update({id: params.node, physics: false});
    }).bind(this)).on('blurNode', (function (params) {
        this.nodes.update({
            id: params.node,
            physics: !this.start_nodes.includes(params.node)
        });
        this.graph.unselectAll();
    }).bind(this));
    this.graph_dict = {};
    this.count = 0;
    this.start_nodes = [];
}

Ordkoppla.prototype = {
    /**
     * Enter start words to the graph.
     */
    start: function (words) {
        $.each(words, (function (i, word) {
            var node = this.addWordNode(word, {
                'x': 0, 'y': 0,
                'physics': false,
                'font': {'size': 24}
            });
            this.start_nodes.push(node.id);
            this.search(word);
        }).bind(this));
    },

    /**
     * Add a word to the graph, if it does not already exist.
     */
    addWordNode: function (word, options) {
        if (this.graph_dict[word] === undefined) {
            this.nodes.add($.extend({id: ++this.count, label: word}, options));
            this.graph_dict[word] = this.count;
        }
        return this.nodes.get(this.graph_dict[word]);
    },

    /**
     * Perform word picture API call for a word.
     */
    search: function (word) {
        this.nodes.update({id: this.graph_dict[word], group: 'loading'});
        $.ajax({
            url: this.config.api_url + 'relations',
            data: {corpus: this.config.corpus, word: word},
            dataType: 'json',
            success: (function (json) {
                if (json.relations !== undefined) {
                    this.relations(word, json);
                }
            }).bind(this),
            complete: (function () {
                this.nodes.update({id: this.graph_dict[word], group: 'normal'});
            }).bind(this)
        });
    },

    /**
     * Handle the result of a word picture API call.
     */
    relations: function (from, json) {
        // Either "head" or "dep" is interesting. Transform items to be easier to handle.
        var items = json.relations.map((function (item) {
            var part = item.head === from ? 'dep' : 'head';
            return {
                word: this.clean(item[part]),
                pos: item[part + 'pos'],
                item: item
            };
        }).bind(this));

        // Sort by frequency, filter by POS.
        items = items.sort(function (a, b) {
            return b.item.freq - a.item.freq;
        }).filter((function (item) {
            return this.config.allowed_pos.includes(item.pos);
        }).bind(this));

        // Add a few new words to the graph.
        var added = 0;
        items.forEach((function (item) {
            if (added < this.config.batch_size && !this.graph_dict.hasOwnProperty(item.word)) {
                var xy = this.graph.getPositions(this.graph_dict[from])[this.graph_dict[from]];
                this.addWordNode(item.word, xy);
                added++;
            }
        }).bind(this));

        // Add links to the graph. Not just for the few nodes added now, but
        // also in case the from-word has a link to an already existing word.
        items.forEach((function (item) {
            if (this.graph_dict.hasOwnProperty(item.word)) {
                this.addEdge(from, item.word);
            }
        }).bind(this));
    },

    /**
     * Add an edge between two words, if it does not already exist.
     */
    addEdge: function (from, to) {
        // Edge ID deterministically created from node IDs.
        var edge_id = [this.graph_dict[from], this.graph_dict[to]].sort().join('-');
        if (!this.edges.get(edge_id)) {
            this.edges.add({
                id: edge_id,
                from: this.graph_dict[from],
                to: this.graph_dict[to]
            });
        }
    },

    /**
     * Simplify a lemgram to a word.
     */
    clean: function (lemgram) {
        return lemgram.replace(/\..*/, '');
    }
};

var app;

$(document).ready(function () {

    $('#ordkoppla-controls form').submit(function (e) {
        e.preventDefault();
    });

    $('#ordkoppla-submit').click(function () {
        app = new Ordkoppla($('#ordkoppla').get(0));
        app.start([$('#word1').val()]);
    });

});

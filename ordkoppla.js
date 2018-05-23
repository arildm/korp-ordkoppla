/**
 * @author Arild Matsson <arild@klavaro.se>
 */

function Ordkoppla(element, config) {
    /**
     * Configuration.
     */
    this.config = $.extend(true, {
        api_url: 'https://ws.spraakbanken.gu.se/ws/korp/v7/',
        allowed_pos: ['nn', 'vb', 'av'],
        batch_size: 5,
        corpus: ['WIKIPEDIA-SV'],
        network_options: {
            nodes: {
                chosen: false,
            },
            groups: {
                vb: {color: '#7dcea0'},
                nn: {color: '#f5cba7'},
                av: {color: '#f9e79f'},
                loading: {color: '#d6eaf8'}
            },
            physics: {
                maxVelocity: 5,
                barnesHut: {
                    avoidOverlap: 0.2,
                    springLength: 0.5,
                    centralGravity: 0.3
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
            this.search(this.nodes.get(id).lemgram, 'lemgram');
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
                // 'physics': false,
                // 'font': {'size': 24}
            });
            this.start_nodes.push(node.id);
            this.search(word);
        }).bind(this));
    },

    /**
     * Add a word to the graph, if it does not already exist.
     */
    addWordNode: function (lemgram, options) {
        if (this.graph_dict[lemgram] === undefined) {
            this.nodes.add($.extend({
                id: ++this.count,
                label: this.clean(lemgram),
                lemgram: lemgram,
                group: this.pos(lemgram)
            }, options));
            this.graph_dict[lemgram] = this.count;
        }
        return this.nodes.get(this.graph_dict[lemgram]);
    },

    /**
     * Perform word picture API call for a word.
     */
    search: function (lemgram) {
        this.nodes.update({id: this.graph_dict[lemgram], group: 'loading'});
        $.ajax({
            url: this.config.api_url + 'relations',
            data: {
                corpus: this.config.corpus.join(','),
                type: 'lemgram',
                word: lemgram
            },
            dataType: 'json',
            success: (function (json) {
                if (json.relations !== undefined) {
                    this.relations(lemgram, json);
                }
            }).bind(this),
            complete: (function () {
                this.nodes.update({
                    id: this.graph_dict[lemgram],
                    group: this.pos(lemgram)
                });
            }).bind(this)
        });
    },

    /**
     * Handle the result of a word picture API call.
     */
    relations: function (from, json) {
        // Either "head" or "dep" is interesting. Transform items to be easier to handle.
        var items = json.relations.map(function (item) {
            return {
                lemgram: item[(item.head === from ? 'dep' : 'head')],
                item: item
            };
        });

        // Sort by frequency, filter by POS.
        items = items.sort(function (a, b) {
            return b.item.freq - a.item.freq;
        }).filter((function (item) {
            return this.config.allowed_pos.includes(this.pos(item.lemgram));
        }).bind(this));

        // Add a few new words to the graph.
        var added = 0;
        items.forEach((function (item) {
            if (added < this.config.batch_size && !this.graph_dict.hasOwnProperty(item.lemgram)) {
                var xy = this.graph.getPositions(this.graph_dict[from])[this.graph_dict[from]];
                this.addWordNode(item.lemgram, xy);
                added++;
            }
        }).bind(this));

        // Add links to the graph. Not just for the few nodes added now, but
        // also in case the from-word has a link to an already existing word.
        items.forEach((function (item) {
            if (this.graph_dict.hasOwnProperty(item.lemgram)) {
                this.addEdge(from, item.lemgram);
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
        return lemgram.split('.')[0].replace('_', ' ');
    },

    /**
     * Get POS of a lemgram, or null if it's a normal word.
     */
    pos: function (lemgram) {
        var split = lemgram.split('.');
        return split.length > 2 ? split[2] : null;
    }
};

/**
 * @author Arild Matsson <arild@klavaro.se>
 */

/* TODO
 * - interactive edges: show relations
 * - easier ui
 */

var app;

$(document).ready(function () {

    /**
     * A small collection of lemgrams.
     */
    var sample_lemgrams = [
        'tävla..vb.1', 'krokodil..nn.1', 'lakrits..nn.1', 'oändlig..av.1',
        'lukta..vb.1', 'lukta..vb.2', 'stark..av.1', 'regering..nn.1',
        'ge..vb.1', 'sträng..av.1', 'sträng..nn.1', 'trampa..vb.1',
        'företag..nn.1', 'folk..nn.1', 'slut..av.1', 'slut..nn.1', 'bo..vb.1'
    ];

    var corpora = {
        'WIKIPEDIA-SV': 'Wikipedia',
        'TWITTER': 'Twitter',
        'ROMI': 'Romaner I',
        'ROMII': 'Romaner II'
    };

    $front = $('<div id="front" class="panel">')
        .append($('<h1>').text('Vilka ord förekommer ofta tillsammans?'))
        .append($('<p>').text('Välj ett ord för att utforska dess "grannar".'))
        .append($('<div class="cloud">').append(sample_lemgrams.map(function (lemgram) {
                return $('<button>')
                    .addClass('pos-' + Ordkoppla.prototype.pos(lemgram))
                    .text(Ordkoppla.prototype.clean(lemgram))
                    .click(function () {
                        start(lemgram)
                    });
        })))
        .append($('<form id="config">').text('Sök i: ').append(Object.keys(corpora).map(function (code) {
            return $('<span>')
                .append($('<input type="checkbox">').attr({
                    id: 'corpus-' + code,
                    name: 'corpus',
                    value: code,
                    checked: 'checked'
                }))
                .append($('<label>').attr('for', 'corpus-' + code).text(corpora[code]));
        })));

    $help = $('<div id="help" class="panel">')
        .append($('<div>').html('\
        <p>Strecken mellan ordbubblorna visar att orden ofta förekommer tillsammans i en <em>dependensrelation</em>.\
        Till exempel förekommer "ge" ofta med "möjlighet" i uttryck som "det <em>gav</em> dem <em>möjligheten</em> att...".</p>\
        <p><img src="edges.png"></p>\
        <p>Klicka på en bubbla för att ladda fler "grannar". En bubbla blir blå när den laddar, och färgas sedan efter ordklass: verb är gröna, substantiv röda och adjektiv gula.</p>\
        <p>Om du vill börja om från början kan du helt enkelt ladda om sidan.</p>\
        '))
        .append($('<button>').text('Göm förklaring')
            .click(function () { toggleHelp(false) }))
        .hide();

    $panel = $('<div id="panel">')
        .append($front)
        .append($help);

    $helpToggle = $('<div id="help-toggle">')
        .append($('<a href="#">').text('Förklaring')
            .click(function () { toggleHelp(true) }))
        .hide();

    $canvas = $('<div id="canvas">');

    $footer = $('<div id="footer">').html('Av <a href="http://arild.klavaro.se/">Arild</a> ' +
        'med hjälp av <a href="https://ws.spraakbanken.gu.se/ws/korp/v7/#basic-information" target="_blank">Korp API</a> ' +
        'och <a href="http://visjs.org/" target="_blank">vis.js</a>');

    $('#ordkoppla')
        .append($panel)
        .append($helpToggle)
        .append($canvas)
        .append($footer);

    function start(lemgram) {
        var config = {corpus: []}
        $('form#config').serializeArray().forEach(function (item) {
            config[item.name].push(item.value);
        });

        app = new Ordkoppla($canvas.get(0), config);
        app.start([lemgram]);

        $front.hide();
        $help.show();
    }

    function toggleHelp(on) {
        $panel.toggle(on);
        $helpToggle.toggle(!on);
    }

    $('#controls form').submit(function (e) {
        e.preventDefault();
    });

    $('#ordkoppla-search').click(function () {
        var config = formConfig($(this).closest('form'));
        app = new Ordkoppla($('#ordkoppla').get(0), config);
        app.start([$('#word1').val()]);
    });

    $('#ordkoppla-random').click(function () {
        var config = formConfig($(this).closest('form'));
        app = new Ordkoppla($('#ordkoppla').get(0), config);
        i = Math.floor(Math.random() * sample_lemgrams.length);
        app.start([sample_lemgrams[i]]);
    });

    /**
     * Extract config from controls form.
     */
    function formConfig(form) {
        var config = {};
        $(form).serializeArray().forEach(function (item) {
            var match = item.name.match(/^(.+)\[(.+)]$/);
            if (match && ([_, key, val] = match)) {
                if (config[key] === undefined) {
                    config[key] = [];
                }
                config[key].push(val);
            }
        });
        return config;
    }

    /**
     * Tiny configurable toggle support.
     */
    $('.togglable').each(function () {
        var $togglable = $(this);
        var config = $.extend({
            show: 'Show',
            hide: 'Hide'
        }, $togglable.data('togglable'));
        var $toggle = $('<a href="#" class="toggle">').text(config.hide).click(function (event) {
            event.preventDefault();
            $togglable.slideToggle({complete: function() {
                $toggle.text(!$togglable.is(':visible') ? config.show : config.hide);
            }});
        });
        $('<div>').attr('id', $togglable.attr('id') + '_toggle')
            .append($toggle)
            .insertAfter($togglable);
    })

});

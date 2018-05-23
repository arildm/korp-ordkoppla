/**
 * @author Arild Matsson <arild@klavaro.se>
 */

/* TODO
 * - interactive edges: show relations
 * - easier ui
 */

var app;

$(document).ready(function () {

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
     * A small collection of lemgrams.
     */
    var sample_lemgrams = [
        'tävla..vb.1', 'krokodil..nn.1', 'lakrits..nn.1', 'oändlig..av.1',
        'lukta..vb.1', 'lukta..vb.2', 'ge..vb.1', 'sträng..av.1', 'sträng..nn.1'
    ];

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

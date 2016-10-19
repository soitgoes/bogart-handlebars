var _ = require('underscore');

var Handlebars = require('handlebars');
var layouts = require('handlebars-layouts');

var handlebarsLoadTree = require('handlebars-load-tree');

function BogartHandlebarsMiddleware(viewsPath, options, handlebars) {
  if (!viewsPath) {
    throw new Error('bogart-handlebars missing required parameter `viewsPath`');
  }
  if (handlebars){
    Handlebars = handlebars;
  }

  layouts.register(Handlebars);
  
  // Add convence helpers for content calls 
  Handlebars.registerHelper('replace', function(name, options) {
    return Handlebars.helpers['content'].call(this, name, _.extend(options, { hash: { mode: 'replace' } } ));
  });
  Handlebars.registerHelper('append', function(name, options) {
    return Handlebars.helpers['content'].call(this, name, _.extend(options, { hash: { mode: 'append' } } ));
  });
  Handlebars.registerHelper('prepend', function(name, options) {
    return Handlebars.helpers['content'].call(this, name, _.extend(options, { hash: { mode: 'prepend' } } ));
  });

  options = _.defaults(options || {}, {
    watch: 1000
  });

  var views = handlebarsLoadTree(Handlebars, viewsPath, options);

  var onCreateLocalsCallbacks = [];

  var callback = function bogartHandlebarsCallback(injector, next) {
    var localsDefaults = {};

    return views.then(function (views) {
      injector.value('views', views);

      onCreateLocalsCallbacks.forEach(function (cb) {
        var locals = injector.invoke(cb);
        localsDefaults = _.extend({}, localsDefaults, locals);
      });

      injector.factory('respond', function (views, locals) {
        var iLocals = locals;

        return function (view, locals, opts) {
          opts = opts || {};

          if (!_.isFunction(view)) {
            throw new Error('respond(view, locals, opts) expected view to be a function, '+typeof(view));
          }
          locals = _.extend({}, localsDefaults, iLocals, locals);

          var body = view(locals);

          return _.extend({
            status: 200,
            body: body,
            headers: {
                "content-type": "text/html",
		"content-length": Buffer.byteLength(body)
            }
          }, opts);
        };
      });

      return next();
    });
  };

  callback.onCreateLocals = function (cb) {
    onCreateLocalsCallbacks.push(cb);
    return callback;
  };

  return callback;
}

module.exports = BogartHandlebarsMiddleware;

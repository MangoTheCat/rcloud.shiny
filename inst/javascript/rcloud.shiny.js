((function() {

var sockets_ = [];
var ocaps_ = null;
var SHINY_HTML_LOCATION = 'shared.R/rcloud.shiny/shiny.html';
var debugEnabled = false;

function debug(msg, arg) {
  if(debugEnabled) {
    console.debug(msg, arg);
  }
}

function fakeWebSocket() {
    var fws = {
        readyState: false,
        send: function(msg) {
            debug("client to Shiny: ", arguments);
            ocaps_.sendAsync(id, msg).then(function(response) {
                debug("Shiny response: ", response);
            });
        }
    };
    var id = sockets_.length;
    sockets_.push(fws);
    fws.id = id;
    ocaps_.connectAsync(id).then(function() {
        fws.readyState = true;
        fws.onopen();
    });
    return fws;
}

function isMini() {
  return window.document.location.pathname.endsWith(SHINY_HTML_LOCATION);
}

return {
    init: function(ocaps, k) {
        if(isMini()) {
          ocaps_ = RCloud.promisify_paths(ocaps, [["connect"], ["send"]]);
          window.Shiny = {
            createSocket: function() {
                return fakeWebSocket();
            }
          };
        } else {
          RCloud.UI.share_button.add({ 
                  'shiny.html': {
                      sort: 4000,
                      page: SHINY_HTML_LOCATION
                  }
          });
        }
        k();
    },
    on_message: function(id, msg, k) {
        debug("Shiny to client: ", msg);
        if(_.isArray(msg)) {
            // looks like shiny switched json libraries and now they're sending objects
            // instead of pseudo-scalars
            if(msg.length > 1) console.warning('rcloud.shiny: whoops, more than one element?');
            msg = msg[0];
        }
        msg = msg.replace(/shared\//g,'shared.R/shiny/shared/');
        sockets_[0].onmessage({data:msg});
        k();
    }
};
})()) /*jshint -W033 */ // this is an expression not a statement

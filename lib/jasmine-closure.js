var readFixtures = function() {
  return jasmine.getFixtures().proxyCallTo_('read', arguments);
};

var preloadFixtures = function() {
  jasmine.getFixtures().proxyCallTo_('preload', arguments);
};

var loadFixtures = function() {
  jasmine.getFixtures().proxyCallTo_('load', arguments);
};

var setFixtures = function(html) {
  jasmine.getFixtures().set(html);
};

var sandbox = function(attributes) {
  return jasmine.getFixtures().sandbox(attributes);
};

var spyOnEvent = function(selector, eventName) {
  jasmine.Closure.events.spyOn(selector, eventName);
}

jasmine.getFixtures = function() {
  return jasmine.currentFixtures_ = jasmine.currentFixtures_ || new jasmine.Fixtures();
};

jasmine.Fixtures = function() {
  this.containerId = 'jasmine-fixtures';
  this.fixturesCache_ = {};
  this.fixturesPath = 'spec/javascripts/fixtures';
};

jasmine.Fixtures.prototype.set = function(html) {
  this.cleanUp();
  this.createContainer_(html);
};

jasmine.Fixtures.prototype.preload = function() {
  this.read.apply(this, arguments);
};

jasmine.Fixtures.prototype.load = function() {
  this.cleanUp();
  this.createContainer_(this.read.apply(this, arguments));
};

jasmine.Fixtures.prototype.read = function() {
  var htmlChunks = [];

  var fixtureUrls = arguments;
  for(var urlCount = fixtureUrls.length, urlIndex = 0; urlIndex < urlCount; urlIndex++) {
    htmlChunks.push(this.getFixtureHtml_(fixtureUrls[urlIndex]));
  }

  return htmlChunks.join('');
};

jasmine.Fixtures.prototype.clearCache = function() {
  this.fixturesCache_ = {};
};

jasmine.Fixtures.prototype.cleanUp = function() {
  var id = goog.dom.getElement(this.containerId);
  goog.dom.removeNode(id);
};

jasmine.Fixtures.prototype.sandbox = function(attributes) {
  var attributesToSet = attributes || {};
  attributesToSet.id = attributesToSet.id || "sandbox";

  var ele = goog.dom.createDom('DIV', attributesToSet);
  goog.dom.xml.setAttributes(ele, attributesToSet);

  return ele;
};

jasmine.Fixtures.prototype.createContainer_ = function(html) {
  var container, body;
  
  container = goog.dom.createDom("div", {
    id: this.containerId
  });

  if(html instanceof Element) {
    container.innerHTML = html.outerHTML;
  } else {
    container.innerHTML = html;
  }

  body = document.getElementsByTagName("body")[0];
  goog.dom.append(body, container);
};

jasmine.Fixtures.prototype.getFixtureHtml_ = function(url) {  
  if (typeof this.fixturesCache_[url] == 'undefined') {
    this.loadFixtureIntoCache_(url);
  }
  return this.fixturesCache_[url];
};

jasmine.Fixtures.prototype.loadFixtureIntoCache_ = function(relativeUrl) {
  var self = this;
  var finishedLoading = false;
  var url = this.fixturesPath.match('/$') ? this.fixturesPath + relativeUrl : this.fixturesPath + '/' + relativeUrl;
  
  goog.net.XhrIo.send(url, function (e) {
    var response = e.target;
    if (response.getResponseText()) {
      var data = response.getResponseText();
      self.fixturesCache_[relativeUrl] = data;
    }
    finishedLoading = true;
  }, "GET", undefined, {
    "Accept": "text/html"
  });

  while (finishedLoading == "a") {
    // we must guarantee that no tests are run
    // before the fixture finishes loading

    // goog.XhrIo.send can't be synchronous, no
    // loop until finished :(
  }
};

jasmine.Fixtures.prototype.proxyCallTo_ = function(methodName, passedArguments) {
  return this[methodName].apply(this, passedArguments);
};


jasmine.Closure = function() {};

jasmine.Closure.browserTagCaseIndependentHtml = function(html) {
  var dom = goog.dom.createDom('DIV');
  goog.dom.appendChild(dom, goog.dom.htmlToDocumentFragment(html));

  return dom.innerHTML;
};

jasmine.Closure.elementToString = function(element) {
  var ele = goog.dom.createDom('DIV');
  ele.appendChild(element.cloneNode(true));

  return ele.innerHTML;
};

jasmine.Closure.matchersClass = {};

(function(namespace) {
  var data = {
    spiedEvents: {},
    handlers:    []
  };

  namespace.events = {
    spyOn: function(selector, eventName) {
      var handler = function(e) {
        data.spiedEvents[[selector, eventName]] = e;
      };
      jQuery(selector).bind(eventName, handler);
      data.handlers.push(handler);
    },

    wasTriggered: function(selector, eventName) {
      return !!(data.spiedEvents[[selector, eventName]]);
    },

    cleanUp: function() {
      data.spiedEvents = {};
      data.handlers    = [];
    }
  }
})(jasmine.Closure);

(function(){
  var jQueryMatchers = {
    toHaveClass: function(className) {
      var classes = this.actual.className.split(" ");
      return goog.array.find(classes, function (cls) {
        return cls === className;
      });
    },

    toBeVisible: function() {
      return this.actual.is(':visible');
    },

    toBeHidden: function() {
      return this.actual.is(':hidden');
    },

    toBeSelected: function() {
      return this.actual.is(':selected');
    },

    toBeChecked: function() {
      return this.actual.is(':checked');
    },

    toBeEmpty: function() {
      return this.actual.is(':empty');
    },

    toExist: function() {
      return this.actual.size() > 0;
    },

    toHaveAttr: function(attributeName, expectedAttributeValue) {
      return hasProperty(this.actual.attr(attributeName), expectedAttributeValue);
    },

    toHaveId: function(id) {
      return this.actual.attr('id') == id;
    },

    toHaveHtml: function(html) {
      return this.actual.html() == jasmine.Closure.browserTagCaseIndependentHtml(html);
    },

    toHaveText: function(text) {
      if (text && jQuery.isFunction(text.test)) {
        return text.test(this.actual.text());
      } else {
        return this.actual.text() == text;
      }
    },

    toHaveValue: function(value) {
      return this.actual.val() == value;
    },

    toHaveData: function(key, expectedValue) {
      return hasProperty(this.actual.data(key), expectedValue);
    },

    toContain: function(selector) {
      return this.actual.find(selector).size() > 0;
    },

    toBeDisabled: function(selector){
      return this.actual.is(':disabled');
    },

    // tests the existence of a specific event binding
    toHandle: function(eventName) {
      var events = this.actual.data("events");
      return events && events[eventName].length > 0;
    },
    
    // tests the existence of a specific event binding + handler
    toHandleWith: function(eventName, eventHandler) {
      var stack = this.actual.data("events")[eventName];
      var i;
      for (i = 0; i < stack.length; i++) {
        if (stack[i].handler == eventHandler) {
          return true;
        }
      }
      return false;
    }
  };

  var hasProperty = function(actualValue, expectedValue) {
    if (expectedValue === undefined) {
      return actualValue !== undefined;
    }
    return actualValue == expectedValue;
  };

  var bindMatcher = function(methodName) {
    var builtInMatcher = jasmine.Matchers.prototype[methodName];

    jasmine.Closure.matchersClass[methodName] = function() {
      if (this.actual instanceof Element) {
        var result = jQueryMatchers[methodName].apply(this, arguments);
        this.actual = jasmine.Closure.elementToString(this.actual);
        return result;
      }

      if (builtInMatcher) {
        return builtInMatcher.apply(this, arguments);
      }

      return false;
    };
  };

  for(var methodName in jQueryMatchers) {
    bindMatcher(methodName);
  }
})();

beforeEach(function() {
  this.addMatchers(jasmine.Closure.matchersClass);
  this.addMatchers({
    toHaveBeenTriggeredOn: function(selector) {
      this.message = function() {
        return [
          "Expected event " + this.actual + " to have been triggered on" + selector,
          "Expected event " + this.actual + " not to have been triggered on" + selector
        ];
      };
      return jasmine.Closure.events.wasTriggered(selector, this.actual);
    }
  })
});

afterEach(function() {
  jasmine.getFixtures().cleanUp();
  jasmine.Closure.events.cleanUp();
});

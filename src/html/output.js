'use strict';

(function(){
// bind an array to a list of template instances, template takes only an index
//   holder: the element to put the template instances in
//   array: the array object to watch
//   template: the template class object
/*jshint sub:true*/
function bindArrayToHTML(holder, array, template, _parent) {
  if ((array.onCall && array.onCall.push)) return;
  let templates = []; // the list of template instance objects
  array.onSet = array.onSet || {};
  array.onSet['_length'] = array.onSet['_length'] || [];
  let cleanUpBinding;
  function cleanUp(){
    cleanUpBinding();
    clearInterval(interval);
  }
  let interval = setInterval(() => {
      if(!document.body.contains(holder)){
        cleanUp();
      }
  }, 1000);
  // array listeners
  cleanUpBinding = dataBinding.array(array, {
    push: function(x) {
      setTimeout(function() {
        var tpl = template(array.length - 1, array);
        templates.push(tpl);
        holder.appendChild(tpl.template);
      }, 1);
    },
    pop: function() {
      holder.removeChild(holder.lastChild);
      templates.pop();
    },
    unshift: function(x) {
      var tpl = template(0, array);
      templates.unshift(tpl);
      holder.insertBefore(tpl.template, holder.firstChild);
    },
    shift: function() {
      holder.removeChild(holder.firstChild);
      templates.shift();
    },
    splice: function(index, count) {
      var countCopy = count;
      while (countCopy) {
        holder.removeChild(holder.childNodes[index]);
        countCopy--;
      }
      var items = Array.prototype.slice.call(arguments, 2);
      if (items.length) {
        var createdTemplates = [],
          indexCopy = index;
        items.forEach(function(item) {
          var tpl = template(indexCopy, array);
          createdTemplates.push(tpl);
          holder.insertBefore(tpl.template, holder.children[indexCopy]);
          indexCopy++;
        });
        templates.splice.bind(templates, index, count).apply(createdTemplates);
      } else
        templates.splice(index, count);
    },
    setIndexFrom: function(index) {
      while (index < templates.length) {
        templates[index].arrayScopeSetIndex(index, array);
        index++;
      }
    },
    length: function(x) {
      dataBinding.callArray(array.onSet['_length'], [x]);
    }
  });
  // initalize
  holder.innerHTML = '';
  for (var i = 0; i < array.length; i++) {
    templates[i] = template(i, array);
    holder.appendChild(templates[i].template);
  }
}

function bindArrayPathToHTML(holder, template, _parent, path) {
  return dataBinding.addOnSet(_parent, path, function(array) {
    bindArrayToHTML(holder, array, template, _parent); //TODO: cleanUP???
  });
}

//working: push, pop, shift, unshift set value, set property
//not working: splice

function ChainableSelector(selector, scope) {
  this.selector = selector;
  this.scope = scope;
}

ChainableSelector.prototype = {
  getElement: function() {
    return this.scope.template.querySelector(this.selector);
  },
  attr: function(attributePath, dataPath) {
    this.scope.bindElement(this.selector, attributePath, dataPath);
    return this;
  },
  template: function(templateName, params) {
    this.scope.bindTemplate(this.selector, templateName, params);
    return this;
  },
  array: function(templateName, params, dataPath) {
    this.scope.bindArray(this.selector, templateName, params, dataPath);
    return this;
  },
  on: function(eventName, callback) {
    this.scope.on(this.selector, eventName, callback);
    return this;
  },
  focus: function() {
    this.getElement()
      .focus();
  },
  text: function(dataPath) {
    return this.attr('innerHTML', dataPath);
  },
  value: function(dataPath) {
    return this.attr('value', dataPath);
  },
  hide: function(dataPath) {
    return this.scope.onSet(dataPath, (x) => this.getElement()
      .style.display = x ? 'none' : ''
    );
  },
  show: function(dataPath) {
    return this.scope.onSet(dataPath, (x)=> this.getElement()
        .style.display = x ? '' : 'none'
    );
  },
  class: function(className, dataPaths) {
    return this.scope.onSet(dataPath, (x)=> {
      let e = this.getElement();
      if (x) e.classList.add(className);
      else e.classList.remove(className);
    });
  }
};

'use strict';

function bindElementAttributePathToObjectPath(element, attributePath, obj, path){
  if(element.unbind)
    element.unbind();
  // when the value on the object at path changes, update the element at attribute path
  var assignToElement = dataBinding.walkAndSet(element, attributePath);
  element.unbind = dataBinding.addOnSet(obj, path, assignToElement);
  element.addEventListener('DOMNodeRemovedFromDocument', element.unbind);
  // 2 way binding
  if(attributePath == 'value'){
    var assignToObject = dataBinding.walkAndSet(obj, path);
    function onChange (){
      assignToObject(element[attributePath]);
    }
    element.addEventListener('click', onChange);
    element.addEventListener('keyup', onChange);
  }
}

// htmlBinding is defined by the bulid script
htmlBinding = {
  scope: function(templateName, _parent, params){
    return new Scope(templateName, _parent, params);
  }
}

function scopeCss(tag, templateName){
  var text = tag.innerHTML;
  var regex = /([\S{].*?{.*?})/g;
  var newText = text.replace(regex, '[template="' + templateName + '"]');
}

function Scope(templateName, _parent, params, holder) {
  if (!templates[templateName]) {
    console.error("unknown template ", templateName);
  }
  this.template = templates[templateName].cloneNode(true); // deep
  this._parent = _parent;
  this.params = params;
  this._cleanUp = [];
  if (_parent)
    for (var key in params)
      this.bindData(key, _parent, params[key]); // params format is {localPath: parentPath}

  templateScripts[templateName].call(this.template, this, this.template); //provide template as argument as well as reciever for ease of use in callbacks
  if (holder) { // TODO: investigate why this is optional
    holder.innerHTML = '';
    holder.appendChild(this.template);
  }
  // provisional
  this.interval = setInterval(() => {
    if (!this.templateStillExists()) this.cleanUp();
  }, 1000);
}

Scope.prototype = {
  // bind a path on this scope to a path on another object
  bindData: function(path, other, otherPath) {
    this._cleanUp.push(dataBinding.mutual(
      other, otherPath,
      this, path
    ));
  },
  // bind computed attribute
  bindComputed: function(path, action) {
    var that = this;
    this._cleanUp.push(dataBinding.computedProperty(this, action, function(x) {
      that[path] = x;
    }));
  },
  // bind a path on this scope to an attribute of an html element in the scope, identified by selector
  bindElement: function(selector, attribute, path) {
    if (isFunction(path)) // bind computed property
      this.bindElementComputed(selector, attribute, path);
    else {
      var element = this.template.querySelector(selector);
      if (!element) console.error("selector " + selector + " not found");
      bindElementAttributePathToObjectPath(element, attribute, this, path);
    }
  },
  // build a new scope with the named template, link properties as specified in params, insert into holder identified by selector
  bindTemplate: function(selector, templateName, params) {
    let holder;
    if (selector === '' || selector === 'this') holder = this.template;
    else holder = this.template.querySelector(selector);
    holder.innerHTML = '';
    setTimeout(() => { // resolve this after binding elements in current scope, to prevent css selector reaching into child template
      new Scope(templateName, this, params, holder); // add new scope clean up to current scope clean up?
    }, 1);
  },
  // bind an array full of objects to a list of html scope instances
  bindArray: function(selector, templateName, params, path) {
    var fetchArray = dataBinding.walkAndGet(this, path);
    var that = this;
    // the function which builds each scope for the array members
    // array within here is immutable
    function subScope($index, array) {
      var scope = new Scope(templateName, that, params);
      scope.arrayScopeSetIndex($index, path);
      return scope;
    }
    let holder;
    if (selector === '' || selector === 'this') holder = this.template;
    else holder = this.template.querySelector(selector);
    holder.innerHTML = '';
    // bind setting the array, each time, bind the array values / length changeing functions
    this._cleanUp.push(bindArrayPathToHTML(holder, subScope, this, path));
    //var currentArray = dataBinding.walkAndGet(this, path)();
    //onSet(currentArray);
  },
  bindElementComputed: function(selector, attribute, action) {
    // create a key name ( a single step path )
    var path = dataBinding.makePrivateKey(selector + '|' + attribute);
    // bind the computed property to the key name
    var setAttribute = dataBinding.walkAndSet(this.template.querySelector(selector), attribute);
    this._cleanUp.push(dataBinding.computedProperty(this, action, setAttribute));
  },
  onSet: function(path, action) {
    this._cleanUp.push(dataBinding.addOnSet(this, path, action));
  },
  //to be used when a scope representing an array item changes it's index
  arrayScopeSetIndex: function($index, arrayPath) {
    if (this.$index == $index)
      return;
    this.$index = $index;
    //remove old listItemBinding
    if (this.removeIndexBinding)
      this.removeIndexBinding();
    // bindListItem
    var that = this,
      _parent = this._parent;
    this.removeIndexBinding = dataBinding.addOnSet(_parent, arrayPath + '.' + $index, function(x) {
      that.$listItem = x;

    });
  },
  $: function(selector) {
    return new ChainableSelector(selector, this);
  },
  on: function(selector, eventName, callback) {
    this.template.querySelector(selector).addEventListener(eventName, callback);
  },
  cleanUp: function() {
    clearInterval(this.interval);
    dataBinding.callArray(this._cleanUp);
  },
  templateStillExists: function() {
    return document.body.contains(this.template);
  }
};

var alias = {
  array: 'bindArray',
  attr: 'bindElement',
  tpl: 'bindTemplate',
  computed: 'bindComputed'
};

for (var key in alias)
  Scope.prototype[key] = Scope.prototype[alias[key]];

function isFunction(obj) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
}

'use strict';
// find and record templates
window.templateScripts = {};
var templates = {};
var hasSetUp = false;
function setup(){
  if(hasSetUp)
    return;
  console.log('running setup');
  hasSetUp = true;
  var templateElements = document.querySelectorAll('[template]'),
    templateName, element;
  for(var i = 0; i < templateElements.length; i++){
    element = templateElements[i];
    templateName = element.getAttribute('template');
    templates[templateName] = element;
    //templateScripts[templateName] = eval(element.querySelector('script').innerHTML);
    element.parentNode.removeChild(element);
  }
  // instance root elements ( holders of top level scopes )
  var rootElements = document.querySelectorAll('[bw-root]'),
      scope;
  for(i = 0; i < rootElements.length; i++){
    element = rootElements[i];
    templateName = element.getAttribute('bw-root');
    new Scope(templateName, null, {}, element);
  }
}

document.addEventListener('DOMContentLoaded', setup);


})();
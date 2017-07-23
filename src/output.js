'use strict';

(function(){
var dataBinding, htmlBinding;
'use strict';

(function(){
// bindToArray: apply onCall to an array: react to method calls
function bindToArray(array, actions){
  var length = function(){
      if(actions.length) actions.length(array.length);
  }, setIndexFrom;
  if(actions.setIndexFrom)
    setIndexFrom = function(x){
      if(actions.setIndexFrom)
        actions.setIndexFrom(x, array);
    }
  var cleanUp = onCall(array, {
    push: function(x){
      length();
      if(actions.push) actions.push(x);
    },
    pop: function(){
      length();
      if(actions.pop) actions.pop();
    },
    unshift: function(x){
      length();
      if(actions.unshift) actions.unshift(x);
      if(setIndexFrom) setIndexFrom(0);
    },
    shift: function(){
      length();
      if(actions.shift) actions.shift();
      if(setIndexFrom) setIndexFrom(0);
    },
    splice: function(index, count){ // trailing optional paramaters
      length();
      if(actions.splice) actions.splice.apply(actions, arguments)
      if(setIndexFrom) setIndexFrom(index);
    }
  });
  return cleanUp;
}

//cause a function to be re-evaluated when any member of 'this' within the function body changes
function computedProperty(_parent, action, callback){
  var script = action.toString(),
      regex = /(?:this|scope)\.([0-9A-Za-z\.$_]+)/g,
      cleanup = [],
      match;
  function onChange(){
    callback(action());
  }
  onChange();
  while(match = regex.exec(script))
    cleanup.push(dataBinding.addOnSet(_parent, match[1], onChange));
  return callArray.bind(null, cleanup);
}

// main user interface
// add on set to parent with path string
function addOnSetInterface(_parent, path, action) {
  return durableOnSet(_parent, path.split('.'), action);
}

// bind two object paths together
function mutualBind(a, aPath, b, bPath) {
  var setA = walkAndSet(a, aPath),
    setB = walkAndSet(b, bPath),
    cleanUp = [ // return cleanUp array
      durableOnSet(a, aPath.split('.'), setB),
      durableOnSet(b, bPath.split('.'), setA)
    ];
  return cleanUp;
}

// core of the logic, wrap a member in get/set to allow on set listener
// should only be invoked by onSet
function actionOnSet(_parent, key, action) {
  // ensure the existance of caches
  _parent.bailingWire = _parent.bailingWire || {};
  _parent.bailingWire.value = _parent.bailingWire.value || {};
  // initalize backing value store ( real value )
  _parent.bailingWire.value[key] = _parent[key];
  // check for existing getter / setter - memory leak?
  let descriptor = Object.getOwnPropertyDescriptor(_parent, key), oldGet, oldSet;
  if (descriptor && descriptor.set) {
    //[oldGet, oldSet] = [descriptor.get, descriptor.set];
    console.error("existing setter on property " + key + " prevents binding, bailingwire does not yet support this situation, you may unbind the ixisting setter explicitly");
  }
  Object.defineProperty(_parent, key, {
    set: function(x) {
      // if value has changed
      if (_parent.bailingWire.value[key] !== x) { // replace != with !deep equal?
        // set real value
        _parent.bailingWire.value[key] = x;
        // call listeners
        action.call(this, x);
 //       if (oldSet) {
  //        oldSet.call(this, x);
  //      }
      }
      return x;
    },
    get: function() {
      // get real value
    //  if (oldGet) {
      //  return oldGet.call(this);
 //     }
      return _parent.bailingWire.value[key];
    }
  });
}

// handles binding to single item paths
function addOnSet(_parent, key, action) {
  // debug test: keys, not paths
  if (key.indexOf('.') != -1)
    console.error('bad key ', key);
  // detect and divert for array parent
  if (key == 'length' && Array.isArray(_parent))
    return bindToArray(_parent, {
      length: action
    });
  // ensure the existance of caches
  _parent.bailingWire = _parent.bailingWire || {};
  _parent.bailingWire.onSet = _parent.bailingWire.onSet || {};
  // add an onSet callback for the property if none exists
  if (!_parent.bailingWire.onSet[key]) {
    // add action holder
    _parent.bailingWire.onSet[key] = [];
    // define action callback
    var onSet = function(value) {
      callArray(_parent.bailingWire.onSet[key], [value]);
    };
    // add action callback
    actionOnSet(_parent, key, onSet);
  }
  // add action to onSet callback array
  _parent.bailingWire.onSet[key].push(action);
  return (function() {
    //remove action from list
    _parent.bailingWire.onSet[key].splice(_parent.bailingWire.onSet[key].indexOf(action), 1);
  });
}

// recursively walk path and bind regeneration listiners at each step
// add on set to end of path
function durableOnSet(_parent, path, action, cleanUp) {
  cleanUp = cleanUp || [];
  // this is the end of the path, add the real ( user requested ) binding
  if (path.length == 1) {
    // run the action now, if the target exists
    if (_parent[path[0]] !== undefined) {
      action(_parent[path[0]]);
    }
    cleanUp.push(addOnSet(_parent, path[0], action));
  } else {
    var pathCopy = copyArray(path),
      key = pathCopy.shift();
    // follow path down if the next level currently exists
    if (_parent[key] !== undefined) {
      if (isPrimitive(_parent[key])) {
        // next level of path is a primitive
        //  combine remaining path into compound key
        var combinedPath = path.join('.');
        //  define onSet action to be bound to current parent but take it's value from the primitive's property
        var remoteAction = function(primitiveValue) {
          var value = endOfPath(_parent, path);
          action(value);
        };
        //  attach 'jump down' binding
        cleanUp.push(addOnSet(_parent, key, remoteAction));
      } else {
        // current value is not primitive, recurse as normal
        cleanUp.push(durableOnSet(_parent[key], pathCopy, action, cleanUp));
      }
    }
    // define onset action: regenerative binding
    // regenerative binding: calls durable on set when any member of the path is replaced, and rebuilds the bindings on the new values
    // also allows binding to paths that don't yet exist
    var onSet = function(value) {
      if (value !== undefined && !isPrimitive(value))
        durableOnSet(value, pathCopy, action, cleanUp);
    };
    cleanUp.push(addOnSet(_parent, key, onSet));
  }
  return callArray.bind(null, cleanUp);
}

// data binding is defined by the build script
dataBinding = {
  addOnSet: addOnSetInterface,
  mutual: mutualBind,
  array: bindToArray,
  computedProperty: computedProperty,
  onCall: onCall,
  makePrivateKey: makePrivateKey,
  walkAndSet: walkAndSet,
  walkAndGet: walkAndGet,
  callArray: callArray
}

// utility method: call each funtion in an array with args
function callArray(array, args){
  for(var i = 0; i < array.length; i++)
    array[i].apply(undefined, args);
}

//onCall: overide methods to call actions when a method is exectuted, also execute the method as usual
function onCall(obj, actions){
  obj.bailingWire = obj.bailingWire || {};
  var listeners = obj.bailingWire.onCall || {},
      cleanUp = [];
   Object.keys(actions).forEach(function(key){
     if(!listeners[key]){
       listeners[key] = [];
        var oldAction = obj[key];
        obj[key] = function(){
          callArray(listeners[key], arguments);
          oldAction.apply(obj, arguments);
        }
     }
     listeners[key].push(actions[key]);
     cleanUp.push(function(){
       listeners[key].splice(listeners[key].indexOf(actions[key], 1));
     });
   });
   if(!obj.bailingWire.onCall){
     obj.bailingWire.onCall = listeners;
     obj.bailingWire.cleanCopy = cleanCopy;
     obj.bailingWire.keys = realKeys;
   }
   return stop = (function(){// remove the listeners added durring this invocation
      callArray(cleanUp);
   });
}

function cleanCopy(){ // return a copy of this array without onCall 
   var obj = this;
   return obj.bailingWire.keys().
     map(function(key){
       return obj[key];
     });
 }
// list of user defined keys
function realKeys(){
  var obj = this;
   return Object.keys(obj).
     filter(function(key) {
       return !obj.bailingWire.onCall[key] && key != 'bailingWire'
     });
}

// utility
function copyArray(x){
  return x.map(function(x){return x;});
}

function callArray(a, args){
  for(var i = 0; i < a.length; i++)
    a[i].apply(null, args || []);
}

function makePrivateKey(key){
  return 'ಠ_ಠ' + key;
}
// follow object path ( like user.name.first ) to last item and return it
function endOfPath(_parent, path){
  var i = 0, output = _parent;
  while ( i < path.length){
    if(!output[path[i]])
      return undefined;
    output = output[path[i]];
    i++;
  }
  return output;
}

function walkAndSet(object, path){
  var path = path.split('.'),
      key = path.pop();
  return function(x, allowNotExist){
    var end = endOfPath(object, path);
    if(!end)
      if(allowNotExist)
        return false;
      else
        console.error('attempted to set a path that does not exist ', object, path);
    else
      return end[key] = x;
  }
}

function walkAndGet(object, path){
  var path = path.split('.'),
      key = path.pop();
  return function(){
    var end = endOfPath(object, path);
    if(!end)
      return undefined;
    return end[key];
  }
}

function isPrimitive(value){
  return typeof(value) != 'object' || value === null;
}

function WrappedPrimitive(value){
  this.value = value;
}

function actionOnSetPrimitive(_parent, key, action){
  _parent.bailingWire = _parent.bailingWire || {};
  _parent.bailingWire.value = _parent.bailingWire || {};
  _parent.bailingWire.value[key] = new WrappedPrimitive(_parent[key]);
  Object.defineProperty(_parent, key, {
    get: function() { 
      return _parent.bailingWire.value[key].value; 
    },
    set: function(x) {
      if(_parint.bailingWire.value[key].value != x){
        _parint.bailingWire.value[key].value = x;
        action(x);
      }
      return x;
    }
  });
}


})();'use strict';

(function(){
// bind an array to a list of template instances
// template takes only an index
// holder: the element to put the template instances in
// array: the array object to watch
// template: the template class object
function bindArrayToHTML(holder, array, template, _parent){
  var templates = []; // the list of template instance objects
  array.onSet = array.onSet || {};
  array.onSet['length'] = array.onSet['length'] || [];
  // array listeners
  if(!(array.onCall && array.onCall.push)){
    dataBinding.array(array, {
      push: function(x){
        setTimeout(function(){
          var tpl = template(array.length - 1, array);
          templates.push(tpl);
          holder.appendChild(tpl.template);
	}, 1);
      },
      pop: function(){
        holder.removeChild(holder.lastChild);
        templates.pop();
      },
      unshift: function(x){
        var tpl = template(0, array);
        templates.unshift(tpl);
        holder.insertBefore(tpl.template, holder.firstChild);
      },
      shift: function(){
        holder.removeChild(holder.firstChild);
        templates.shift();
      },
      splice: function(index, count){
	var countCopy = count;
        while(countCopy){
          holder.removeChild(holder.childNodes[index]);
          countCopy--;
        }
        var items = Array.prototype.slice.call(arguments, 2);
	if(items.length){
          var createdTemplates = [],
	       indexCopy = index;
          items.forEach(function(item){
            var tpl = template(indexCopy, array);
            createdTemplates.push(tpl);
            holder.insertBefore(tpl.template, holder.children[indexCopy]);
            indexCopy++;
          });
	  templates.splice.bind(templates, index, count).apply(createdTemplates);
        } else
	  templates.splice(index, count);
      },
      setIndexFrom: function(index){
        while(index < templates.length){
          templates[index].arrayScopeSetIndex(index, array);
          index++;
        }
      },
      length: function(x){
        dataBinding.callArray(array.onSet['length'], [x]);
      }
    });
  }
  // initalize
  holder.innerHTML = '';
  for(var i = 0; i < array.length; i++){
    templates[i] = template(i, array);
    holder.appendChild(templates[i].template);
  }
}

function bindArrayPathToHTML(holder, template, _parent, path){
  return dataBinding.addOnSet(_parent, path, function(array){
    bindArrayToHTML(holder, array, template, _parent);
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
    return this.scope.onSet(dataPath, function(x) {
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
  this.cleanUp = [];
  if (_parent)
    for (var key in params)
      this.bindData(key, _parent, params[key]); // params format is {localPath: parentPath}

  templateScripts[templateName].call(this.template, this, this.template); //provide template as argument as well as reciever for ease of use in callbacks
  if (holder) {
    holder.innerHTML = '';
    holder.appendChild(this.template);
  }
}

Scope.prototype = {
  // bind a path on this scope to a path on another object
  bindData: function(path, other, otherPath) {
    this.cleanUp.push(dataBinding.mutual(
      other, otherPath,
      this, path
    ));
  },
  // bind computed attribute
  bindComputed: function(path, action) {
    var that = this;
    this.cleanUp.push(dataBinding.computedProperty(this, action, function(x) {
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
    var holder = this.template.querySelector(selector);
    holder.innerHTML = '';
    var that = this;
    setTimeout(function() { // resolve this after binding elements in current scope, to prevent css selector reaching into child template
      new Scope(templateName, that, params, holder);
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
    var holder = this.template.querySelector(selector);
    // bind setting the array, each time, bind the array values / length changeing functions
    this.cleanUp.push(bindArrayPathToHTML(holder, subScope, this, path));
    //var currentArray = dataBinding.walkAndGet(this, path)();
    //onSet(currentArray);
  },
  bindElementComputed: function(selector, attribute, action) {
    // create a key name ( a single step path )
    var path = dataBinding.makePrivateKey(selector + '|' + attribute);
    // bind the computed property to the key name
    var setAttribute = dataBinding.walkAndSet(this.template.querySelector(selector), attribute);
    this.cleanUp.push(dataBinding.computedProperty(this, action, setAttribute));
  },
  onSet: function(path, action) {
    this.cleanUp.push(dataBinding.addOnSet(this, path, action));
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
})();
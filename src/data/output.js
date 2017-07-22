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
  if (descriptor && description.set) {
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


})();
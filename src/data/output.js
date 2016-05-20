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

// utility
function copyArray(x){
  return x.map(function(x){return x;});
}

function callArray(a, args){
  for(var i = 0; i < a.length; i++)
    a[i].appy(null, args || []);
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

// apply an on change action to an object path
// action is 'durable', meaning any object in the path can be deleted and recreated without removing the listener
function durablyApplyFunctionToPath(_parent, path, action){
  path = copyArray(path);
  var key = path.pop(), pathPart, nextNode, cleanUp = [], currentParent = _parent;
  while(path.length){
    pathPart = path[0]; // take rather then shift, we still may need the path
    nextNode = currentParent[pathPart];
    if(!nextNode){ // thing does not currently exist, but a parent will set up it's listeners when it gets created
        action(undefined);
        return false;
    }
    // whenever a parent is set, regenerate the listener on the target, and any intermediate nodes
    cleanUp.push(addOnSet(currentParent, pathPart, function(pathCopy){
        return function(value){
          cleanUp.push(buildDurableGetSetOnPath(currentParent, path, action));
        }
      }(copyArray(pathCopy))// send a copy of the current path
    )); 
    path.shift();
    currentParent = nextNode;
  }
  
  cleanUp.push(action(currentParent, key));
  return callArray.bind(null, cleanUp);
}
// an object to be returned
function DeepOnSetReturn(_parent, path, stop){
  this._parent = _parent;
  this.path = copyArray(path);
  this.key = this.path.pop();
  this.stop = stop;
}

DeepOnSetReturn.prototype = {
  set: function(x){
    endOfPath(this._parent, this.path)[key] = x;
  }
}

// set an action on a variable within a data structure
// pass the path as a string or array
// regenerate parent bindings on change as needed
function addDeepOnSet(_parent, path, action){
  var pathParts, pathCopy;
  if(typeof(path) == 'string'){
    pathParts = path.split('.');
    pathCopy = path.split('.');
  } else{
    pathParts = [];
    pathCopy = [];
    for (var i = 0; i < path.length; i ++){
      pathParts.push(path[i]);
      pathCopy.push(path[i]);
    }
    pathParts = copyArray(path);
    pathCopy = copyArray(path);
  }
  var cleanUp = durablyApplyFunctionToPath(_parent, pathCopy, function(directParent, key){
    if(directParent){
      action(directParent, key);
      addOnSet(directParent, key, action);
    }
  });
  return new DeepOnSetReturn(_parent, pathParts, cleanUp);
}
// core of the logic, wrap a member in get/set to allow on set listener
// should only be invoked by onSet
function actionOnSet(_parent, key, action){
  // ensure the existance of caches
  _parent.bailingWire = _parent.bailingWire || {};
  _parent.bailingWire.value = _parent.bailingWire.value || {};
  // initalize backing value store ( real value )
  _parent.bailingWire.value[key] = _parent[key];
  Object.defineProperty(_parent, key, {
    set: function(x){
      // if value has changed
      if(_parent.bailingWire.value[key] !== x){ // replace != with !deep equal?
        // set real value
        _parent.bailingWire.value[key] = x; 
	// call listeners
        action.call(this, x);
      }
      return x;
    },
    get: function(){
      // get real value
      return _parent.bailingWire.value[key];
    }
  });
}

// main user interface

function addOnSetInterface(_parent, key, action){
  return durableOnSet(_parent, key.split('.'), action);
}


function addOnSet(_parent, key, action){
  if(key.indexOf('.') != -1)
    console.error('bad key ', key);
  if(key == 'length' && Array.isArray(_parent))
    return bindToArray(_parent, {length: action});
  // ensure the existance of caches
  _parent.bailingWire = _parent.bailingWire || {};
  _parent.bailingWire.onSet = _parent.bailingWire.onSet || {};
  if(!_parent.bailingWire.onSet[key]){
    _parent.bailingWire.onSet[key] = [];
    actionOnSet(_parent, key, function(value){
      callArray(_parent.bailingWire.onSet[key], [value]);
    });
  }
  _parent.bailingWire.onSet[key].push(action);
  return (function(){
    //remove action from list
    _parent.bailingWire.onSet[key].splice(_parent.bailingWire.onSet[key].indexOf(action), 1);
  });
}

function mutualBind(a, aPath, b, bPath){
  var setA = walkAndSet(a, aPath),
      setB = walkAndSet(b, bPath),
      aValue = walkAndGet(a, aPath)(),
      cleanUp = [ // return cleanUp array
    durableOnSet(a, aPath.split('.'), setB),
    durableOnSet(b, bPath.split('.'), setA)
  ];
  return cleanUp;
}

// recursive experiment
function durableOnSet(_parent, path, action){
  if(path.length == 1){
    // run the action now, if the target exists
    if(_parent[path[0]] !== undefined)
      action(_parent[path[0]]);
    return addOnSet(_parent, path[0], action);
  }else{
    var pathCopy = copyArray(path),
        key = pathCopy.shift(),
	cleanUp = [];
    cleanUp.push(addOnSet(_parent, key, function(value){
      if(value)
        durableOnSet(value, pathCopy, action);
    }));
    if(_parent[key] !== undefined)
      cleanUp.push(durableOnSet(_parent[key], pathCopy, action));
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


})();
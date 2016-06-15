// main user interface
// add on set to parent with path string
function addOnSetInterface(_parent, path, action){
  return durableOnSet(_parent, path.split('.'), action);
}

// bind two object paths together
function mutualBind(a, aPath, b, bPath){
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

// handles binding to single item paths
function addOnSet(_parent, key, action){
  // debug test: keys, not paths
  if(key.indexOf('.') != -1)
    console.error('bad key ', key);
  // detect and divert for array parent
  if(key == 'length' && Array.isArray(_parent))
    return bindToArray(_parent, {length: action});
  // ensure the existance of caches
  _parent.bailingWire = _parent.bailingWire || {};
  _parent.bailingWire.onSet = _parent.bailingWire.onSet || {};
  // add an onSet callback for the property if none exists
  if(!_parent.bailingWire.onSet[key]){
    // add action holder
    _parent.bailingWire.onSet[key] = [];
    // define action callback
    var onSet = function(value){
      callArray(_parent.bailingWire.onSet[key], [value]);
    };
    // add action callback
    actionOnSet(_parent, key, onSet);
  }
  // add action to onSet callback array
  _parent.bailingWire.onSet[key].push(action);
  return (function(){
    //remove action from list
    _parent.bailingWire.onSet[key].splice(_parent.bailingWire.onSet[key].indexOf(action), 1);
  });
}

// recursively walk path and bind regeneration listiners at each step
// add on set to end of path
function durableOnSet(_parent, path, action, cleanUp){
  cleanUp = cleanUp || [];
  // this is the end of the path, add the real ( user requested ) binding
  if(path.length == 1){
    // run the action now, if the target exists
    if(_parent[path[0]] !== undefined){
      action(_parent[path[0]]);
    }
    cleanUp.push(addOnSet(_parent, path[0], action));
  } else { 
    var pathCopy = copyArray(path),
        key = pathCopy.shift();
    // follow path down if the next level currently exists
    if(_parent[key] !== undefined){
      if( isPrimitive(_parent[key]) ){
        // next level of path is a primitive
        //  combine remaining path into compound key
        var combinedPath = path.join('.');
        //  define onSet action to be bound to current parent but take it's value from the primitive's property
        var remoteAction = function(primitiveValue){
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
    var onSet = function(value){
      if(value !== undefined && !isPrimitive(value))
        durableOnSet(value, pathCopy, action, cleanUp);
    };
    cleanUp.push(addOnSet(_parent, key, onSet));
  }
  return callArray.bind(null, cleanUp);
}

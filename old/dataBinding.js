'use strict';
(function(){

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

  function endOfPath(_parent, path){
    path = copyArray(path);
    var currentParent = _parent;
    while(path)
      currentParent = currentParent[path.pop()];
    return currentParent;
  }

  function durablyApplyFunctionToPath(_parent, path, action){
    path = copyArray(path);
    var key = path.pop(), pathPart, nextNode, cleanUp = [], currentParent = _parent;
    while(path){
      pathPart = path[0];
      nextNode = currentParent[pathPart];
      if(!nextNode) // thing does not currently exist, but a parent will set up it's listeners when it gets created
          return false;
      // whenever a parent is set, regenerate the listener on the target, and any intermediate nodes
      cleanUp.push(addOnSet(currentParent, pathPart, function(pathCopy){
          function(value){
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
  function addDeepOnSet(_parent, path, action, recursive){
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
    },
    var cleanUp = durablyApplyFunctionToPath(_parent, path, function(directParent, key){
      action(directParent, key);
      addOnSet(directParent, key, action);
    });
    return new DeepOnSetReturn(_parent, path, cleanUp);
  }

  function actionOnSet(_parent, key, privateKey, action){
    privateKey = privateKey || makePrivateKey(key);
    _parent[privateKey] = _parent[key];
    Object.defineProperty(_parent, key, {
      set: function(x){
        if(this[privateKey] !== x){ // replace != with deep equal?
          this[privateKey] = x; 
          action.call(this, x);
        }
        return x;
      },
      get: function(){
        return this[privateKey];
      }
    });
  }

  function addOnSet(_parent, key, action){
    _parent.onSet = _parent.onSet || {};
    if(!_parent.onSet[key]){
      _parent.onSet[key] = [];
      actionOnSet(_parent, key, null, function(value){
        callArray(_parent.onSet[key], [value]);
      });
    }
    _parent.onSet[key].push(action);
    return (function(){//clean up
      _parent.onSet[key].splice(_parent.onSet[key].indexOf(action), 1);
    });
  }

  function proxy(a, aKey, b, bKey){
    Object.defineProperty(a, aKey, {
      set: function(x){
        b[bKey] = x;
      },
      get: function(){ 
        return b[bKey];
      }
    });
  }

  function deepProxy(a, aPath, b, bPath){
    var proxyDataKey  = makePrivateKey('proxyData')
    // store the referenced value
    // when a set binding is declared, put it on the reference, rather then the proxy
    if(!a[proxyDataKey]){ 
      a[proxyDataKey] = {}
      a.unProxy = function(path){
        var data = a[proxyDataKey][path.join('.')]
        return {
          _parent: data[0],
          path: data[1]
      }
    }
    a[proxyDataKey][aPath.join('.')] = [b, bPath];
    bPath = arrayCopy(bPath);
    var bKey = bPath.pop();
    return durrablyApplyFunctionToPath(a, aPath, function(directParent, key){
      proxy(directParent, key, endOfPath(b, bPath), bKey);
    });
  }
  window.dataBinding = {
    proxy: proxy,
    addOnSet: addOnSet,
    actionOnSet: actionOnSet,
    addDeepOnSet: addDeepOnSet
  }
})();


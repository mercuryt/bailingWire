function callArray(array, args){
  for(var i = 0; i < array.length; i++)
    array[i].apply(undefined, args);
}

function onCall(obj, actions){
  var listeners = obj.onCall || {},
      cleanUp = [];
   Object.keys(actions).forEach(function(key){
     if(!listeners[key]){
       listeners[key] = [];
        var oldAction = obj[key];
        obj[key] = function(){
          oldAction.apply(obj, arguments);
          callArray(listeners[key], arguments);
        }
     }
     listeners[key].push(actions[key]);
     cleanUp.push(function(){
       listeners[key].splice(listeners[key].indexOf(actions[key], 1));
     });
   });
   if(!obj.onCall){
     obj.onCall = listeners;
     obj.cleanCopy = cleanCopy;
     obj.keys = realKeys;
   }
   return stop = (function(){// remove the listeners added durring this invocation
      callArray(cleanUp);
   });
}

function cleanCopy(){ // return a copy of this array without onCall 
   var obj = this;
   return obj.realKeys().
     map(function(key){
       return obj[key];
     });
 }

function realKeys(){
  var obj = this;
   return Object.keys(obj).
     filter(function(key) {
       return !obj.onCall[key] && ['onCall', 'cleanCopy', 'keys'].indexOf(key) == -1;
     });
}

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

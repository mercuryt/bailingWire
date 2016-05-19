function arrayLength(x, onChange){
  var push = x.push,
      pop = x.pop,
      shift = x.shift,
      unshift = x.unshift, 
      splice = x.splice;
  x.push = function(){
    push.apply(x, arguments);
    onChange('push',arguments);
  }
  x.pop = function(){
    pop.apply(x, arguments);
    onChange('pop', arguments);
  }
  x.shift = function(){
    shift.apply(x, arguments);
    onChange('shift', arguments);
  }
  x.unshift = function(){
    unshift.apply(x, arguments);
    onChange('unshift', arguments);
  }
  x.splice = function(){
    splice.apply(x, arguments);
    onChange('splice', arguments);
  }
}

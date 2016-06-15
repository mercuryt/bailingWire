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

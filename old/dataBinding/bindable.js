function BindableValue(_parent, path){
  this._parent = _parent;
  this.path = path;
  this.key = this.path.pop();
}

BindableValue.prototype = {
  get: function(){ return walkPath(this._parent, this.path)[this.key]; },
  set: function(x){
    walkPath(this._parent, this.path)[this.key] = x; 
  },
  onSet: function(action){ // return clean up function
    return nonAtomicActionOnSet(this._parent, this.key, action);
  }
}

function BindableHTML(element, attribute){
  this.element = element;
  this.attribute = attribute;
}

BindableHTML.prototype = {
  get: function() { return this.element[this.attribute]; },
  set: function(x) { return this.element[this.attribute] = x; },
  onSet: function(action){
    this.element.onchange = this.element.onkeyup = action;
  }
}

function asBindable(thing, key){
  if(thing.nodeName)//html element
    return new BindableHTML(thing, key);
  // normal value
  return new BindableValue(thing, key);
}

function mutualBind(to, from){
  from.onSet(to.set.bind(to));
  to.set(from.get());
  to.onSet(from.set.bind(from));
}

function bind(a, aKey, b, bKey){
  return mutualBind(asBindable(a, aKey), asBindable(b, bKey));
}

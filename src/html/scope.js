function Scope(templateName, _parent, params, holder){
  this.template = templates[templateName].cloneNode(true) // deep
  this._parent = _parent;
  this.params = params;
  this.cleanUp = [];
  if(_parent)
    for(var key in params)
      this.bindData(key, _parent, params[key]); // params format is {localPath: parentPath}

  templateScripts[templateName].call(this.template, this, this.template);//provide template as argument as well as reciever for ease of use in callbacks
  if(holder){
    holder.innerHTML = '';
    holder.appendChild(this.template);
  }
}

Scope.prototype = {
  // bind a path on this scope to a path on another object
  bindData: function(path, other, otherPath){
    this.cleanUp.push(dataBinding.mutual(
      other, otherPath,
      this, path
    ));
  },
  // bind computed attribute
  bindComputed: function(path, action){
    var that = this;
    this.cleanUp.push(dataBinding.computedProperty(this, action, function(x){
      that[path] = x;
    }));
  },
  // bind a path on this scope to an attribute of an html element in the scope, identified by selector
  bindElement: function(selector, attribute, path){
    if(isFunction(path)) // bind computed property
      this.bindElementComputed(selector, attribute, path);
    else
      bindElementAttributePathToObjectPath(this.template.querySelector(selector), attribute, this, path);
  },
  // build a new scope with the named template, link properties as specified in params, insert into holder identified by selector
  bindTemplate: function(selector, templateName, params){
    var holder = this.template.querySelector(selector);
    holder.innerHTML = '';
    new Scope(templateName, this, params, holder);
  },
  // bind an array full of objects to a list of html scope instances
  bindArray: function(selector, templateName, params, path){
    var fetchArray = dataBinding.walkAndGet(this, path);
    var that = this;
    // the function which builds each scope for the array members
    // array within here is immutable
    function subScope($index, array){
      var scope = new Scope(templateName, that, params);
      scope.arrayScopeSetIndex($index, path);
      return scope;
    }
    var element = this.template.querySelector(selector);
    // bind setting the array, each time, bind the array values / length changeing functions
    var onSet = function(array){  bindArrayToHTML(element, array, subScope) };
    dataBinding.addOnSet(this, path, onSet);
    //var currentArray = dataBinding.walkAndGet(this, path)();
    //onSet(currentArray);
  },
  bindElementComputed(selector, attribute, action){
    // create a key name ( a single step path )
    var path = dataBinding.makePrivateKey(selector + '|' + attribute);
    // bind the computed property to the key name
    var setAttribute = dataBinding.walkAndSet(this.template.querySelector(selector), attribute);
    this.cleanUp.push(dataBinding.computedProperty(this, action, setAttribute));
  },
  //to be used when a scope representing an array item changes it's index
  arrayScopeSetIndex: function($index, arrayPath){
    if(this.$index == $index)
      return;
    this.$index = $index;
    //remove old listItemBinding
    if(this.removeIndexBinding)
      this.removeIndexBinding();
    // bindListItem
    var that = this;
    this.removeIndexBinding = dataBinding.addOnSet(this._parent, arrayPath + '.' + $index, function(x){ 
      that.$listItem = x; 
    });
    this.$listItem = dataBinding.walkAndGet(this._parent, arrayPath + '.' + $index)();
  }
}

function isFunction(obj) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
}


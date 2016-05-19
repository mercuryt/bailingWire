function linkable(params){
  if(params.root || params.path){
    return LinkableProperty(params.root, params.path);
  if(params.element)
    return LinkableElement(params.element, params.attribute);
  }
}

function LinkableProperty(root, path){
    this.pathString  = params.path;
    this.path = params.path.split('.');
    this.root = params.root
}

LinkableProperty.prototype = {
  get: function(){
    return expandPath(this.root, this.path);
  },
  set: function(x){
    return expandPath(this.root, this.path) = x;
  }
  link: function(linkable, params){
    params = params || {};
    var output = {};
    if(params.immutable)
      output.immutable = true;
      
  }
}

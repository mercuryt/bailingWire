function ContainsLinkable(thing){
  this.thing = thing;
}

ContainsLinkable.prototype = {
  onChange: function(path, action, node){ // external users should never provide node
    var pathList
    if(typeof(path) == 'string'){
      pathList = path.split('.');
    }
    else
      pathList = path.map(function(x){return x;});
    node = node || this.thing, next;
    while(pathList.length > 1){
      next = node[pathList[0]];
      // bind regenerative
      pathList.pop();
      node = next;
    }
    // bind
  }
  
}

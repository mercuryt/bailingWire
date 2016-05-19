function ChainableSelector(selector, scope){
  this.selector = selector;
  this.scope = scope;
}

ChainableSelector.prototype = {
  attr: function(attributePath, dataPath){
     this.scope.bindElement(this.selector, attributePath, dataPath);
     return this;
  },
  template: function(templateName, params){
     this.scope.bindTemplate(this.selector, templateName, params);
     return this;
  },
  array: function(templateName, params, dataPath){
    this.scope.bindArray(this.selector, templateName, params, dataPath);
    return this;
  },
  on: function(eventName, callback){
    this.scope.on(selector, eventName, callback);
    return this;
  },
  focus: function(){
    this.getElement().focus();
  },
  getElement: function(){
    return this.scope.template.querySelector(selector);
  }
}

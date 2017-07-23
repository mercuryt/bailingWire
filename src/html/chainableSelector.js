function ChainableSelector(selector, scope) {
  this.selector = selector;
  this.scope = scope;
}

ChainableSelector.prototype = {
  getElement: function() {
    return this.scope.template.querySelector(this.selector);
  },
  attr: function(attributePath, dataPath) {
    this.scope.bindElement(this.selector, attributePath, dataPath);
    return this;
  },
  template: function(templateName, params) {
    this.scope.bindTemplate(this.selector, templateName, params);
    return this;
  },
  array: function(templateName, params, dataPath) {
    this.scope.bindArray(this.selector, templateName, params, dataPath);
    return this;
  },
  on: function(eventName, callback) {
    this.scope.on(this.selector, eventName, callback);
    return this;
  },
  focus: function() {
    this.getElement()
      .focus();
  },
  text: function(dataPath) {
    return this.attr('innerHTML', dataPath);
  },
  value: function(dataPath) {
    return this.attr('value', dataPath);
  },
  hide: function(dataPath) {
    return this.scope.onSet(dataPath, (x) => this.getElement()
      .style.display = x ? 'none' : ''
    );
  },
  show: function(dataPath) {
    return this.scope.onSet(dataPath, (x)=> this.getElement()
        .style.display = x ? '' : 'none'
    );
  },
  class: function(className, dataPaths) {
    return this.scope.onSet(dataPath, (x)=> {
      let e = this.getElement();
      if (x) e.classList.add(className);
      else e.classList.remove(className);
    });
  }
};

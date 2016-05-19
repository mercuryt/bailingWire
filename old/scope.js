'use strict';

(function(){
  window.Scope = function(_parent, params, templateName){
    this._parent = _parent;
    this.params = params;
    this.template = templates[templateName].cloneNode(true);//deep clone
    this.templateName = templateName;
    this.template.style.display = 'inherit';
    this.template.scope = this;
    this.listenables = {};
    for(var key in params){ // variable binding
      dataBinding.deepProxy(this, key, _parent, params[key]);
      //this.listenables[key] = this._parent.getListenable(params[key]);
      //this.listenables[key].link(this, key);
    }
    // controller
    templateScripts[templateName].call(this.template, this);
  }

  Scope.prototype = {
    //getListenable: function(key){
    //  if(!this.listenables[key])// value was created in current scope, not inherited
   //     this.listenables[key] = new Listenable(this, key);
   //   return this.listenables[key];
   // },
    // child template
    // params  = {nameInChild: nameInParent}
    forEachInQuery: function(query, action){
      var elements = this.template.querySelectorAll(query);
      for(var i = 0; i < elements.length; i++)
        action(elements[i]);
    },
    child: function(params, templateName){
      return new Scope(this, params, templateName);
    },
    expandPath: function(path){
      var copy = arrayCopy(path), node = this;
      while(copy.length)
        node = node[copy.unshift()];
      return node;
    },
    bindTemplate: function(query, templateName, params){
      this.forEachInQuery(query, function(element){
        var child = this.child(params, templateName);
        element.innerHTML = '';
        element.appendChild(child.template);
      });
    },
    bindSwitch: function(path, actions){
      var other = actions['default'], that = this;
      delete actions['default'];
      dataBinding.addDeepOnSet(this, path, function(value){
        if(actions[value])
          actions[value].bind(that)();
        else
          other.bind(that)();
      });
    },
    // bind html
    bindContent: function(query, path){
      //var listenable = this.getListenable(key);
      var that = this;
      this.forEachInQuery(query, function(element){
        switch(element.tagName){
          case 'INPUT': case 'TEXTAREA': 
            var set = this.bindToDom(element, path, function(x){
              this.value = x;
            });
            element.onchange = element.onkeyup = function(){
              set(this.value); // set on the object currently occupying the parent slot
            }
            break;
          case 'SPAN': case 'DIV': 
          this.bindToDom(element, path, function(x){
            this.innerText = x;
          });
            break;
        }
      });
    },
    bindToDom: function(element, path, action){
      if(element.stopListening)// can only listen to one thing at a time
        element.stopListening();
      var onSetResponse = dataBinding.addDeepOnSet(this, path, action.bind(element));
      element.DOMNodeRemoved = element.stopListening = onSetResponse.stop;
      return onSetResponse.set.bind(onSetResponse);
    },
    bindButton: function(element, action){
      element.onClick = action;
    },
    bindList: function(holder, path, params, templateName){
      var that = this;
      function onChange(value){
        var subScope;
        holder.html = '';
        for(var i = 0; i < value.length; i++))
          subScope = new Scope(that, params, templateName);
          holder.appendChild(subScope.element);
        }
      }
      this.bindToDom(element, path, onChange);
    }
  }
})();

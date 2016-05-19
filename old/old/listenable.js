'use strict';
(function(){
  window.Listenable = function(_parent, key){
    if(_parent.templateName!='main') console.error('bad listenable target');
    console.log('build listenable for ', _parent.templateName, key);
    this._parent = _parent;
    this.key = key;
    this.listeners = [];
    this.privateKey = makePrivateKey(key);
    var listenable = this;
    dataBinding.actionOnSet(_parent, key, this.privateKey, function(x){ listenable.broadCast(x);} );
  }

  Listenable.prototype = {
    listen: function(action){
       this.listeners.push(action);
       return (function(){// clean up
         this.listeners.splice(this.listeners.indexOf(action, 1));    
       }).bind(this);
    },
    deepListen: function(path, action){
      var that = this, deepCleanUp;
          cleanup = this.listen(function(){
            if(deepCleanUp) // clean up from previous deep bind
              deepCleanUp();
            deepCleanUp = dataBinding.addDeepActionOnSet(that, path, action);
          });
      return function(){
        cleanUp();
        deepCleanUp();
      }
    },
    domListen: function(element, action){
      element.DOMNodeRemoved = this.listen(action.bind(element));
    },
    link: function(_parent, key){
       proxy(_parent, key, this._parent, this.key); // passed parent's key is set as proxy to this parent's this key
    },
    broadCast: function(x){
      for(var i = 0; i < this.listeners.length; i++)
        this.listeners[i](x);
    },
    bindInput: function(input){
      var that = this;
      input.value = this._parent[this.key];
      input.onchange = input.onkeyup = function(){
        that._parent[that.key] = this.value; // likely the value is proxied to a higher scope
      }
      this.domListen(input, function(value){
        this.value = value;
      });
    },
    bindText: function(element){
      element.innerText = this._parent[this.key];
      this.domListen(element, function(value){
        this.innerText = value;
      });
    }
  }
})();

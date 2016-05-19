'use strict';

(function(){
  window.templateScripts = {};
  window.templates = {}
  window.onload = function(){
    var _templates = document.querySelectorAll('[template]'), template;
    for(var i = 0; i < _templates.length; i++){
      template = _templates[i];
      window.templates[template.getAttribute('template')] = template
      template.style.display = 'none';
    }
    var main = new Scope(false, {}, 'main');// clone template, run controller
    document.querySelector('body').appendChild(main.template);
  }
})();

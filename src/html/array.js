// bind an array to a list of template instances, template takes only an index
//   holder: the element to put the template instances in
//   array: the array object to watch
//   template: the template class object
/*jshint sub:true*/
function bindArrayToHTML(holder, array, template, _parent) {
  if ((array.onCall && array.onCall.push)) return;
  let templates = []; // the list of template instance objects
  array.onSet = array.onSet || {};
  array.onSet['_length'] = array.onSet['_length'] || [];
  let cleanUpBinding;
  function cleanUp(){
    cleanUpBinding();
    clearInterval(interval);
  }
  let interval = setInterval(() => {
      if(!document.body.contains(holder)){
        cleanUp();
      }
  }, 1000);
  // array listeners
  cleanUpBinding = dataBinding.array(array, {
    push: function(x) {
      setTimeout(function() {
        var tpl = template(array.length - 1, array);
        templates.push(tpl);
        holder.appendChild(tpl.template);
      }, 1);
    },
    pop: function() {
      holder.removeChild(holder.lastChild);
      templates.pop();
    },
    unshift: function(x) {
      var tpl = template(0, array);
      templates.unshift(tpl);
      holder.insertBefore(tpl.template, holder.firstChild);
    },
    shift: function() {
      holder.removeChild(holder.firstChild);
      templates.shift();
    },
    splice: function(index, count) {
      var countCopy = count;
      while (countCopy) {
        holder.removeChild(holder.childNodes[index]);
        countCopy--;
      }
      var items = Array.prototype.slice.call(arguments, 2);
      if (items.length) {
        var createdTemplates = [],
          indexCopy = index;
        items.forEach(function(item) {
          var tpl = template(indexCopy, array);
          createdTemplates.push(tpl);
          holder.insertBefore(tpl.template, holder.children[indexCopy]);
          indexCopy++;
        });
        templates.splice.bind(templates, index, count).apply(createdTemplates);
      } else
        templates.splice(index, count);
    },
    setIndexFrom: function(index) {
      while (index < templates.length) {
        templates[index].arrayScopeSetIndex(index, array);
        index++;
      }
    },
    length: function(x) {
      dataBinding.callArray(array.onSet['_length'], [x]);
    }
  });
  // initalize
  holder.innerHTML = '';
  for (var i = 0; i < array.length; i++) {
    templates[i] = template(i, array);
    holder.appendChild(templates[i].template);
  }
}

function bindArrayPathToHTML(holder, template, _parent, path) {
  return dataBinding.addOnSet(_parent, path, function(array) {
    bindArrayToHTML(holder, array, template, _parent); //TODO: cleanUP???
  });
}

//working: push, pop, shift, unshift set value, set property
//not working: splice

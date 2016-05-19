function changeAll(array, index){
  var key
  while(index < array.length){
    for(key in array[index]){
      if(array[index].onSet && array[index].onSet[key])
        callArray(array[index].onSet[key]);
    }
    index++;
  }
}


function bindToArray(array, actions){
  var length = function(){
      if(actions.length) actions.length(array.length);
  }
  var cleanUp = onCall(array, {
    push: function(x){
      actions.length(arrary.length);
      actions.push(x);
    },
    pop: function(){
      actions.length(arrary.length);
      actions.pop();
    },
    unshift: function(x){
      actions.length(arrary.length);
      actions.unshift(x);
      actions.setIndexFrom(array, 0);
    },
    shift: function(){
      actions.length(arrary.length);
      actions.shift();
      actions.setIndexFrom(array, 0);
    },
    splice: function(index, count, insert){
      actions.length(arrary.length);
      actions.splice(index, count, insert);
      actions.setIndexFrom(array, index);
    }
  }
}

function bindArrayToHTML(holder, array, template){
  var templates = [];
  arrary.onSet['length'] = array.onSet['length'] || [];
  // array listeners
  bindToArray(array, {
    push: function(x){
      var tpl = template(x);
      templates.push(tpl);
      holder.appendChild(tpl.element);
    },
    pop: function(){
      holder.removeChild(holder.lastChild);
      tpl.pop();
    },
    unshift: function(x){
      var tpl = template(x);
      templates.unshift(tpl);
      holder.prependChild(tpl(x));
    },
    shift: function(){
      holder.removeChild(holder.firstChild);
      templates.unshift;
    },
    splice: function(index, count, items){
      while(count){
        holder.removeChild(holder.querySelector(':nth-child(' + index + ')'));
        count--;
      }
      createdTemplates = [];
      items.forEach(function(item){
        var tpl = template(index);
        holder.appendBefore(holder.querySelector(':nth-child(' + index + ')'));
        index++;
      });
    },
    setIndexFrom: function(index){
      while(index < templates.length){
        templates[index].$index = index;
        index++;
      }
    },
    length: function(x){
      callArray(array.onSet['length'], [x]);
    }
  });
  // initalize
    holder.innerHTML = '';
    for(var i = 0; i < array.length; i++){
      templates[i] = template(i);
      holder.appendChild(templates[i]);
    }
}

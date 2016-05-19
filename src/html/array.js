// bind an array to a list of template instances
// template takes only an index
// holder: the element to put the template instances in
// array: the array object to watch
// template: the template class object
function bindArrayToHTML(holder, array, template){
  var templates = []; // the list of template instance objects
  array.onSet = array.onSet || {};
  array.onSet['length'] = array.onSet['length'] || [];
  // array listeners
  if(!(array.onCall && array.onCall.push)){
    dataBinding.array(array, {
      push: function(x){
        var tpl = template(array.length - 1, array);
        templates.push(tpl);
        holder.appendChild(tpl.template);
	var arrayItem = array[array.length - 1];
        setTimeout(function(){
          tpl.$listItem = arrayItem;
	}, 1);
      },
      pop: function(){
        holder.removeChild(holder.lastChild);
        templates.pop();
      },
      unshift: function(x){
        this.removeIndexBindingsFrom(0);
        var tpl = template(0, array);
        templates.unshift(tpl);
        holder.insertBefore(tpl.template, holder.childNodes[0]);
	var that = this, arrayItem = array[0];
	setTimeout(function(){
	  that.setIndexFrom(0);
	  tpl.$listItem = arrayItem;
	}, 1);
      },
      shift: function(){
        holder.removeChild(holder.firstChild);
        templates.shift();
      },
      splice: function(index, count, items){
        while(count){
          holder.removeChild(holder.childNodes[index]);
          count--;
        }
	var boundSplice = templates.splice.bind(templates, index, count);
        var createdTemplates;
	if(items){
	  createdTemplates = [];
          items.forEach(function(item){
            var tpl = template(index, array);
            createdTemplates.push(tpl);
            holder.insertBefore(holder.querySelector(':nth-child(' + index + ')'), tpl.element);
            index++;
            templates.splice(index, count, createdTemplates);
          });
        } else
	  templates.splice(index, count);
      },
      removeIndexBindingsFrom: function(index){
         while(index < templates.length){
           templates[index].removeIndexBinding();
           index++;
	 }
      },
      setIndexFrom: function(index){
        while(index < templates.length){
          templates[index].arrayScopeSetIndex(index, array);
          index++;
        }
      },
      length: function(x){
        dataBinding.callArray(array.onSet['length'], [x]);
      }
    });
  }
  // initalize
  holder.innerHTML = '';
  for(var i = 0; i < array.length; i++){
    templates[i] = template(i, array);
    holder.appendChild(templates[i].template);
  }
}

function bindArrayPathToHTML(holder, templateName, _parent, path){
  dataBinding.addOnSet(_parent, path, function(array){
    bindArrayToHTML(holder, array, templateName);
  });
}

//working: push, pop, shift, unshift set value, set property
//not working: splice

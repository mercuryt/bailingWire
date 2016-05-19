//cause a function to be re-evaluated when any member of 'this' within the function body changes
function computedProperty(_parent, action, callback){
  var script = action.toString(),
      regex = /(?:this|scope)\.([0-9A-Za-z\.$_]+)/g,
      cleanup = [],
      match;
  function onChange(){
    callback(action());
  }
  onChange();
  while(match = regex.exec(script))
    cleanup.push(dataBinding.addOnSet(_parent, match[1], onChange));
  return callArray.bind(null, cleanup);
}

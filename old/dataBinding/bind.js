function mutualBind(to, from){
  to.set(from.get));
  from.onSet(to.set);
  to.onSet(from.set.bind(from));
}

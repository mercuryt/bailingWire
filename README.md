small and simple data binding library

leverages Object.defineProperty rather then digest / apply cycles

view code is kept near it's html template, without being mixed into it

see example files in test directory for usage


<div template="user">
  <script>
    templateScripts.userListing = function(scope, template){
      // put the user.name in the innerHTML property of the element found with css selector '.name', as restricted to this template html
      scope.bindElement('.name', 'innerHTML', 'user.name');
      
      // computed property: scope.accountAge will always be up to date 
      scope.bindComputed('accountAge', function(){
        return (new Date().getTime()) - scope.user.createdAt;
      });
      // display account age
      scope.bindElement('.accountAge', 'innerHTML', 'accountAge');
      // style based on account age
      scope.bindElement('.accountAge', 'style.color', function(){
        return scope.accountAge > ONE_YEAR ? 'red' : 'black';
      });
      // built in methods work as expected
      template.querySelector('.profile_link').addEventListener('click', function(){
        location.hash = 'user/' + scope.user.id + '/profile';
      });

    };
  </script>
  <span class="name">
  <span class="accountAge">
  <button class="profile_link"></button>
</div>

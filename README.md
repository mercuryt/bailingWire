BailingWire is a data binding library.

It should be used to build two way bindings between javascript object properties and html elements, including templating.

BailingWire is designed for speed, seperation of concerns and small code size.

Javascript is seperated from html. View code is kept near it's html template, without being mixed into it. Elements are targeted by css selectors, scoped to the associated html.

```
<div template="userListing">
  <script>
    templateScripts.userListing = function(scope, template){
      // put the user.name in the innerHTML property of the element found with css selector '.name', as restricted to this template html
      scope.$('.name').attr('innerHTML', 'user.name');
      // alternitive syntax:
      //   scope.bindElement('.name', 'innerHTML', 'user.name');
      
      // computed property: scope.accountAge will always be up to date 
      scope.bindComputed('accountAge', function(){
        return (new Date().getTime()) - scope.user.createdAt;
      });
      // display account age
      scope.$('.accountAge').
        attr('innerHTML', function(){
          return Math.round( scope.accountAge / ONE_DAY );
        }).
        // style based on account age
        attr('style.color', function(){
          return scope.accountAge > ONE_YEAR ? 'red' : 'black';
        });
      // built in methods work as expected
      template.querySelector('.profile_link').addEventListener('click', function(){
        location.hash = 'user/' + scope.user.id + '/profile';
      });
    };
  </script>
  <span class="name"></span>
  <span class="accountAge"></span> days
  <button class="profile_link"></button>
</div>
```


see more usage in examples directory


no custom markup other then the template attribute

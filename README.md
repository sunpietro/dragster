# dragster.js
Tiny vanilla JS library that enables drag'n'drop interactions to a user of your website.
By implementing this library a user is able to drag'n'drop elements on user-defined drop regions.
It works both on desktop (using mouse interface) and mobile devices (using touch interface).
It's only 3kB minified.

## The sample usage
You can start using it preparing following HTML code:

```html
<div class="dragster-region">
    <div class="dragster-block"></div>
    <div class="dragster-block"></div>
    <div class="dragster-block"></div>
</div>
```

Then add following JS code:

```javascript
new DD({
    elementSelector: '.dragster-block',
    regionSelector: '.dragster-region'
});
```

And start having fun with dragging elements on the website.

## Properties
Currently, developer should provide 2 required params:
### elementSelector (required)
It is a CSS selector to find all the elements on the page that should be draggable.
### regionSelector (required)
It is a CSS selector to find all the regions where elements can be dragged onto and where all the drag'n'drop functionality works as expected.


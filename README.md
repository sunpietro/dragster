# dragster.js

Tiny vanilla JS library that enables drag'n'drop interactions to a user of your website.
By implementing this library a user is able to drag'n'drop elements on user-defined drop regions.
It works both on desktop (using mouse interface) and mobile devices (using touch interface).
It's only 3kB minified.

See the library in action at the demo page: [Dragster.js demo page](http://sunpietro.github.io/dragster/)

## How to install?
You can install this library in two different ways:
* Clone this repository on Github,
* Install using bower (frontend dependencies manager) with following command:

    `bower install dragsterjs`

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
var dragster = new window.Dragster({
    elementSelector: '.dragster-block',
    regionSelector: '.dragster-region'
});
```

And start having fun with dragging elements on the website.

## Replace elements instead of moving them
If you want to replace elements instead of moving them between regions you can initialize Dragster.js library with an option `replaceElements: true`:

```javascript
var dragster = new window.Dragster({
    elementSelector: '.dragster-block',
    regionSelector: '.dragster-region',
    replaceElements: true
});
```

## Don't update droppable regions' height
If you don't want to update regions height value when dragging and dropping element on a region you can initialize Dragster.js library with an option `updateRegionsHeight: false`:

```javascript
var dragster = new window.Dragster({
    elementSelector: '.dragster-block',
    regionSelector: '.dragster-region',
    updateRegionsHeight: false
});
```

## Update draggable elements on demand
If you have an app where elements are added dynamically, you can update the draggable elements list on demand:

```javascript
var dragster = new window.Dragster({
    elementSelector: '.dragster-block',
    regionSelector: '.dragster-region'
});

dragster.update();
```

## Properties
List of properties:
### elementSelector (required) - {String}
It is a CSS selector to find all the elements on the page that should be draggable. Default value: `'.dragster-block'`
### regionSelector (required) - {String}
It is a CSS selector to find all the regions where elements can be dragged onto and where all the drag'n'drop functionality works as expected.
Default value: `'.dragster-region'`
### replaceElements - {Boolean}
It is indicator whether elements should be moved in regions or whether they should replace each other when user drops element.
It takes either `true` or `false` value. Default value: `false`.
### updateRegionsHeight - {Boolean}
It is indicator whether regions should update their height according to the number of elements visible in the region.
It takes either `true` or `false` value. Default value: `true`.
### minimumRegionHeight - {Integer}
Tell the dragster to not to resize the regions below provided value. Default value: `50`.

## Properties - callbacks
These properties allow a developer to control the behaviour of dragster.js library using callbacks.
When callback returns `false` value then the dragging action is cancelled.
Be careful with these callbacks as it might cause unexpected behaviour of dragged elements.
### onBeforeDragStart - {Function}
Before drag start callback. Can prevent from dragging an element.
### onAfterDragStart - {Function}
After drag start callback.
### onBeforeDragMove - {Function}
Before drag move callback. Can prevent from dropping an element.
### onAfterDragMove - {Function}
After drag move callback.
### onBeforeDragEnd - {Function}
Before drag end callback. Can prevent from dropping an element.
### onAfterDragEnd - {Function}
After drag end callback.

## Methods
List of methods ready to be used by any webdeveloper:
### update
Updates a reference to draggable elements. For example, when user adds a new element to any of droppable regions then running `update` method makes a new element draggable as well.

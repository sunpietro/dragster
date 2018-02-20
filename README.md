# dragster.js

[![DragsterJS NPM version](https://badge.fury.io/js/dragsterjs.svg)](https://badge.fury.io/js/dragsterjs)

[![DragsterJS gzip size](http://img.badgesize.io/https://unpkg.com/dragsterjs/dragster.min.js?compression=gzip
)](https://unpkg.com/dragsterjs/dragster.min.js)

Tiny vanilla JS library that enables drag'n'drop interactions to a user of your website.
By implementing this library a user is able to drag'n'drop elements on user-defined drop regions.
It works both on desktop (using mouse interface) and mobile devices (using touch interface).

See the library in action at the demo page: [Dragster.js demo page](http://sunpietro.github.io/dragster/)

## How to install?
You can install this library in two different ways:
* Clone this repository on Github,
* Install using npm (Node.js dependencies manager) with following command:

    ```
    npm install dragsterjs
    ```

* Install using bower (frontend dependencies manager) with following command:

    ```
    bower install dragsterjs
    ```
* Install using Yarn:
    
    ```
    yarn add dragsterjs
    ```

## The sample usage
To start having fun with dragging elements on the website prepare the following HTML code and add few lines of CSS:

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

If you would like to use DragsterJS as ES6 module in the browser:

```html
<script type="module">
    import Dragster from './dragster.es6.js';
    const dragster = Dragster();
</script>
```

These few lines of CSS are required to prevent issues while dropping the elements.

``` css
/*
 * Prevents user from selecting text
 * in the draggable elements
 */
[draggable] {
  -webkit-user-select: none;
     -moz-user-select: none;
      -ms-user-select: none;
          user-select: none;
}

/* 
 * Prevent the element currently being dragged from
 * receive pointer events, otherwise the dropping
 * zone behind it can't receive the hover mouse events.
 */
.dragster-temp {
  pointer-events: none;
}
```

If you need to further customize the look and feel of the elements being dragged or the dropping regions check the `dragster.style.css` file.

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

## Allow cloning blocks from a selected zones
Imagine you have a shopping cart with a list of products. You want to allow dropping multiple items into the shopping cart without removing an item from the list of available shop items.

```javascript
var dragster = new window.Dragster({
    elementSelector: '.dragster-block',
    regionSelector: '.dragster-region',
    dragOnlyRegionCssClass: 'dragster-region--drag-only',
    cloneElements: true
});
```

## Properties
List of properties:
### elementSelector (required) - {String}
It is a CSS selector to find all the elements on the page that should be draggable. Default value: `'.dragster-block'`
### regionSelector (required) - {String}
It is a CSS selector to find all the regions where elements can be dragged onto and where all the drag'n'drop functionality works as expected.
Default value: `'.dragster-region'`
### replaceOnDrop - {Boolean}
Indidator stating if dropped element should switch position with drop target.
It takes either `true` or `false` value. Default value: `false`.
### copyOnDrop - {Boolean}
Indicator stating if dropped element should be copied into a new position.
It takes either `true` or `false` value. Default value: `false`.
### updateRegionsHeight - {Boolean}
It is indicator whether regions should update their height according to the number of elements visible in the region.
It takes either `true` or `false` value. Default value: `true`.
### minimumRegionHeight - {Number}
Tell the dragster to not to resize the regions below provided value. Default value: `60`.
### scrollWindowOnDrag - {Boolean}
Tell the dragster to scroll window while dragging an element. Default value: `false`.
### dragOnlyRegionCssClass - {String}
The drag-only region CSS class name. Used to identify regions. Default value: `'dragster-region--drag-only'`.
### cloneElements - {Boolean}
The flag stating the elements can be cloned from region to region. Requires `dragOnlyRegionCssClass` to be applied in the HTML markup of a page. Default value: `false`.
### wrapDraggableElements - {Boolean}
By default all draggable elements are wrapped in a wrapper `<div>`, by settings this variable to `false` this behavior can be disabled. This can sometimes be useful when using the script in frameworks like Angular or such.

**IMPORTANT**

If you put this value to `false`, you **MUST** do the wrapping of the elements yourself.
A wrapper container looks like this `<div draggable="true" class="dragster-draggable"> ... </div>`
### shadowElementUnderMouse - {Boolean}
By default the shadow element is placed on half of its width, by setting this variable to `true` the shadow element will stays where user clicks on draggable element.

## Properties - callbacks
These properties allow a developer to control the behaviour of dragster.js library using callbacks.
All the callbacks takes **one param - the event object**, provided by Dragster.js library.
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
### onAfterDragDrop - {Function}
After drop callback.

## Methods
List of methods ready to be used by any webdeveloper:
### update
Updates a reference to draggable elements. For example, when user adds a new element to any of droppable regions then running `update` method makes a new element draggable as well.
### updateRegions
Updates regions references and attaches event listeners to them
### destroy
Removes all event listeners related to DragsterJS

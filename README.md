# dragster.js

[![DragsterJS NPM version](https://badge.fury.io/js/dragsterjs.svg)](https://badge.fury.io/js/dragsterjs)

[![DragsterJS gzip size](http://img.badgesize.io/https://unpkg.com/dragsterjs/dragster.min.js?compression=gzip
)](https://unpkg.com/dragsterjs/dragster.min.js)

Tiny vanilla JS library that enables drag'n'drop interactions to a user of your website.
By implementing this library a user is able to drag'n'drop elements on user-defined drop regions.
It works both on desktop (using mouse interface) and mobile devices (using touch interface).

See the library in action at the demo page: [Dragster.js demo page](http://sunpietro.github.io/dragster/)

## Migrating to v2.0.0

**v2.0.0 is a breaking change.** The UMD/CommonJS build has been dropped. The library is now distributed as an ES6 module only.

If you are using `require('dragsterjs')` or importing via AMD/RequireJS, you will need to migrate:

```javascript
// Before (v1.x — CommonJS, no longer works)
const Dragster = require('dragsterjs');

// After (v2.x — ES6 module)
import Dragster from 'dragsterjs';
```

Browser support is **last 3 versions** of major browsers.

## How to install?
You can install this library in several ways:
* Clone this repository on Github,
* Install using npm (Node.js dependencies manager) with following command:

    ```
    npm install dragsterjs
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
var dragster = window.Dragster({
    elementSelector: '.dragster-block',
    regionSelector: '.dragster-region'
});
```

If you would like to use DragsterJS as ES6 module in the browser:

```html
<script type="module">
    import Dragster from './dragster.js';
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
var dragster = window.Dragster({
    elementSelector: '.dragster-block',
    regionSelector: '.dragster-region',
    replaceElements: true
});
```

## Don't update droppable regions' height
If you don't want to update regions height value when dragging and dropping element on a region you can initialize Dragster.js library with an option `updateRegionsHeight: false`:

```javascript
var dragster = window.Dragster({
    elementSelector: '.dragster-block',
    regionSelector: '.dragster-region',
    updateRegionsHeight: false
});
```

## Update draggable elements on demand
If you have an app where elements are added dynamically, you can update the draggable elements list on demand:

```javascript
var dragster = window.Dragster({
    elementSelector: '.dragster-block',
    regionSelector: '.dragster-region'
});

dragster.update();
```

## Allow cloning blocks from a selected zones
Imagine you have a shopping cart with a list of products. You want to allow dropping multiple items into the shopping cart without removing an item from the list of available shop items.

```javascript
var dragster = window.Dragster({
    elementSelector: '.dragster-block',
    regionSelector: '.dragster-region',
    dragOnlyRegionCssClass: 'dragster-region--drag-only',
    cloneElements: true
});
```

## Properties
List of properties:
### elementSelector (required) - {String}
CSS selector for all elements that should be draggable. Default value: `'.dragster-block'`
### regionSelector (required) - {String}
CSS selector for all regions where drag'n'drop is active. Default value: `'.dragster-region'`
### dragHandleCssClass - {String|Boolean}
When set to a CSS class name, drag only initiates if the mousedown target has that class. Useful for implementing drag handles (e.g. a grip icon inside a card). Default value: `false` (entire element is draggable).
### replaceElements - {Boolean}
Indicator stating if dropped element should switch position with drop target.
It takes either `true` or `false` value. Default value: `false`.
### cloneElements - {Boolean}
Indicator stating if dropped element should be cloned into the new position (original stays in place).
Requires `dragOnlyRegionCssClass` to be applied in the HTML markup. It takes either `true` or `false` value. Default value: `false`.
### updateRegionsHeight - {Boolean}
It is indicator whether regions should update their height according to the number of elements visible in the region.
It takes either `true` or `false` value. Default value: `true`.
### minimumRegionHeight - {Number}
Tell the dragster to not to resize the regions below provided value. Default value: `60`.
### scrollWindowOnDrag - {Boolean}
Tell the dragster to scroll window while dragging an element. Default value: `false`.
### dragOnlyRegionCssClass - {String}
The drag-only region CSS class name. Used to identify regions. Default value: `'dragster-region--drag-only'`.
### wrapDraggableElements - {Boolean}
By default all draggable elements are wrapped in a wrapper `<div>`, by settings this variable to `false` this behavior can be disabled. This can sometimes be useful when using the script in frameworks like Angular or such.

**IMPORTANT**

If you put this value to `false`, you **MUST** do the wrapping of the elements yourself.
A wrapper container looks like this `<div draggable="true" class="dragster-draggable"> ... </div>`
### shadowElementUnderMouse - {Boolean}
By default the shadow element is placed on half of its width, by setting this variable to `true` the shadow element will stays where user clicks on draggable element.

## Properties - callbacks
These properties allow a developer to control the behaviour of dragster.js library using callbacks.
All callbacks receive **one param — a Dragster event object** with the following shape:

```javascript
{
    drag: { node },        // the element being dragged
    drop: { node },        // the element being dropped onto
    shadow: { node, top, left }, // the shadow (ghost) element and its position
    placeholder: { node, position }, // the drop placeholder ('top' or 'bottom')
    dropped: node,         // reference to the dropped element (post-drop callbacks)
    clonedFrom: node,      // source element when cloning
    clonedTo: node         // cloned element placed in the target region
}
```

Returning `false` from `onBeforeDragStart`, `onBeforeDragMove`, or `onBeforeDragEnd` cancels the action.

### onBeforeDragStart - {Function}
Called before drag starts. Return `false` to prevent the drag.
### onAfterDragStart - {Function}
Called after drag starts.
### onBeforeDragMove - {Function}
Called before each drag move. Return `false` to prevent the drop.
### onAfterDragMove - {Function}
Called after each drag move.
### onBeforeDragEnd - {Function}
Called before drag ends. Return `false` to prevent the drop.
### onAfterDragEnd - {Function}
Called after drag ends.
### onAfterDragDrop - {Function}
Called after an element is dropped.

## Methods
List of methods ready to be used by any webdeveloper:
### update
Re-scans the DOM for draggable elements matching `elementSelector`. Call this after dynamically adding new elements to a region so they become draggable.
### updateRegions
Re-scans the DOM for regions matching `regionSelector` and re-attaches event listeners. Call this after dynamically adding new regions to the page.
### destroy
Removes all event listeners added by DragsterJS. Call this when tearing down the component to prevent memory leaks.

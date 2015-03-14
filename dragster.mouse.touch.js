/*!
 * Dragster - drag'n'drop library v1.0.0
 * https://github.com/sunpietro/dragster
 *
 * Copyright 2015 Piotr Nalepa
 * http://blog.piotrnalepa.pl
 *
 * Released under the MIT license
 * https://github.com/sunpietro/dragster/blob/master/LICENSE
 *
 * Date: 2015-03-11T08:00Z
 */
(function (window, document) {
    window.DD = function (params) {
        var CLASS_DRAGGING = 'is-dragging',
            CLASS_DRAGOVER = 'is-drag-over',
            CLASS_DRAGGABLE = 'dragster-draggable',
            CLASS_REGION = 'dragster-drag-region',
            CLASS_PLACEHOLDER = 'dragster-drop-placeholder',
            CLASS_TEMP_ELEMENT = 'dragster-temp',
            CLASS_HIDDEN = 'dragster-is-hidden',
            finalParams = {
                elementSelector: '.dragster-block',
                regionSelector: '.dragster-region'
            },
            draggableAttrName = 'draggable',
            placeholderAttrName = 'data-placeholder-position',
            visiblePlaceholder = {
                top: false,
                bottom: false
            },
            key,
            regions,
            getElement,
            shadowElement,
            shadowElementRegion,
            draggedElement,
            draggableElements,
            regionEventHandlers,
            isPlaceholderCallback,
            isDraggableCallback,
            isRegionCallback,
            insertAfter,
            insertBefore,
            createElementWrapper,
            createShadowElement,
            createPlaceholder,
            removeElements;

        // merge the object with default config with an object with params provided by a developer
        for (key in params) {
            if (params.hasOwnProperty(key)) {
                finalParams[key] = params[key];
            }
        }

        // convert NodeList type objects into Array objects
        draggableElements = Array.prototype.slice.call(document.querySelectorAll(finalParams.elementSelector));
        regions = Array.prototype.slice.call(document.querySelectorAll(finalParams.regionSelector));

        /*
         * Check whether a given element meets the requirements from the callback.
         * The callback should always return Boolean value - true or false.
         * The function allows to find a correct element within the DOM.
         * If the element doesn't meet the requirements then the function tests its parent node.
         *
         * @private
         * @method getElement
         * @param element {Element} DOM element
         * @param callback {Function} testing function
         * @return {Element}
         */
        getElement = function (element, callback) {
            var parent = element.parentNode;

            if (!parent || (element.classList && element.classList.contains(CLASS_REGION))) { return undefined; }
            if (callback(element)) { return element; }

            return callback(parent) ? parent : getElement(parent, callback);
        };

        /*
         * Removes all elements defined by a selector from the DOM
         *
         * @private
         * @method removeElements
         * @param element {Element} DOM element
         */
        removeElements = function (selector) {
            var elements = Array.prototype.slice.call(document.querySelectorAll(selector));

            elements.forEach(function (element) {
                element.parentNode.removeChild(element);
            });
        };

        /*
         * Creates a wrapper for a draggable element
         *
         * @private
         * @method createElementWrapper
         * @return {Element} DOM element
         */
        createElementWrapper = function () {
            var wrapper = document.createElement('div');

            wrapper.setAttribute(draggableAttrName, true);
            wrapper.classList.add(CLASS_DRAGGABLE);

            return wrapper;
        };

        /*
         * Creates a placeholder where dragged element can be dropped into
         *
         * @private
         * @method createPlaceholder
         * @return {Element} DOM element
         */
        createPlaceholder = function () {
            var placeholder = document.createElement('div');

            placeholder.classList.add(CLASS_PLACEHOLDER);

            return placeholder;
        };

        /*
         * Creates a copy of dragged element that follows the cursor movement
         *
         * @private
         * @method createShadowElement
         * @return {Element} DOM element
         */
        createShadowElement = function () {
            var element = document.createElement('div');

            element.classList.add(CLASS_TEMP_ELEMENT);
            element.classList.add(CLASS_HIDDEN);
            document.body.appendChild(element);

            return element;
        };

        /*
         * Insert an element after a selected element
         *
         * @private
         * @method insertAfter
         * @param elementTarget {Element} dragged element
         * @param elementAfter {Element} dragged element will be placed after this element
         */
        insertAfter = function (elementTarget, elementAfter) { elementTarget.parentNode.insertBefore(elementAfter, elementTarget.nextSibling); };

        /*
         * Insert an element before a selected element
         *
         * @private
         * @method insertBefore
         * @param elementTarget {Element} dragged element
         * @param elementBefore {Element} dragged element will be placed before this element
         */
        insertBefore = function (elementTarget, elementBefore) { elementTarget.parentNode.insertBefore(elementBefore, elementTarget); };

        /*
         * Test whether an element is a region where drag'n'drop interactions are possible
         *
         * @private
         * @method isRegionCallback
         * @param element {Element}
         * @return {Boolean}
         */
        isRegionCallback = function (element) { return (element.classList && element.classList.contains(CLASS_REGION)); };

        /*
         * Test whether an element is a draggable element
         *
         * @private
         * @method isDraggableCallback
         * @param element {Element}
         * @return {Boolean}
         */
        isDraggableCallback = function (element) { return (element.classList && element.classList.contains(CLASS_DRAGGABLE)); };

        /*
         * Test whether an element is a placeholder where a user can drop a dragged element
         *
         * @private
         * @method isPlaceholderCallback
         * @param element {Element}
         * @return {Boolean}
         */
        isPlaceholderCallback = function (element) { return (element.classList && element.classList.contains(CLASS_PLACEHOLDER)); };


        regionEventHandlers = {
            /*
             * `mousedown` or `touchstart` event handler.
             * When user starts dragging an element the function adds a listener to either `mousemove` or `touchmove`
             * events. Creates a shadow element that follows a movement of the cursor.
             *
             * @private
             * @method regionEventHandlers.mousedown
             * @param event {Object} event object
             */
            mousedown: function (event) {
                event.preventDefault();

                var targetRegion,
                    listenToEventName = event.type === 'touchstart' ? 'touchmove' : 'mousemove';

                regions.forEach(function (region) {
                    region.addEventListener(listenToEventName, regionEventHandlers.mousemove);
                });

                draggedElement = getElement(event.target, isDraggableCallback);

                if (!draggedElement) {
                    return false;
                }

                targetRegion = draggedElement.getBoundingClientRect();
                shadowElement = createShadowElement();
                shadowElement.innerHTML = draggedElement.innerHTML;
                shadowElement.style.width = targetRegion.width + 'px';
                shadowElement.style.height = targetRegion.height + 'px';
                shadowElementRegion = shadowElement.getBoundingClientRect();

                draggedElement.classList.add(CLASS_DRAGGING);
            },
            /*
             * `mousemove` or `touchmove` event handler.
             * When user is moving an element the function checks whether the element is above any other draggable element.
             * In case when it is above any draggable element, the function adds a temporary placeholder before or after the given element,
             * so a user is able to drop a dragged element onto the placeholder.
             * In case when in a region there's no draggable element it just adds a placeholder to the region.
             * Updates a position of shadow element following the cursor.
             *
             * @private
             * @method regionEventHandlers.mousemove
             * @param event {Object} event object
             */
            mousemove: function (event) {
                event.preventDefault();

                var eventObject = event.changedTouches ? event.changedTouches[0] : event,
                    unknownTarget = document.elementFromPoint(eventObject.clientX, eventObject.clientY),
                    dropTarget = getElement(unknownTarget, isDraggableCallback),
                    dropTargetRegion,
                    maxDistance,
                    placeholder;

                shadowElement.style.top = (eventObject.clientY + 25) + 'px';
                shadowElement.style.left = (eventObject.clientX - (shadowElementRegion.width / 2)) + 'px';
                shadowElement.classList.remove(CLASS_HIDDEN);

                if (dropTarget && dropTarget !== draggedElement) {
                    placeholder = createPlaceholder();
                    dropTargetRegion = dropTarget.getBoundingClientRect();
                    maxDistance = dropTargetRegion.height / 2;

                    if ((eventObject.clientY - dropTargetRegion.top) < maxDistance && !visiblePlaceholder.top) {
                        removeElements('.' + CLASS_PLACEHOLDER);
                        placeholder.setAttribute(placeholderAttrName, 'top');
                        insertBefore(dropTarget.firstChild, placeholder);
                    } else if ((dropTargetRegion.bottom - eventObject.clientY) < maxDistance && !visiblePlaceholder.bottom) {
                        removeElements('.' + CLASS_PLACEHOLDER);
                        placeholder.setAttribute(placeholderAttrName, 'bottom');
                        dropTarget.appendChild(placeholder);
                    }
                } else if (unknownTarget.classList.contains(CLASS_REGION) &&
                    unknownTarget.querySelectorAll('.' + CLASS_DRAGGABLE).length === 0 &&
                    unknownTarget.querySelectorAll('.' + CLASS_PLACEHOLDER).length === 0) {
                    placeholder = createPlaceholder();
                    unknownTarget.appendChild(placeholder);
                }
            },
            /*
             * `mouseup` or `touchend` event handler.
             * When user is dropping an element, the function checks whether the element is above any other draggable element.
             * In case when it is above any draggable element, the function places the dragged element before of after the element below.
             * Removes a listener to either `mousemove` or `touchmove` event.
             * Removes placeholders.
             * Removes a shadow element.
             *
             * @private
             * @method regionEventHandlers.mouseup
             * @param event {Object} event object
             */
            mouseup: function (event) {
                var dropTarget = document.querySelector('.' + CLASS_PLACEHOLDER),
                    dropDraggableTarget,
                    placeholderPosition,
                    unlistenToEventName = event.type === 'touchstart' ? 'touchmove' : 'mousemove',
                    dropTemp;

                if (!draggedElement || !dropTarget) {
                    return false;
                }

                draggedElement.classList.remove(CLASS_DRAGGING);
                dropDraggableTarget = getElement(dropTarget, isDraggableCallback);

                dropDraggableTarget = dropDraggableTarget || dropTarget;

                if (draggedElement !== dropDraggableTarget) {
                    dropTemp = createElementWrapper();
                    dropTemp.innerHTML = draggedElement.innerHTML;
                    placeholderPosition = dropTarget.getAttribute(placeholderAttrName);

                    if (placeholderPosition === 'top') {
                        insertBefore(dropDraggableTarget, dropTemp);
                    } else {
                        insertAfter(dropDraggableTarget, dropTemp);
                    }

                    dropDraggableTarget.classList.remove(CLASS_DRAGOVER);
                    draggedElement.parentNode.removeChild(draggedElement);
                }

                regions.forEach(function (region) {
                    region.removeEventListener(unlistenToEventName, regionEventHandlers.mousemove);
                });

                removeElements('.' + CLASS_PLACEHOLDER);
                removeElements('.' + CLASS_TEMP_ELEMENT);
            }
        };

        // wrap draggable elements with a wrapper
        draggableElements.forEach(function (draggableElement) {
            var wrapper = createElementWrapper(),
                draggableParent = draggableElement.parentNode;

            draggableParent.insertBefore(wrapper, draggableElement);
            draggableParent.removeChild(draggableElement);
            wrapper.appendChild(draggableElement);
        });

        // add `mousedown`/`touchstart` and `mouseup`/`touchend` event listeners to regions
        regions.forEach(function (region) {
            region.classList.add(CLASS_REGION);
            region.addEventListener('mousedown', regionEventHandlers.mousedown, false);
            region.addEventListener('mouseup', regionEventHandlers.mouseup, false);

            region.addEventListener('touchstart', regionEventHandlers.mousedown, false);
            region.addEventListener('touchend', regionEventHandlers.mouseup, false);
        });
    };
})(window, window.document);

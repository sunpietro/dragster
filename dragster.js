/*@preserve
 * Dragster - drag'n'drop library v1.3.3
 * https://github.com/sunpietro/dragster
 *
 * Copyright 2015-2016 Piotr Nalepa
 * http://blog.piotrnalepa.pl
 *
 * Released under the MIT license
 * https://github.com/sunpietro/dragster/blob/master/LICENSE
 *
 * Date: 2016-11-23T17:20Z
 */
(function (window, document) {
    'use strict';

    window.Dragster = function (params) {
        var PREFIX_CLASS_DRAGSTER = 'dragster-',
            CLASS_DRAGGING = 'is-dragging',
            CLASS_DRAGOVER = 'is-drag-over',
            CLASS_DRAGGABLE = PREFIX_CLASS_DRAGSTER + 'draggable',
            CLASS_REGION = PREFIX_CLASS_DRAGSTER + 'drag-region',
            CLASS_PLACEHOLDER = PREFIX_CLASS_DRAGSTER + 'drop-placeholder',
            CLASS_TEMP_ELEMENT = PREFIX_CLASS_DRAGSTER + 'temp',
            CLASS_TEMP_CONTAINER = CLASS_TEMP_ELEMENT + '-container',
            CLASS_HIDDEN = PREFIX_CLASS_DRAGSTER + 'is-hidden',
            CLASS_REPLACABLE = PREFIX_CLASS_DRAGSTER + 'replacable',
            CLASS_DRAG_ONLY = PREFIX_CLASS_DRAGSTER + 'region--drag-only',
            EVT_TOUCHSTART = 'touchstart',
            EVT_TOUCHMOVE = 'touchmove',
            EVT_TOUCHEND = 'touchend',
            EVT_MOUSEDOWN = 'mousedown',
            EVT_MOUSEMOVE = 'mousemove',
            EVT_MOUSEUP = 'mouseup',
            POS_TOP = 'top',
            POS_BOTTOM = 'bottom',
            UNIT = 'px',
            DIV = 'div',
            FALSE = false,
            TRUE = true,
            dummyCallback = function () {},
            finalParams = {
                elementSelector: '.dragster-block',
                regionSelector: '.dragster-region',
                dragOnlyRegionCssClass: CLASS_DRAG_ONLY,
                replaceElements: FALSE,
                updateRegionsHeight: TRUE,
                minimumRegionHeight: 60,
                onBeforeDragStart: dummyCallback,
                onAfterDragStart: dummyCallback,
                onBeforeDragMove: dummyCallback,
                onAfterDragMove: dummyCallback,
                onBeforeDragEnd: dummyCallback,
                onAfterDragEnd: dummyCallback,
                onAfterDragDrop: dummyCallback,
                scrollWindowOnDrag: FALSE,
                dragOnlyRegionsEnabled: FALSE,
                cloneElements: FALSE,
                wrapDraggableElements: TRUE
            },
            draggableAttrName = 'draggable',
            placeholderAttrName = 'data-placeholder-position',
            visiblePlaceholder = {
                top: FALSE,
                bottom: FALSE
            },
            defaultDragsterEventInfo = {
                drag: {
                    /**
                     * Contains drag node reference
                     *
                     * @property node
                     * @type {HTMLElement}
                     */
                    node: {}
                },
                drop: {
                    /**
                     * Contains drop node reference
                     *
                     * @property node
                     * @type {HTMLElement}
                     */
                    node: {}
                },
                shadow: {
                    /**
                     * Contains shadow element node reference
                     *
                     * @property node
                     * @type {HTMLElement}
                     */
                    node: {},
                    /**
                     * Contains top position value of shadow element
                     *
                     * @property top
                     * @type {Number}
                     */
                    top: 0,
                    /**
                     * Contains left position value of shadow element
                     *
                     * @property left
                     * @type {Number}
                     */
                    left: 0
                },
                placeholder: {
                    /**
                     * Contains placeholder node reference
                     *
                     * @property node
                     * @type {HTMLElement}
                     */
                    node: {},
                    /**
                     * Contains position type of placeholder
                     *
                     * @property position
                     * @type {String}
                     * @example 'top' or 'bottom'
                     */
                    position: ''
                },
                /**
                 * Reference to dropped element
                 *
                 * @property dropped
                 * @type {HTMLElement}
                 */
                dropped: null,
                /**
                 * Reference to cloned element
                 *
                 * @property clonedFrom
                 * @type {HTMLElement}
                 */
                clonedFrom: null,
                /**
                 * Reference to dropped cloned element
                 *
                 * @property clonedTo
                 * @type {HTMLElement}
                 */
                clonedTo: null
            },
            dragsterEventInfo,
            key,
            regions,
            getElement,
            shadowElement,
            shadowElementRegion,
            tempContainer,
            draggedElement,
            draggableElements,
            regionEventHandlers,
            isPlaceholderCallback,
            isDraggableCallback,
            isInDragOnlyRegionCallback,
            insertAfter,
            insertBefore,
            createElementWrapper,
            createShadowElement,
            createPlaceholder,
            hideShadowElementTimeout,
            removeElements,
            cleanWorkspace,
            cleanReplacables,
            findDraggableElements,
            wrapDraggableElements,
            updateRegionsHeight,
            scrollWindow,
            discoverWindowHeight,
            dropActions,
            moveActions,
            windowHeight = window.innerHeight;

        // merge the object with default config with an object with params provided by a developer
        for (key in params) {
            if (params.hasOwnProperty(key)) {
                finalParams[key] = params[key];
            }
        }

        /*
         * Find all draggable elements on the page
         *
         * @private
         * @method findDraggableElements
         * @return {Array}
         */
        findDraggableElements = function () {
            return [].slice.call(document.querySelectorAll(finalParams.elementSelector));
        };

        /*
         * Wrap all elements from the `elements` param with a draggable wrapper
         *
         * @private
         * @method findDraggableElements
         * @param elements {Array}
         * @return {Array}
         */
        wrapDraggableElements = function (elements) {
            if (finalParams.wrapDraggableElements === FALSE) {
                console.warn(
                  'You have disabled the default behavior of wrapping the draggable elements, ' +
                  'if you want dragster to work properly you still will have to do this manually.\n' +
                  '\n' +
                  'More inf: https://github.com/sunpietro/dragster/blob/master/README.md#user-content-wrapdraggableelements---boolean'
                );

                return FALSE;
            }

            elements.forEach(function (draggableElement) {
                var wrapper = createElementWrapper(),
                    draggableParent = draggableElement.parentNode;

                if (draggableParent.classList.contains(CLASS_DRAGGABLE)) {
                    return FALSE;
                }

                draggableParent.insertBefore(wrapper, draggableElement);
                draggableParent.removeChild(draggableElement);
                wrapper.appendChild(draggableElement);
            });
        };

        draggableElements = findDraggableElements();
        regions = [].slice.call(document.querySelectorAll(finalParams.regionSelector));

        if (finalParams.replaceElements) {
            tempContainer = document.createElement(DIV);

            tempContainer.classList.add(CLASS_HIDDEN);
            tempContainer.classList.add(CLASS_TEMP_CONTAINER);

            document.body.appendChild(tempContainer);
        }

        /*
         * Check whether a given element meets the requirements from the callback.
         * The callback should always return Boolean value - true or false.
         * The function allows to find a correct element within the DOM.
         * If the element doesn't meet the requirements then the function tests its parent node.
         *
         * @private
         * @method getElement
         * @param element {HTMLElement} DOM element
         * @param callback {Function} testing function
         * @return {HTMLElement}
         */
        getElement = function (element, callback) {
            var parent = element.parentNode;

            if (!parent ||
                (element.classList &&
                    element.classList.contains(CLASS_REGION) &&
                    !element.classList.contains(CLASS_DRAG_ONLY))
                ) { return undefined; }

            if (callback(element)) { return element; }

            return callback(parent) ? parent : getElement(parent, callback);
        };

        /*
         * Removes all elements defined by a selector from the DOM
         *
         * @private
         * @method removeElements
         * @param element {HTMLElement} DOM element
         */
        removeElements = function (selector) {
            var elements = [].slice.call(document.getElementsByClassName(selector));

            elements.forEach(function (element) {
                element.parentNode.removeChild(element);
            });
        };

        /*
         * Removes all visible placeholders, shadow elements, empty draggable nodes
         * and removes `mousemove` event listeners from regions
         *
         * @private
         * @method cleanWorkspace
         * @param element {HTMLElement} DOM element
         * @param eventName {String} name of the event to stop listening to
         */
        cleanWorkspace = function (element, eventName) {
            if (eventName) {
                regions.forEach(function (region) {
                    region.removeEventListener(eventName, regionEventHandlers.mousemove);
                });

                document.body.removeEventListener(eventName, regionEventHandlers.mousemove);
            }

            if (element) {
                element.classList.remove(CLASS_DRAGGING);
            }

            // remove all empty draggable nodes
            [].slice.call(document.getElementsByClassName(CLASS_DRAGGABLE)).forEach(function (dragEl) {
                if (!dragEl.firstChild) {
                    dragEl.parentNode.removeChild(dragEl);
                }
            });

            removeElements(CLASS_PLACEHOLDER);
            removeElements(CLASS_TEMP_ELEMENT);
            updateRegionsHeight();
        };

        /*
         * Removes replacable classname from all replacable elements
         *
         * @private
         * @method cleanReplacables
         */
        cleanReplacables = function () {
            ([].slice.call(document.getElementsByClassName(CLASS_REPLACABLE))).forEach(function (elem) {
                elem.classList.remove(CLASS_REPLACABLE);
            });
        };

        /*
         * Creates a wrapper for a draggable element
         *
         * @private
         * @method createElementWrapper
         * @return {HTMLElement} DOM element
         */
        createElementWrapper = function () {
            var wrapper = document.createElement(DIV);

            wrapper.setAttribute(draggableAttrName, TRUE);
            wrapper.classList.add(CLASS_DRAGGABLE);

            return wrapper;
        };

        /*
         * Creates a placeholder where dragged element can be dropped into
         *
         * @private
         * @method createPlaceholder
         * @return {HTMLElement} DOM element
         */
        createPlaceholder = function () {
            var placeholder = document.createElement(DIV);

            placeholder.classList.add(CLASS_PLACEHOLDER);

            return placeholder;
        };

        /*
         * Creates a copy of dragged element that follows the cursor movement
         *
         * @private
         * @method createShadowElement
         * @return {HTMLElement} DOM element
         */
        createShadowElement = function () {
            var element = document.createElement(DIV);

            element.classList.add(CLASS_TEMP_ELEMENT);
            element.classList.add(CLASS_HIDDEN);

            element.style.position = 'fixed';

            document.body.appendChild(element);

            return element;
        };

        /*
         * Insert an element after a selected element
         *
         * @private
         * @method insertAfter
         * @param elementTarget {HTMLElement} dragged element
         * @param elementAfter {HTMLElement} dragged element will be placed after this element
         */
        insertAfter = function (elementTarget, elementAfter) {
            if (elementTarget && elementTarget.parentNode) {
                elementTarget.parentNode.insertBefore(elementAfter, elementTarget.nextSibling);
            }
        };

        /*
         * Insert an element before a selected element
         *
         * @private
         * @method insertBefore
         * @param elementTarget {HTMLElement} dragged element
         * @param elementBefore {HTMLElement} dragged element will be placed before this element
         */
        insertBefore = function (elementTarget, elementBefore) {
            if (elementTarget && elementTarget.parentNode) {
                elementTarget.parentNode.insertBefore(elementBefore, elementTarget);
            }
        };

        /*
         * Test whether an element is a draggable element
         *
         * @private
         * @method isDraggableCallback
         * @param element {HTMLElement}
         * @return {Boolean}
         */
        isDraggableCallback = function (element) { return (element.classList && element.classList.contains(CLASS_DRAGGABLE)); };

        /*
         * Test whether an element is a placeholder where a user can drop a dragged element
         *
         * @private
         * @method isPlaceholderCallback
         * @param element {HTMLElement}
         * @return {Boolean}
         */
        isPlaceholderCallback = function (element) { return (element.classList && element.classList.contains(CLASS_PLACEHOLDER)); };

        /*
         * Test whether an element belongs to drag only region
         *
         * @private
         * @method isInDragOnlyRegionCallback
         * @param element {HTMLElement}
         * @return {Boolean}
         */
        isInDragOnlyRegionCallback = function (element) { return (element.classList && element.classList.contains(finalParams.dragOnlyRegionCssClass)); }; //jshint ignore:line

        /*
         * Update the height of the regions dynamically
         *
         * @private
         * @method isPlaceholderCallback
         * @param element {HTMLElement}
         * @return {Boolean}
         */
        updateRegionsHeight = function () {
            if (finalParams.updateRegionsHeight) {
                var regions = [].slice.call(document.getElementsByClassName(CLASS_REGION));

                regions.forEach(function (region) {
                    var elements = [].slice.call(region.querySelectorAll(finalParams.elementSelector)),
                        regionHeight = finalParams.minimumRegionHeight;

                    if (!elements.length) {
                        return;
                    }

                    elements.forEach(function (element) {
                        var styles = window.getComputedStyle(element);

                        regionHeight += element.offsetHeight + parseInt(styles.marginTop, 10) + parseInt(styles.marginBottom, 10);
                    });

                    region.style.height = regionHeight + UNIT;
                });
            }
        };

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
                var targetRegion,
                    listenToEventName;

                event.dragster = dragsterEventInfo;

                if (finalParams.onBeforeDragStart(event) === FALSE || event.which === 3 /* detect right click */) {
                    return FALSE;
                }

                event.preventDefault();

                listenToEventName = event.type === EVT_TOUCHSTART ? EVT_TOUCHMOVE : EVT_MOUSEMOVE;

                regions.forEach(function (region) {
                    region.addEventListener(listenToEventName, regionEventHandlers.mousemove);
                });

                document.body.addEventListener(listenToEventName, regionEventHandlers.mousemove);

                draggedElement = getElement(event.target, isDraggableCallback);

                if (!draggedElement) {
                    return FALSE;
                }

                targetRegion = draggedElement.getBoundingClientRect();
                shadowElement = createShadowElement();
                shadowElement.innerHTML = draggedElement.innerHTML;
                shadowElement.style.width = targetRegion.width + UNIT;
                shadowElement.style.height = targetRegion.height + UNIT;
                shadowElementRegion = shadowElement.getBoundingClientRect();

                draggedElement.classList.add(CLASS_DRAGGING);

                dragsterEventInfo = JSON.parse(JSON.stringify(defaultDragsterEventInfo));
                dragsterEventInfo.drag.node = draggedElement;
                dragsterEventInfo.shadow.node = shadowElement;

                event.dragster = dragsterEventInfo;

                finalParams.onAfterDragStart(event);
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
                event.dragster = dragsterEventInfo;

                if (finalParams.onBeforeDragMove(event) === FALSE) {
                    return FALSE;
                }

                event.preventDefault();

                var eventObject = event.changedTouches ? event.changedTouches[0] : event,
                    pageXOffset = eventObject.view ? eventObject.view.pageXOffset : 0,
                    pageYOffset = eventObject.view ? eventObject.view.pageYOffset : 0,
                    elementPositionY = eventObject.clientY + pageYOffset,
                    elementPositionX = eventObject.clientX + pageXOffset,
                    unknownTarget = document.elementFromPoint(eventObject.clientX, eventObject.clientY),
                    dropTarget = getElement(unknownTarget, isDraggableCallback),
                    top = eventObject.clientY,
                    left = elementPositionX - (shadowElementRegion.width / 2),
                    isInDragOnlyRegion = !!(dropTarget && getElement(dropTarget, isInDragOnlyRegionCallback)),
                    isTargetRegion = unknownTarget.classList.contains(CLASS_REGION),
                    isTargetRegionDragOnly = unknownTarget.classList.contains(CLASS_DRAG_ONLY),
                    isTargetPlaceholder = unknownTarget.classList.contains(CLASS_PLACEHOLDER),
                    hasTargetDraggaBleElements = unknownTarget.getElementsByClassName(CLASS_DRAGGABLE).length > 0,
                    hasTargetPlaceholders = unknownTarget.getElementsByClassName(CLASS_PLACEHOLDER).length > 0;

                clearTimeout(hideShadowElementTimeout);

                shadowElement.style.top = top + UNIT;
                shadowElement.style.left = left + UNIT;
                shadowElement.classList.remove(CLASS_HIDDEN);

                dragsterEventInfo.shadow.top = top;
                dragsterEventInfo.shadow.left = left;

                if (dropTarget && dropTarget !== draggedElement && !isInDragOnlyRegion) {
                    moveActions.addPlaceholderOnTarget(dropTarget, elementPositionY, pageYOffset);
                } else if (isTargetRegion && !isTargetRegionDragOnly && !hasTargetDraggaBleElements && !hasTargetPlaceholders) {
                    moveActions.addPlaceholderInRegion(unknownTarget);
                } else if (isTargetRegion && !isTargetRegionDragOnly && hasTargetDraggaBleElements && !hasTargetPlaceholders) {
                    moveActions.addPlaceholderInRegionBelowTargets(unknownTarget);
                } else if (!isTargetRegion && !isTargetPlaceholder) {
                    moveActions.removePlaceholders();
                }

                if (finalParams.scrollWindowOnDrag) {
                    scrollWindow(event);
                }

                updateRegionsHeight();
                finalParams.onAfterDragMove(event);
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
                event.dragster = dragsterEventInfo;

                if (finalParams.onBeforeDragEnd(event) === FALSE) {
                    return FALSE;
                }

                var findByClass = finalParams.replaceElements ? CLASS_REPLACABLE : CLASS_PLACEHOLDER,
                    dropTarget = document.getElementsByClassName(findByClass)[0],
                    dropDraggableTarget,
                    isFromDragOnlyRegion = !!(draggedElement && getElement(draggedElement, isInDragOnlyRegionCallback)),
                    unlistenToEventName = event.type === EVT_TOUCHSTART ? EVT_TOUCHMOVE : EVT_MOUSEMOVE,
                    canBeCloned = finalParams.cloneElements && isFromDragOnlyRegion;

                hideShadowElementTimeout = setTimeout(function () {
                    cleanWorkspace(draggedElement, unlistenToEventName);
                }, 200);

                cleanReplacables();

                if (!draggedElement || !dropTarget) {
                    cleanWorkspace(draggedElement, unlistenToEventName);

                    return FALSE;
                }

                dropDraggableTarget = getElement(dropTarget, isDraggableCallback);
                dropDraggableTarget = dropDraggableTarget || dropTarget;

                if (draggedElement !== dropDraggableTarget) {
                    if (!finalParams.replaceElements && !canBeCloned) {
                        event.dragster = dropActions.moveElement(event.dragster, dropTarget, dropDraggableTarget);

                        finalParams.onAfterDragDrop(event);
                    } else if (finalParams.replaceElements && !canBeCloned) {
                        event.dragster = dropActions.replaceElements(event.dragster, dropDraggableTarget);

                        finalParams.onAfterDragDrop(event);
                    } else if (!finalParams.replaceElements && canBeCloned) {
                        event.dragster = dropActions.cloneElements(event.dragster, dropTarget, dropDraggableTarget);

                        finalParams.onAfterDragDrop(event);
                    }

                    dropDraggableTarget.classList.remove(CLASS_DRAGOVER);
                }

                cleanWorkspace(draggedElement, unlistenToEventName);

                finalParams.onAfterDragEnd(event);
            }
        };

        moveActions = {
            /**
             * Adds a new placeholder in relation to drop target
             *
             * @method moveActions.addPlaceholderOnTarget
             * @private
             * @param dropTarget {HTMLElement} a drop target element
             * @param elementPositionY {Number} position Y of dragged element
             * @param pageYOffset {number} position of the scroll bar
             */
            addPlaceholderOnTarget: function (dropTarget, elementPositionY, pageYOffset) {
                var dropTargetRegion = dropTarget.getBoundingClientRect(),
                    placeholder = createPlaceholder(),
                    maxDistance = dropTargetRegion.height / 2;

                cleanReplacables();

                if (!finalParams.replaceElements) {
                    if (((elementPositionY - pageYOffset) - dropTargetRegion.top) < maxDistance && !visiblePlaceholder.top) {
                        removeElements(CLASS_PLACEHOLDER);
                        placeholder.setAttribute(placeholderAttrName, POS_TOP);
                        insertBefore(dropTarget.firstChild, placeholder);

                        dragsterEventInfo.placeholder.position = POS_TOP;
                    } else if ((dropTargetRegion.bottom - (elementPositionY - pageYOffset)) < maxDistance && !visiblePlaceholder.bottom) {
                        removeElements(CLASS_PLACEHOLDER);
                        placeholder.setAttribute(placeholderAttrName, POS_BOTTOM);
                        dropTarget.appendChild(placeholder);

                        dragsterEventInfo.placeholder.position = POS_BOTTOM;
                    }
                } else {
                    dropTarget.classList.add(CLASS_REPLACABLE);
                }

                dragsterEventInfo.placeholder.node = placeholder;
                dragsterEventInfo.drop.node = dropTarget;
            },

            /**
             * Adds a new placeholder in an empty region
             *
             * @method moveActions.addPlaceholderInRegion
             * @private
             * @param regionTarget {HTMLElement} a region drop target
             */
            addPlaceholderInRegion: function (regionTarget) {
                var placeholder = createPlaceholder();

                regionTarget.appendChild(placeholder);

                dragsterEventInfo.placeholder.position = POS_BOTTOM;
                dragsterEventInfo.placeholder.node = placeholder;
                dragsterEventInfo.drop.node = regionTarget;
            },

            /**
             * Adds a new placeholder in an empty region
             *
             * @method moveActions.addPlaceholderInRegion
             * @private
             * @param regionTarget {HTMLElement} a region drop target
             */
            addPlaceholderInRegionBelowTargets: function (regionTarget) {
                var elementsInRegion = regionTarget.getElementsByClassName(CLASS_DRAGGABLE),
                    dropTarget = elementsInRegion[elementsInRegion.length - 1],
                    placeholder = createPlaceholder();

                placeholder.setAttribute(placeholderAttrName, POS_BOTTOM);
                removeElements(CLASS_PLACEHOLDER);
                dropTarget.appendChild(placeholder);

                dragsterEventInfo.placeholder.position = POS_BOTTOM;
                dragsterEventInfo.placeholder.node = placeholder;
                dragsterEventInfo.drop.node = dropTarget;
            },

            /**
             * Removes all placeholders from regions
             *
             * @method moveActions.removePlaceholders
             * @private
             */
            removePlaceholders: function () {
                if (!finalParams.replaceElements) {
                    removeElements(CLASS_PLACEHOLDER);
                } else {
                    cleanReplacables();
                }
            },
        };

        dropActions = {
            /**
             * Moves element to the final position on drop
             *
             * @method dropActions.moveElement
             * @private
             * @param dragsterEvent {Object} dragster properties from event
             * @param dropTarget {HTMLElement} region where dragged element will be placed after drop
             * @param dropDraggableTarget {HTMLElement} final destination of dragged element
             * @return {Object} updated event info
             */
            moveElement: function (dragsterEvent, dropTarget, dropDraggableTarget) {
                var dropTemp = createElementWrapper(),
                    placeholderPosition = dropTarget.getAttribute(placeholderAttrName);

                if (placeholderPosition === POS_TOP) {
                    insertBefore(dropDraggableTarget, dropTemp);
                } else {
                    insertAfter(dropDraggableTarget, dropTemp);
                }

                if (draggedElement.firstChild) {
                    dropTemp.appendChild(draggedElement.firstChild);
                }

                dragsterEvent.dropped = dropTemp;

                return dragsterEvent;
            },

            /**
             * Replaces element with target element on drop
             *
             * @method dropActions.replaceElements
             * @private
             * @param dragsterEvent {Object} dragster properties from event
             * @param dropDraggableTarget {HTMLElement} final destination of dragged element
             * @return {Object} updated event info
             */
            replaceElements: function (dragsterEvent, dropDraggableTarget) {
                var dropTemp = document.getElementsByClassName(CLASS_TEMP_CONTAINER)[0];

                dropTemp.innerHTML = draggedElement.innerHTML;

                draggedElement.innerHTML = dropDraggableTarget.innerHTML;
                dropDraggableTarget.innerHTML = dropTemp.innerHTML;
                dropTemp.innerHTML = '';
                dragsterEvent.dropped = dropTemp;

                return dragsterEvent;
            },

            /**
             * Clones element to the final position on drop
             *
             * @method dropActions.cloneElements
             * @private
             * @param dragsterEvent {Object} dragster properties from event
             * @param dropTarget {HTMLElement} region where dragged element will be placed after drop
             * @param dropDraggableTarget {HTMLElement} final destination of dragged element
             * @return {Object} updated event info
             */
            cloneElements: function (dragsterEvent, dropTarget, dropDraggableTarget) {
                var dropTemp = draggedElement.cloneNode(true),
                    placeholderPosition = dropTarget.getAttribute(placeholderAttrName);

                if (placeholderPosition === POS_TOP) {
                    insertBefore(dropDraggableTarget, dropTemp);
                } else {
                    insertAfter(dropDraggableTarget, dropTemp);
                }

                cleanWorkspace(dropTemp);

                dragsterEvent.clonedFrom = draggedElement;
                dragsterEvent.clonedTo = dropTemp;

                return dragsterEvent;
            },
        };

        /**
         * Scrolls window while dragging an element
         *
         * @method scrollWindow
         * @private
         * @param event {Object} event object
         */
        scrollWindow = function (event) {
            var eventObject = event.changedTouches ? event.changedTouches[0] : event,
                diffSize = 60;

            if (windowHeight - eventObject.clientY < diffSize) {
                window.scrollBy(0, 10);
            } else if (eventObject.clientY < diffSize) {
                window.scrollBy(0, -10);
            }
        };

        /**
         * Discovers window height
         *
         * @method discoverWindowHeight
         * @private
         */
        discoverWindowHeight = function () {
            windowHeight = window.innerHeight;
        };

        wrapDraggableElements(draggableElements);

        document.body.addEventListener(EVT_MOUSEUP, regionEventHandlers.mouseup, FALSE);
        document.body.addEventListener(EVT_TOUCHEND, regionEventHandlers.mouseup, FALSE);

        // add `mousedown`/`touchstart` and `mouseup`/`touchend` event listeners to regions
        regions.forEach(function (region) {
            region.classList.add(CLASS_REGION);
            region.addEventListener(EVT_MOUSEDOWN, regionEventHandlers.mousedown, FALSE);
            region.addEventListener(EVT_MOUSEUP, regionEventHandlers.mouseup, FALSE);

            region.addEventListener(EVT_TOUCHSTART, regionEventHandlers.mousedown, FALSE);
            region.addEventListener(EVT_TOUCHEND, regionEventHandlers.mouseup, FALSE);
        });

        window.addEventListener('resize', discoverWindowHeight, false);

        return {
            update: function () {
                wrapDraggableElements(findDraggableElements());
                updateRegionsHeight();
                discoverWindowHeight();
            }
        };
    };
})(window, window.document);

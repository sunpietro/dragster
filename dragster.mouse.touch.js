(function (window, document) {
    window.DD = function (params) {
        var CLASS_DRAGGING = 'is-dragging',
            CLASS_DRAGOVER = 'is-drag-over',
            CLASS_DRAGGABLE = 'dragster-draggable',
            CLASS_REGION = 'dragster-drag-region',
            CLASS_PLACEHOLDER = 'dragster-drop-placeholder',
            CLASS_TEMP_ELEMENT = 'dragster-temp',
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

        for (key in params) {
            if (params.hasOwnProperty(key)) {
                finalParams[key] = params[key];
            }
        }

        draggableElements = Array.prototype.slice.call(document.querySelectorAll(finalParams.elementSelector));
        regions = Array.prototype.slice.call(document.querySelectorAll(finalParams.regionSelector));

        getElement = function (element, callback) {
            var parent = element.parentNode;

            if (!parent || (element.classList && element.classList.contains(CLASS_REGION))) { return undefined; }
            if (callback(element)) { return element; }

            return callback(parent) ? parent : getElement(parent, callback);
        };

        removeElements = function (selector) {
            var elements = Array.prototype.slice.call(document.querySelectorAll(selector));

            elements.forEach(function (element) {
                element.parentNode.removeChild(element);
            });
        };

        createElementWrapper = function () {
            var wrapper = document.createElement('div');

            wrapper.setAttribute(draggableAttrName, true);
            wrapper.classList.add(CLASS_DRAGGABLE);

            return wrapper;
        };

        createPlaceholder = function () {
            var placeholder = document.createElement('div');

            placeholder.classList.add(CLASS_PLACEHOLDER);

            return placeholder;
        };

        createShadowElement = function () {
            var element = document.createElement('div');

            element.classList.add(CLASS_TEMP_ELEMENT);
            document.body.appendChild(element);

            return element;
        };

        insertAfter = function (elementTarget, elementAfter) { elementTarget.parentNode.insertBefore(elementAfter, elementTarget.nextSibling); };
        insertBefore = function (elementTarget, elementBefore) { elementTarget.parentNode.insertBefore(elementBefore, elementTarget); };
        isRegionCallback = function (element) { return (element.classList && element.classList.contains(CLASS_REGION)); };
        isDraggableCallback = function (element) { return (element.classList && element.classList.contains(CLASS_DRAGGABLE)); };
        isPlaceholderCallback = function (element) { return (element.classList && element.classList.contains(CLASS_PLACEHOLDER)); };

        regionEventHandlers = {
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
                } else if (unknownTarget.classList.contains(CLASS_REGION) && unknownTarget.querySelectorAll('.' + CLASS_DRAGGABLE).length === 0) {
                    placeholder = createPlaceholder();
                    unknownTarget.appendChild(placeholder);
                }
            },
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

        draggableElements.forEach(function (draggableElement) {
            var wrapper = createElementWrapper(),
                draggableParent = draggableElement.parentNode;

            draggableParent.insertBefore(wrapper, draggableElement);
            draggableParent.removeChild(draggableElement);
            wrapper.appendChild(draggableElement);
        });

        regions.forEach(function (region) {
            region.classList.add(CLASS_REGION);
            region.addEventListener('mousedown', regionEventHandlers.mousedown, false);
            region.addEventListener('mouseup', regionEventHandlers.mouseup, false);

            region.addEventListener('touchstart', regionEventHandlers.mousedown, false);
            region.addEventListener('touchend', regionEventHandlers.mouseup, false);
        });
    };
})(window, window.document);

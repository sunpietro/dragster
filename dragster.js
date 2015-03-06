(function (window, document) {
    window.DD = function (params) {
        var CLASS_DRAGGING = 'is-dragging',
            CLASS_DRAGOVER = 'is-drag-over',
            CLASS_DRAGGABLE = 'dragster-draggable',
            CLASS_REGION = 'dragster-drag-region',
            CLASS_PLACEHOLDER = 'dragster-drop-placeholder',
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
            draggedElement,
            draggableElements,
            elementUnderDragged,
            regionEventHandlers,
            elementEventHandlers,
            isDraggableCallback,
            createElementWrapper,
            removeElements,
            insertAfter,
            insertBefore,
            createPlaceholder;

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

        insertAfter = function (elementTarget, elementAfter) {
            elementTarget.parentNode.insertBefore(elementAfter, elementTarget.nextSibling);
        };

        insertBefore = function (elementTarget, elementBefore) {
            elementTarget.parentNode.insertBefore(elementBefore, elementTarget);
        };

        isDraggableCallback = function (element) {
            return (element.classList && element.classList.contains(CLASS_DRAGGABLE));
        };

        elementEventHandlers = {
            dragstart: function (event) {
                var target = getElement(event.target, isDraggableCallback);

                target.classList.add(CLASS_DRAGGING);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/html', target.innerHTML);

                draggedElement = target;
            },
            dragend: function (event) {
                var target = getElement(event.target, isDraggableCallback);

                if (!target) {
                    return;
                }

                target.classList.remove(CLASS_DRAGGING);
                removeElements('.' + CLASS_PLACEHOLDER);
                regions.forEach(function (region) {
                    region.setAttribute(draggableAttrName, false);
                });
            },
            dragover: function (event) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';

                return false;
            },
            dragenter: function (event) {
                var target = getElement(event.target, isDraggableCallback);

                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';

                if (elementUnderDragged !== target) {
                    if (elementUnderDragged) {
                        elementUnderDragged.classList.remove(CLASS_DRAGOVER);
                    }

                    elementUnderDragged = target;
                }

                if (draggedElement !== target) {
                    target.classList.add(CLASS_DRAGOVER);
                }
            },
            dragdrop: function (event) {
                var target,
                    placeholder,
                    placeholderPosition,
                    newElement;

                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';

                if (event.target.classList && event.target.classList.contains(CLASS_PLACEHOLDER)) {
                    target = placeholder = event.target;
                } else {
                    target = getElement(event.target, isDraggableCallback);
                    placeholder = target.querySelector('.' + CLASS_PLACEHOLDER);
                }

                event.stopPropagation();

                if (draggedElement !== target && placeholder) {
                    placeholderPosition = placeholder.getAttribute(placeholderAttrName);
                    newElement = createElementWrapper();

                    newElement.innerHTML = event.dataTransfer.getData('text/html');

                    if (placeholderPosition === 'top') {
                        insertBefore(target, newElement);
                    } else {
                        insertAfter(target, newElement);
                    }

                    target.classList.remove(CLASS_DRAGOVER);
                    draggedElement.parentNode.removeChild(draggedElement);
                }

                removeElements('.' + CLASS_PLACEHOLDER);

                return false;
            }
        };

        createElementWrapper = function () {
            var wrapper = document.createElement('div');

            wrapper.setAttribute(draggableAttrName, true);
            wrapper.classList.add(CLASS_DRAGGABLE);
            wrapper.addEventListener('dragstart', elementEventHandlers.dragstart, false);
            wrapper.addEventListener('dragend', elementEventHandlers.dragend, false);
            wrapper.addEventListener('dragenter', elementEventHandlers.dragenter, false);
            wrapper.addEventListener('dragover', elementEventHandlers.dragover, false);
            wrapper.addEventListener('drop', elementEventHandlers.dragdrop, false);

            return wrapper;
        };

        createPlaceholder = function () {
            var placeholder = document.createElement('div');

            placeholder.classList.add(CLASS_PLACEHOLDER);
            placeholder.addEventListener('dragover', elementEventHandlers.dragover, false);
            placeholder.addEventListener('drop', elementEventHandlers.dragdrop, false);

            return placeholder;
        };

        regionEventHandlers = {
            dragover: function (event) {
                var target = getElement(event.target, isDraggableCallback),
                    placeholder = createPlaceholder(),
                    maxDistance,
                    targetRegion;

                if (target) {
                    targetRegion = target.getBoundingClientRect();
                    maxDistance = targetRegion.height / 2;

                    if (target.classList.contains(CLASS_DRAGGING)) { return; }

                    if ((event.clientY - targetRegion.top) < maxDistance && !visiblePlaceholder.top) {
                        removeElements('.' + CLASS_PLACEHOLDER);
                        placeholder.setAttribute(placeholderAttrName, 'top');
                        insertBefore(target.firstChild, placeholder);
                    } else if ((targetRegion.bottom - event.clientY) < maxDistance && !visiblePlaceholder.bottom) {
                        removeElements('.' + CLASS_PLACEHOLDER);
                        placeholder.setAttribute(placeholderAttrName, 'bottom');
                        target.appendChild(placeholder);
                    }
                } else if (this.querySelectorAll('.' + CLASS_DRAGGABLE).length === 0 && this.querySelectorAll('.' + CLASS_PLACEHOLDER).length === 0) {
                    this.appendChild(placeholder);
                } else if (this.querySelectorAll('.' + CLASS_DRAGGABLE).length === 0 && this.querySelectorAll('.' + CLASS_PLACEHOLDER).length === 1) {
                    return;
                } else {
                    removeElements('.' + CLASS_PLACEHOLDER);
                }
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
            region.addEventListener('dragover', regionEventHandlers.dragover);
        });
    };
})(window, window.document);

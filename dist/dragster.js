"use strict";
/* eslint-env browser */
const CLASS_DRAGGING = 'is-dragging';
const CLASS_DRAGOVER = 'is-drag-over';
const CLASS_DRAGGABLE = 'dragster-draggable';
const CLASS_REGION = 'dragster-drag-region';
const CLASS_PLACEHOLDER = 'dragster-drop-placeholder';
const CLASS_TEMP_ELEMENT = 'dragster-temp';
const CLASS_TEMP_CONTAINER = 'dragster-temp-container';
const CLASS_HIDDEN = 'dragster-is-hidden';
const CLASS_REPLACABLE = 'dragster-replacable';
const EVT_TOUCHSTART = 'touchstart';
const EVT_TOUCHMOVE = 'touchmove';
const EVT_TOUCHEND = 'touchend';
const EVT_MOUSEDOWN = 'mousedown';
const EVT_MOUSEMOVE = 'mousemove';
const EVT_MOUSEUP = 'mouseup';
const UNIT = 'px';
const DIV = 'div';
var EPosition;
(function (EPosition) {
    EPosition["top"] = "top";
    EPosition["bottom"] = "bottom";
})(EPosition || (EPosition = {}));
const checkIsTouchEvent = (event) => {
    return Object.prototype.hasOwnProperty.call(event, 'changedTouches');
};
const checkIsUIEvent = (event) => {
    return Object.prototype.hasOwnProperty.call(event, 'view');
};
/**
 * Scrolls window while dragging an element
 */
const scrollWindow = (event) => {
    const eventObject = checkIsTouchEvent(event)
        ? event.changedTouches[0]
        : event;
    const diffSize = 60;
    if (window.innerHeight - eventObject.clientY < diffSize) {
        window.scrollBy(0, 10);
    }
    else if (eventObject.clientY < diffSize) {
        window.scrollBy(0, -10);
    }
};
const Dragster = ({ elementSelector = '.dragster-block', regionSelector = '.dragster-region', dragOnlyRegionCssClass = 'dragster-region--drag-only', shouldReplaceElements = false, shouldUpdateRegionsHeight = true, minimumRegionHeight = 60, onBeforeDragStart = () => { }, onAfterDragStart = () => { }, onBeforeDragMove = () => { }, onAfterDragMove = () => { }, onBeforeDragEnd = () => { }, onAfterDragEnd = () => { }, onAfterDragDrop = () => { }, shouldScrollWindowOnDrag = false, isDragOnlyRegionsEnabled = false, shouldWrapDraggableElements = true, shouldPlaceShadowElementUnderMouse = false, }) => {
    const visiblePlaceholder = {
        top: false,
        bottom: false,
    };
    const defaultDragsterEventInfo = {
        drag: {
            /**
             * Contains drag node reference
             *
             * @property node
             * @type {HTMLElement}
             */
            node: null,
        },
        drop: {
            /**
             * Contains drop node reference
             *
             * @property node
             * @type {HTMLElement}
             */
            node: null,
        },
        shadow: {
            /**
             * Contains shadow element node reference
             *
             * @property node
             * @type {HTMLElement}
             */
            node: null,
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
            left: 0,
        },
        placeholder: {
            /**
             * Contains placeholder node reference
             *
             * @property node
             * @type {HTMLElement}
             */
            node: null,
            /**
             * Contains position type of placeholder
             *
             * @property position
             * @type {String}
             * @example 'top' or 'bottom'
             */
            position: null,
        },
        /**
         * Reference to dropped element
         *
         * @property dropped
         * @type {HTMLElement}
         */
        dropped: {
            node: null,
        },
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
        clonedTo: null,
    };
    const initDragsterEventInfo = () => {
        let dragsterInfo = JSON.parse(JSON.stringify(defaultDragsterEventInfo));
        return (options) => {
            if (!options) {
                return dragsterInfo;
            }
            dragsterInfo = Object.assign(Object.assign({}, dragsterInfo), options);
            return dragsterInfo;
        };
    };
    const updateDragsterEventInfo = initDragsterEventInfo();
    let regions;
    let shadowElement;
    let shadowElementRegion;
    let tempContainer;
    let draggedElement = null;
    let draggableElements;
    let hideShadowElementTimeout;
    let shadowElementPositionXDiff;
    let shadowElementPositionYDiff;
    const dragsterId = Math.floor((1 + Math.random()) * 0x10000).toString(16);
    /*
     * Find all draggable elements on the page
     */
    const findDraggableElements = () => {
        return [...document.querySelectorAll(elementSelector)];
    };
    /*
     * Find all regions elements on the page
     */
    const findRegionElements = () => {
        return [...document.querySelectorAll(regionSelector)];
    };
    /*
     * Wrap all elements from the `elements` param with a draggable wrapper
     *
     * @private
     * @method findDraggableElements
     * @param elements {Array}
     * @return {Array}
     */
    const wrapDraggableElements = (elements) => {
        if (!shouldWrapDraggableElements) {
            console.warn('You have disabled the default behavior of wrapping the draggable elements. ' +
                'If you want Dragster.js to work properly you still will have to do this manually.\n' +
                '\n' +
                'More info: https://github.com/sunpietro/dragster/blob/master/README.md#user-content-wrapdraggableelements---boolean');
            return;
        }
        elements.forEach((draggableElement) => {
            const wrapper = createElementWrapper();
            const draggableParent = draggableElement.parentElement;
            if (!draggableParent ||
                draggableParent.classList.contains(CLASS_DRAGGABLE)) {
                return;
            }
            draggableParent.insertBefore(wrapper, draggableElement);
            draggableParent.removeChild(draggableElement);
            wrapper.appendChild(draggableElement);
        });
    };
    draggableElements = findDraggableElements();
    regions = findRegionElements();
    if (shouldReplaceElements) {
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
     */
    const getElement = (element, callback) => {
        if (!element) {
            return null;
        }
        const parent = element.parentElement;
        const isRegion = element.classList.contains(CLASS_REGION);
        const isDragOnly = element.classList.contains(dragOnlyRegionCssClass);
        if (!parent || (isRegion && !isDragOnly)) {
            return null;
        }
        if (callback(element)) {
            return element;
        }
        return callback(parent) ? parent : getElement(parent, callback);
    };
    /*
     * Removes all elements defined by a selector from the DOM
     */
    const removeElements = (selector) => {
        const elements = [
            ...document.getElementsByClassName(selector),
        ];
        elements.forEach((element) => {
            if (!element.parentElement ||
                element.dataset.dragsterId !== dragsterId) {
                return;
            }
            element.parentElement.removeChild(element);
        });
    };
    /*
     * Removes all visible placeholders, shadow elements, empty draggable nodes
     * and removes `mousemove` event listeners from regions
     */
    const cleanWorkspace = (element, eventName) => {
        if (eventName) {
            regions.forEach((region) => {
                region.removeEventListener(eventName, regionEventHandlers.mousemove);
            });
            document.body.removeEventListener(eventName, regionEventHandlers.mousemove);
        }
        if (element) {
            element.classList.remove(CLASS_DRAGGING);
        }
        // remove all empty draggable nodes
        [...document.getElementsByClassName(CLASS_DRAGGABLE)].forEach((dragEl) => {
            var _a;
            if (dragEl.firstChild) {
                return;
            }
            (_a = dragEl.parentElement) === null || _a === void 0 ? void 0 : _a.removeChild(dragEl);
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
    const cleanReplacables = () => {
        [...document.getElementsByClassName(CLASS_REPLACABLE)].forEach((elem) => {
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
    const createElementWrapper = () => {
        const wrapper = document.createElement(DIV);
        wrapper.classList.add(CLASS_DRAGGABLE);
        wrapper.dataset.dragsterId = dragsterId;
        return wrapper;
    };
    /*
     * Creates a placeholder where dragged element can be dropped into
     */
    const createPlaceholder = () => {
        const placeholder = document.createElement(DIV);
        placeholder.classList.add(CLASS_PLACEHOLDER);
        placeholder.dataset.dragsterId = dragsterId;
        return placeholder;
    };
    /*
     * Creates a copy of dragged element that follows the cursor movement
     */
    const createShadowElement = () => {
        const element = document.createElement(DIV);
        element.classList.add(CLASS_TEMP_ELEMENT, CLASS_HIDDEN);
        element.style.position = 'fixed';
        element.dataset.dragsterId = dragsterId;
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
    const insertAfter = (elementTarget, elementAfter) => {
        if (elementTarget.parentElement) {
            const refChild = !shouldWrapDraggableElements
                ? elementTarget
                : elementTarget.nextSibling;
            elementTarget.parentElement.insertBefore(elementAfter, refChild);
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
    const insertBefore = (elementTarget, elementBefore) => {
        if (!elementTarget.parentElement) {
            return;
        }
        elementTarget.parentElement.insertBefore(elementBefore, elementTarget);
    };
    /*
     * Test whether an element is a draggable element
     *
     * @private
     * @method isDraggableCallback
     * @param element {HTMLElement}
     * @return {Boolean}
     */
    const isDraggableCallback = (element) => {
        return (element.classList.contains(CLASS_DRAGGABLE) &&
            element.dataset.dragsterId === dragsterId);
    };
    /*
     * Test whether an element belongs to drag only region
     *
     * @private
     * @method isInDragOnlyRegionCallback
     * @param element {HTMLElement}
     * @return {Boolean}
     */
    const isInDragOnlyRegionCallback = (element) => {
        return element.classList.contains(dragOnlyRegionCssClass);
    };
    /*
     * Update the height of the regions dynamically
     *
     * @private
     * @method updateRegionsHeight
     * @param element {HTMLElement}
     * @return {Boolean}
     */
    const updateRegionsHeight = () => {
        if (shouldUpdateRegionsHeight) {
            const regions = [
                ...document.getElementsByClassName(CLASS_REGION),
            ];
            regions.forEach((region) => {
                const elements = [
                    ...region.querySelectorAll(elementSelector),
                ];
                let regionHeight = minimumRegionHeight;
                if (!elements.length) {
                    return;
                }
                elements.forEach((element) => {
                    const styles = window.getComputedStyle(element);
                    regionHeight +=
                        element.offsetHeight +
                            parseInt(styles.marginTop, 10) +
                            parseInt(styles.marginBottom, 10);
                });
                region.style.height = regionHeight + UNIT;
            });
        }
    };
    /**
     * Resets DragsterJS workspace by removing mouseup/touchend event listeners
     */
    const resetDragsterWorkspace = (moveEvent, upEvent) => {
        if (!draggedElement) {
            return;
        }
        cleanWorkspace(draggedElement, moveEvent);
        cleanWorkspace(draggedElement, upEvent);
    };
    const regionEventHandlers = {
        /*
         * `mousedown` or `touchstart` event handler.
         * When user starts dragging an element the function adds a listener to either `mousemove` or `touchmove`
         * events. Creates a shadow element that follows a movement of the cursor.
         *
         * @private
         * @method regionEventHandlers.mousedown
         * @param event {Object} event object
         */
        mousedown: (event) => {
            const isTouch = event.type === EVT_TOUCHSTART;
            const eventObject = checkIsTouchEvent(event)
                ? event.changedTouches[0]
                : event;
            const dragsterInfo = updateDragsterEventInfo();
            event.dragster = dragsterInfo;
            if (onBeforeDragStart(event) === false ||
                event.which === 3 /* detect right click */) {
                return;
            }
            event.preventDefault();
            draggedElement = getElement(event.target, isDraggableCallback);
            if (!draggedElement) {
                return false;
            }
            const moveEvent = isTouch ? EVT_TOUCHMOVE : EVT_MOUSEMOVE;
            const upEvent = isTouch ? EVT_TOUCHEND : EVT_MOUSEUP;
            regions.forEach((region) => {
                region.addEventListener(moveEvent, regionEventHandlers.mousemove, false);
                region.addEventListener(upEvent, regionEventHandlers.mouseup, false);
            });
            document.body.addEventListener(moveEvent, regionEventHandlers.mousemove, false);
            document.body.addEventListener(upEvent, regionEventHandlers.mouseup, false);
            const targetRegion = draggedElement.getBoundingClientRect();
            shadowElementPositionXDiff =
                targetRegion.left - eventObject.clientX;
            shadowElementPositionYDiff = targetRegion.top - eventObject.clientY;
            shadowElement = createShadowElement();
            shadowElement.innerHTML = draggedElement.innerHTML;
            shadowElement.style.width = targetRegion.width + UNIT;
            shadowElement.style.height = targetRegion.height + UNIT;
            shadowElement.dataset.dragsterId = dragsterId;
            shadowElementRegion = shadowElement.getBoundingClientRect();
            draggedElement.classList.add(CLASS_DRAGGING);
            event.dragster = updateDragsterEventInfo({
                drag: {
                    node: draggedElement,
                },
                shadow: {
                    node: shadowElement,
                    top: dragsterInfo.shadow.top,
                    left: dragsterInfo.shadow.left,
                },
            });
            onAfterDragStart(event);
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
        mousemove: (event) => {
            event.dragster = updateDragsterEventInfo();
            console.log('mousemove', event);
            if (onBeforeDragMove(event) === false || !shadowElementRegion) {
                return false;
            }
            event.preventDefault();
            const eventObject = checkIsTouchEvent(event)
                ? event.changedTouches[0]
                : event;
            const pageXOffset = checkIsUIEvent(event)
                ? // @ts-ignore
                    eventObject.view.pageXOffset
                : 0;
            const pageYOffset = checkIsUIEvent(event)
                ? // @ts-ignore
                    eventObject.view.pageYOffset
                : 0;
            const elementPositionY = eventObject.clientY + pageYOffset;
            const elementPositionX = eventObject.clientX + pageXOffset;
            const unknownTarget = document.elementFromPoint(eventObject.clientX, eventObject.clientY);
            const dropTarget = getElement(unknownTarget, isDraggableCallback);
            const top = shouldPlaceShadowElementUnderMouse
                ? eventObject.clientY + shadowElementPositionYDiff
                : eventObject.clientY;
            const left = shouldPlaceShadowElementUnderMouse
                ? elementPositionX + shadowElementPositionXDiff
                : elementPositionX - shadowElementRegion.width / 2;
            const isDragNodeAvailable = event.dragster.drag.node && event.dragster.drag.node.dataset;
            const isInDragOnlyRegion = !!(dropTarget && getElement(dropTarget, isInDragOnlyRegionCallback));
            const isAllowedTarget = unknownTarget.dataset.dragsterId === dragsterId;
            const isTargetRegion = unknownTarget.classList.contains(CLASS_REGION) &&
                isAllowedTarget;
            const isTargetRegionDragOnly = unknownTarget.classList.contains(dragOnlyRegionCssClass) &&
                isAllowedTarget;
            const isTargetPlaceholder = unknownTarget.classList.contains(CLASS_PLACEHOLDER);
            const hasTargetDraggaBleElements = unknownTarget.getElementsByClassName(CLASS_DRAGGABLE).length >
                0;
            const hasTargetPlaceholders = unknownTarget.getElementsByClassName(CLASS_PLACEHOLDER).length >
                0;
            clearTimeout(hideShadowElementTimeout);
            shadowElement.style.top = top + UNIT;
            shadowElement.style.left = left + UNIT;
            shadowElement.classList.remove(CLASS_HIDDEN);
            event.dragster = updateDragsterEventInfo({
                shadow: {
                    node: shadowElement,
                    top,
                    left,
                },
            });
            if (!isDragNodeAvailable &&
                !isTargetRegion &&
                !isTargetPlaceholder) {
                console.log('remove', !isDragNodeAvailable, !isTargetRegion, !isTargetPlaceholder);
                moveActions.removePlaceholders();
            }
            else if (dropTarget &&
                dropTarget !== draggedElement &&
                !isInDragOnlyRegion) {
                console.log('add:target');
                moveActions.removePlaceholders();
                moveActions.addPlaceholderOnTarget(dropTarget, elementPositionY, pageYOffset);
            }
            else if (isTargetRegion &&
                !isTargetRegionDragOnly &&
                !hasTargetDraggaBleElements &&
                !hasTargetPlaceholders) {
                console.log('add:region');
                moveActions.removePlaceholders();
                moveActions.addPlaceholderInRegion(unknownTarget);
            }
            else if (isTargetRegion &&
                !isTargetRegionDragOnly &&
                hasTargetDraggaBleElements &&
                !hasTargetPlaceholders) {
                moveActions.removePlaceholders();
                moveActions.addPlaceholderInRegionBelowTargets(unknownTarget);
            }
            if (shouldScrollWindowOnDrag) {
                scrollWindow(event);
            }
            updateRegionsHeight();
            onAfterDragMove(event);
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
        mouseup: (event) => {
            event.dragster = updateDragsterEventInfo();
            const isTouch = event.type === EVT_TOUCHSTART;
            const moveEvent = isTouch ? EVT_TOUCHMOVE : EVT_MOUSEMOVE;
            const upEvent = isTouch ? EVT_TOUCHEND : EVT_MOUSEUP;
            if (onBeforeDragEnd(event) === false) {
                resetDragsterWorkspace(moveEvent, upEvent);
                return false;
            }
            const findByClass = shouldReplaceElements
                ? CLASS_REPLACABLE
                : CLASS_PLACEHOLDER;
            const dropTarget = document.getElementsByClassName(findByClass)[0];
            const isFromDragOnlyRegion = !!(draggedElement &&
                getElement(draggedElement, isInDragOnlyRegionCallback));
            const canBeCloned = isDragOnlyRegionsEnabled && isFromDragOnlyRegion;
            hideShadowElementTimeout = setTimeout(resetDragsterWorkspace, 200);
            cleanReplacables();
            if (!draggedElement || !dropTarget) {
                resetDragsterWorkspace(moveEvent, upEvent);
                return false;
            }
            let dropDraggableTarget = getElement(dropTarget, isDraggableCallback);
            dropDraggableTarget = dropDraggableTarget || dropTarget;
            if (draggedElement !== dropDraggableTarget) {
                if (!shouldReplaceElements && !canBeCloned) {
                    event.dragster = dropActions.moveElement(dropTarget, dropDraggableTarget);
                    onAfterDragDrop(event);
                }
                else if (shouldReplaceElements && !canBeCloned) {
                    event.dragster = dropActions.replaceElements(dropDraggableTarget);
                    onAfterDragDrop(event);
                }
                else if (!shouldReplaceElements && canBeCloned) {
                    event.dragster = dropActions.cloneElements(dropTarget, dropDraggableTarget);
                    onAfterDragDrop(event);
                }
                dropDraggableTarget.classList.remove(CLASS_DRAGOVER);
            }
            resetDragsterWorkspace(moveEvent, upEvent);
            onAfterDragEnd(event);
        },
    };
    const moveActions = {
        /**
         * Adds a new placeholder in relation to drop target
         *
         * @method moveActions.addPlaceholderOnTarget
         * @private
         * @param dropTarget {HTMLElement} a drop target element
         * @param elementPositionY {Number} position Y of dragged element
         * @param pageYOffset {Number} position of the scroll bar
         */
        addPlaceholderOnTarget: (dropTarget, elementPositionY, pageYOffset) => {
            const dropTargetRegion = dropTarget.getBoundingClientRect();
            const placeholder = createPlaceholder();
            const maxDistance = dropTargetRegion.height / 2;
            cleanReplacables();
            let dragsterInfo = updateDragsterEventInfo();
            if (!shouldReplaceElements) {
                if (elementPositionY - pageYOffset - dropTargetRegion.top <
                    maxDistance &&
                    !visiblePlaceholder.top) {
                    removeElements(CLASS_PLACEHOLDER);
                    placeholder.dataset.placeholderPosition = EPosition.top;
                    insertBefore(dropTarget.firstChild, placeholder);
                    updateDragsterEventInfo({
                        placeholder: {
                            node: dragsterInfo.placeholder.node,
                            position: EPosition.top,
                        },
                        drop: {
                            node: dropTarget,
                        },
                    });
                }
                else if (dropTargetRegion.bottom - (elementPositionY - pageYOffset) <
                    maxDistance &&
                    !visiblePlaceholder.bottom) {
                    removeElements(CLASS_PLACEHOLDER);
                    placeholder.dataset.placeholderPosition = EPosition.bottom;
                    dropTarget.appendChild(placeholder);
                    updateDragsterEventInfo({
                        placeholder: {
                            node: dragsterInfo.placeholder.node,
                            position: EPosition.bottom,
                        },
                        drop: {
                            node: dropTarget,
                        },
                    });
                }
            }
            else {
                dropTarget.classList.add(CLASS_REPLACABLE);
                updateDragsterEventInfo({
                    placeholder: {
                        node: placeholder,
                        position: dragsterInfo.placeholder.position,
                    },
                    drop: {
                        node: dropTarget,
                    },
                });
            }
        },
        /**
         * Adds a new placeholder in an empty region
         *
         * @method moveActions.addPlaceholderInRegion
         * @private
         * @param regionTarget {HTMLElement} a region drop target
         */
        addPlaceholderInRegion: (regionTarget) => {
            const placeholder = createPlaceholder();
            regionTarget.appendChild(placeholder);
            updateDragsterEventInfo({
                placeholder: {
                    position: EPosition.bottom,
                    node: placeholder,
                },
                drop: {
                    node: regionTarget,
                },
            });
        },
        /**
         * Adds a new placeholder in an empty region
         *
         * @method moveActions.addPlaceholderInRegion
         * @private
         * @param regionTarget {HTMLElement} a region drop target
         */
        addPlaceholderInRegionBelowTargets: (regionTarget) => {
            const elementsInRegion = [
                ...regionTarget.getElementsByClassName(CLASS_DRAGGABLE),
            ];
            const filteredElements = elementsInRegion.filter((elementInRegion) => elementInRegion.dataset.dragsterId === dragsterId);
            const dropTarget = filteredElements[filteredElements.length - 1];
            const placeholder = createPlaceholder();
            placeholder.dataset.placeholderPosition = EPosition.bottom;
            removeElements(CLASS_PLACEHOLDER);
            dropTarget.appendChild(placeholder);
            updateDragsterEventInfo({
                placeholder: {
                    position: EPosition.bottom,
                    node: placeholder,
                },
                drop: {
                    node: dropTarget,
                },
            });
        },
        /**
         * Removes all placeholders from regions
         *
         * @method moveActions.removePlaceholders
         * @private
         */
        removePlaceholders: () => {
            if (!shouldReplaceElements) {
                return removeElements(CLASS_PLACEHOLDER);
            }
            cleanReplacables();
        },
    };
    const dropActions = {
        /**
         * Moves element to the final position on drop
         */
        moveElement: (dropTarget, dropDraggableTarget) => {
            const dragsterInfo = updateDragsterEventInfo();
            if (!draggedElement) {
                return dragsterInfo;
            }
            const dropTemp = !shouldWrapDraggableElements
                ? draggedElement
                : createElementWrapper();
            const placeholderPosition = dropTarget.dataset.placeholderPosition;
            if (placeholderPosition === EPosition.top) {
                insertBefore(dropDraggableTarget, dropTemp);
            }
            else {
                if (!shouldWrapDraggableElements) {
                    insertAfter(dropTemp, dropDraggableTarget);
                }
                else {
                    insertAfter(dropDraggableTarget, dropTemp);
                }
            }
            if (draggedElement.firstChild && shouldWrapDraggableElements) {
                dropTemp.appendChild(draggedElement.firstChild);
            }
            return updateDragsterEventInfo({
                dropped: {
                    node: dropTemp,
                },
            });
        },
        /**
         * Replaces element with target element on drop
         */
        replaceElements: (dropDraggableTarget) => {
            let dragsterInfo = updateDragsterEventInfo();
            if (!draggedElement) {
                return dragsterInfo;
            }
            const dropTemp = document.getElementsByClassName(CLASS_TEMP_CONTAINER)[0];
            dropTemp.innerHTML = draggedElement.innerHTML;
            draggedElement.innerHTML = dropDraggableTarget.innerHTML;
            dropDraggableTarget.innerHTML = dropTemp.innerHTML;
            dropTemp.innerHTML = '';
            dragsterInfo = updateDragsterEventInfo({
                dropped: {
                    node: dropTemp,
                },
            });
            return dragsterInfo;
        },
        /**
         * Clones element to the final position on dro
         */
        cloneElements: (dropTarget, dropDraggableTarget) => {
            const dragsterInfo = updateDragsterEventInfo();
            if (!draggedElement) {
                return dragsterInfo;
            }
            const dropTemp = draggedElement.cloneNode(true);
            const placeholderPosition = dropTarget.dataset.placeholderPosition;
            if (placeholderPosition === EPosition.top) {
                insertBefore(dropDraggableTarget, dropTemp);
            }
            else {
                insertAfter(dropDraggableTarget, dropTemp);
            }
            cleanWorkspace(dropTemp);
            return updateDragsterEventInfo({
                clonedFrom: draggedElement,
                clonedTo: dropTemp,
            });
        },
    };
    wrapDraggableElements(draggableElements);
    /**
     * Adds event listeners to the regions
     *
     * @method addEventListenersToRegions
     * @private
     */
    const addEventListenersToRegions = () => {
        // add `mousedown`/`touchstart` and `mouseup`/`touchend` event listeners to regions
        regions.forEach((region) => {
            region.classList.add(CLASS_REGION);
            region.dataset.dragsterId = dragsterId;
            region.addEventListener(EVT_MOUSEDOWN, regionEventHandlers.mousedown, false);
            region.addEventListener(EVT_TOUCHSTART, regionEventHandlers.mousedown, false);
        });
    };
    addEventListenersToRegions();
    return {
        update: () => {
            draggableElements = findDraggableElements();
            wrapDraggableElements(draggableElements);
            updateRegionsHeight();
        },
        updateRegions: () => {
            regions = findRegionElements();
            addEventListenersToRegions();
        },
        destroy: () => {
            regions.forEach((region) => {
                region.classList.remove(CLASS_REGION);
                region.removeEventListener(EVT_MOUSEDOWN, regionEventHandlers.mousedown, false);
                region.removeEventListener(EVT_MOUSEMOVE, regionEventHandlers.mousemove, false);
                region.removeEventListener(EVT_MOUSEUP, regionEventHandlers.mouseup, false);
                region.removeEventListener(EVT_TOUCHSTART, regionEventHandlers.mousedown, false);
                region.removeEventListener(EVT_TOUCHMOVE, regionEventHandlers.mousemove, false);
                region.removeEventListener(EVT_TOUCHEND, regionEventHandlers.mouseup, false);
            });
            document.body.removeEventListener(EVT_MOUSEMOVE, regionEventHandlers.mousemove, false);
            document.body.removeEventListener(EVT_TOUCHMOVE, regionEventHandlers.mousemove, false);
            document.body.removeEventListener(EVT_MOUSEUP, regionEventHandlers.mouseup, false);
            document.body.removeEventListener(EVT_TOUCHEND, regionEventHandlers.mouseup, false);
        },
    };
};
//# sourceMappingURL=dragster.js.map
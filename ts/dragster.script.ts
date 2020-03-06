import { EDomEvent, EVisualPosition } from './enums';
import { IDragsterEventInfo, IMouseTouchEvent } from './interfaces';
import { TDragster } from './types';

const dummyCallback = () => {};
const CLASS_DRAGGING = 'is-dragging';
const CLASS_DRAGOVER = 'is-drag-over';
const CLASS_DRAGGABLE = 'dragster-draggable';
const CLASS_REGION = 'dragster-drag-region';
const CLASS_PLACEHOLDER = 'dragster-drop-placeholder';
const CLASS_TEMP_ELEMENT = 'dragster-temp';
const CLASS_TEMP_CONTAINER = 'dragster-temp-container';
const CLASS_HIDDEN = 'dragster-is-hidden';
const CLASS_REPLACABLE = 'dragster-replacable';

// eslint-disable-next-line
const Dragster: TDragster = function({
  elementSelector = '.dragster-block',
  regionSelector = '.dragster-region',
  dragHandleCssClass = false,
  dragOnlyRegionCssClass = 'dragster-region--drag-only',
  replaceElements = false,
  updateRegionsHeight = true,
  minimumRegionHeight = 60,
  onBeforeDragStart = dummyCallback,
  onAfterDragStart = dummyCallback,
  onBeforeDragMove = dummyCallback,
  onAfterDragMove = dummyCallback,
  onBeforeDragEnd = dummyCallback,
  onAfterDragEnd = dummyCallback,
  onAfterDragDrop = dummyCallback,
  scrollWindowOnDrag = false,
  cloneElements = false,
  wrapDraggableElements = true,
  shadowElementUnderMouse = false,
}) {
  const dragsterId = Math.floor((1 + Math.random()) * 0x10000).toString(16);
  /*
   * Check whether a given element meets the requirements from the callback.
   * The callback should always return Boolean value - true or false.
   * The function allows to find a correct element within the DOM.
   * If the element doesn't meet the requirements then the function tests its parent node.
   */
  const getElement = (
    element: HTMLElement,
    callback: (element: HTMLElement) => boolean
  ): HTMLElement | void => {
    const parent = element.parentNode as HTMLElement;

    if (
      !parent ||
      (element.classList &&
        element.classList.contains(CLASS_REGION) &&
        !element.classList.contains(dragOnlyRegionCssClass))
    ) {
      return;
    }

    if (callback(element)) {
      return element;
    }

    return callback(parent) ? parent : getElement(parent, callback);
  };
  const createElement = (classnames: string) => {
    const elementAfter = document.createElement('div');

    elementAfter.classList.add(classnames);
    elementAfter.dataset.dragsterId = dragsterId;

    return elementAfter;
  };
  /*
   * Insert an element after a selected element
   */
  const insertAfter = (
    elementTarget: HTMLElement,
    elementAfter: HTMLElement
  ): void => {
    if (elementTarget && elementTarget.parentNode) {
      const refChild = wrapDraggableElements
        ? elementTarget
        : elementTarget.nextSibling;

      elementTarget.parentNode.insertBefore(elementAfter, refChild);
    }
  };
  /*
   * Insert an element before a selected element
   */
  const insertBefore = (
    elementTarget: HTMLElement,
    elementBefore: HTMLElement
  ): void => {
    if (elementTarget && elementTarget.parentNode) {
      elementTarget.parentNode.insertBefore(elementBefore, elementTarget);
    }
  };
  /*
   * Creates a wrapper for a draggable element
   */
  const createElementWrapper = (): HTMLElement =>
    createElement(CLASS_DRAGGABLE);
  /*
   * Creates a copy of dragged element that follows the cursor movement
   */
  const createShadowElement = (): HTMLElement => {
    const element = createElement(`${CLASS_TEMP_ELEMENT} ${CLASS_HIDDEN}`);

    element.style.position = 'fixed';
    document.body.appendChild(element);

    return element;
  };
  /*
   * Creates a placeholder where dragged element can be dropped into
   */
  const createPlaceholder = (): HTMLElement => createElement(CLASS_PLACEHOLDER);
  /*
   * Removes all elements defined by a selector from the DOM
   */
  const removeElements = (selector: string): void => {
    const elements = [
      ...document.getElementsByClassName(selector),
    ] as HTMLElement[];

    elements.forEach(function(element) {
      if (element.dataset.dragsterId !== dragsterId) {
        return;
      }

      element.parentNode.removeChild(element);
    });
  };
  /*
   * Removes all visible placeholders, shadow elements, empty draggable nodes
   * and removes `mousemove` event listeners from regions
   */
  const cleanWorkspace = ({
    element,
    eventName,
    regions,
  }: {
    element?: HTMLElement;
    eventName?: string;
    regions: HTMLElement[];
  }): void => {
    if (eventName) {
      regions.forEach(function(region) {
        region.removeEventListener(eventName, regionEventHandlers.mousemove);
      });

      document.body.removeEventListener(
        eventName,
        regionEventHandlers.mousemove
      );
    }

    if (element) {
      element.classList.remove(CLASS_DRAGGING);
    }

    // remove all empty draggable nodes
    [...document.getElementsByClassName(CLASS_DRAGGABLE)].forEach((dragEl) => {
      if (!dragEl.firstChild) {
        dragEl.parentNode.removeChild(dragEl);
      }
    });

    removeElements(CLASS_PLACEHOLDER);
    removeElements(CLASS_TEMP_ELEMENT);
    fnUpdateRegionsHeight();
  };
  /*
   * Removes replacable classname from all replacable elements
   */
  const cleanReplacables = (): void => {
    [...document.getElementsByClassName(CLASS_REPLACABLE)].forEach((elem) =>
      elem.classList.remove(CLASS_REPLACABLE)
    );
  };
  /*
   * Find all draggable elements on the page
   */
  const findDraggableElements = (): HTMLElement[] =>
    [...document.querySelectorAll(elementSelector)] as HTMLElement[];
  /*
   * Find all regions elements on the page
   */
  const findRegionElements = (): HTMLElement[] =>
    [...document.querySelectorAll(regionSelector)] as HTMLElement[];
  /*
   * Wrap all elements from the `elements` param with a draggable wrapper
   */
  const fnWrapDraggableElements = (elements: HTMLElement[]): void => {
    if (wrapDraggableElements === false) {
      console.warn(
        'You have disabled the default behavior of wrapping the draggable elements. ' +
          'If you want Dragster.js to work properly you still will have to do this manually.\n' +
          '\n' +
          'More info: https://github.com/sunpietro/dragster/blob/master/README.md#user-content-wrapdraggableelements---boolean'
      );

      return;
    }

    elements.forEach((draggableElement) => {
      const draggableParent = draggableElement.parentNode as HTMLElement;

      if (draggableParent.classList.contains(CLASS_DRAGGABLE)) {
        return;
      }

      const wrapper = createElementWrapper();

      draggableParent.insertBefore(wrapper, draggableElement);
      draggableParent.removeChild(draggableElement);
      wrapper.appendChild(draggableElement);
    });
  };
  /*
   * Update the height of the regions dynamically
   */
  const fnUpdateRegionsHeight = (): void => {
    if (!updateRegionsHeight) {
      return;
    }

    const regions = [
      ...document.getElementsByClassName(CLASS_REGION),
    ] as HTMLElement[];

    regions.forEach((region) => {
      const elements = [
        ...region.querySelectorAll(elementSelector),
      ] as HTMLElement[];

      if (!elements.length) {
        return;
      }

      let regionHeight = minimumRegionHeight;

      elements.forEach((element) => {
        const styles = window.getComputedStyle(element);

        regionHeight +=
          element.offsetHeight +
          parseInt(styles.marginTop, 10) +
          parseInt(styles.marginBottom, 10);
      });

      region.style.height = regionHeight + 'px';
    });
  };
  /*
   * Test whether an element is a draggable element
   */
  const isDraggableCallback = (element: HTMLElement): boolean =>
    element.classList &&
    element.classList.contains(CLASS_DRAGGABLE) &&
    element.dataset.dragsterId === dragsterId;
  /*
   * Test whether an element belongs to drag only region
   */
  const isInDragOnlyRegionCallback = (element: HTMLElement): boolean =>
    element.classList && element.classList.contains(dragOnlyRegionCssClass);
  /**
   * Resets DragsterJS workspace by removing mouseup/touchend event listeners
   */
  const resetDragsterWorkspace = (
    moveEvent: string,
    upEvent: string,
    regions: HTMLElement[]
  ): void => {
    cleanWorkspace({ element: draggedElement, eventName: moveEvent, regions });
    cleanWorkspace({ element: draggedElement, eventName: upEvent, regions });
  };
  /**
   * Scrolls window while dragging an element
   */
  const scrollWindow = (event: IMouseTouchEvent) => {
    const { changedTouches } = event;
    const positionY = (changedTouches ? changedTouches[0] : event).clientY;
    const diffSize = 60;

    if (windowHeight - positionY < diffSize) {
      window.scrollBy(0, 10);
    } else if (positionY < diffSize) {
      window.scrollBy(0, -10);
    }
  };
  /**
   * Discovers window height
   */
  const discoverWindowHeight = (): void => {
    windowHeight = window.innerHeight;
  };
  /**
   * Adds event listeners to the regions
   */
  const addEventListenersToRegions = (regions: HTMLElement[]) => {
    // add `mousedown`/`touchstart` and `mouseup`/`touchend`
    // event listeners to regions
    regions.forEach((region) => {
      region.classList.add(CLASS_REGION);
      region.dataset.dragsterId = dragsterId;

      region.addEventListener(
        EDomEvent.MOUSEDOWN,
        regionEventHandlers.mousedown,
        false
      );
      region.addEventListener(
        EDomEvent.TOUCHSTART,
        regionEventHandlers.mousedown,
        false
      );
    });
  };
  let visiblePlaceholder = {
    top: false,
    bottom: false,
  };
  let defaultDragsterEventInfo: IDragsterEventInfo;
  let dragsterEventInfo: IDragsterEventInfo;
  let shadowElement;
  let shadowElementRegion;
  let draggedElement;
  let regionEventHandlers;
  let hideShadowElementTimeout;
  let dropActions;
  let moveActions;
  let shadowElementPositionXDiff;
  let shadowElementPositionYDiff;
  let windowHeight = window.innerHeight;

  let draggableElements = findDraggableElements();
  let regions = findRegionElements();

  if (replaceElements) {
    document.body.appendChild(
      createElement(`${CLASS_HIDDEN} ${CLASS_TEMP_CONTAINER}`)
    );
  }

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
    mousedown: function(event) {
      if (
        dragHandleCssClass &&
        (typeof dragHandleCssClass !== 'string' ||
          !event.target.classList.contains(dragHandleCssClass))
      ) {
        return false;
      }

      var targetRegion,
        moveEvent,
        upEvent,
        isTouch = event.type === EDomEvent.TOUCHSTART,
        eventObject = event.changedTouches ? event.changedTouches[0] : event;

      dragsterEventInfo = JSON.parse(JSON.stringify(defaultDragsterEventInfo));
      event.dragster = dragsterEventInfo;

      if (
        onBeforeDragStart(event) === false ||
        event.which === 3 /* detect right click */
      ) {
        return false;
      }

      event.preventDefault();

      draggedElement = getElement(event.target, isDraggableCallback);

      if (!draggedElement) {
        return false;
      }

      moveEvent = isTouch ? EDomEvent.TOUCHMOVE : EDomEvent.MOUSEMOVE;
      upEvent = isTouch ? EDomEvent.TOUCHEND : EDomEvent.MOUSEUP;

      regions.forEach(function(region) {
        region.addEventListener(
          moveEvent,
          regionEventHandlers.mousemove,
          false
        );
        region.addEventListener(upEvent, regionEventHandlers.mouseup, false);
      });

      document.body.addEventListener(
        moveEvent,
        regionEventHandlers.mousemove,
        false
      );
      document.body.addEventListener(
        upEvent,
        regionEventHandlers.mouseup,
        false
      );

      targetRegion = draggedElement.getBoundingClientRect();

      shadowElementPositionXDiff = targetRegion.left - eventObject.clientX;
      shadowElementPositionYDiff = targetRegion.top - eventObject.clientY;

      shadowElement = createShadowElement();
      shadowElement.innerHTML = draggedElement.innerHTML;
      shadowElement.style.width = targetRegion.width + 'px';
      shadowElement.style.height = targetRegion.height + 'px';
      shadowElement.dataset.dragsterId = dragsterId;
      shadowElementRegion = shadowElement.getBoundingClientRect();

      draggedElement.classList.add(CLASS_DRAGGING);

      dragsterEventInfo.drag.node = draggedElement;
      dragsterEventInfo.shadow.node = shadowElement;

      event.dragster = dragsterEventInfo;

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
    mousemove: function(event) {
      event.dragster = dragsterEventInfo;

      if (onBeforeDragMove(event) === false || !shadowElementRegion) {
        return false;
      }

      event.preventDefault();

      var eventObject = event.changedTouches ? event.changedTouches[0] : event,
        pageXOffset = eventObject.view ? eventObject.view.pageXOffset : 0,
        pageYOffset = eventObject.view ? eventObject.view.pageYOffset : 0,
        elementPositionY = eventObject.clientY + pageYOffset,
        elementPositionX = eventObject.clientX + pageXOffset,
        unknownTarget = document.elementFromPoint(
          eventObject.clientX,
          eventObject.clientY
        ) as HTMLElement,
        dropTarget = getElement(unknownTarget, isDraggableCallback),
        top = shadowElementUnderMouse
          ? eventObject.clientY + shadowElementPositionYDiff
          : eventObject.clientY,
        left = shadowElementUnderMouse
          ? elementPositionX + shadowElementPositionXDiff
          : elementPositionX - shadowElementRegion.width / 2,
        isDragNodeAvailable =
          dragsterEventInfo.drag.node && dragsterEventInfo.drag.node.dataset,
        isInDragOnlyRegion = !!(
          dropTarget && getElement(dropTarget, isInDragOnlyRegionCallback)
        ),
        isAllowedTarget = unknownTarget.dataset.dragsterId === dragsterId,
        isTargetRegion =
          unknownTarget.classList.contains(CLASS_REGION) && isAllowedTarget,
        isTargetRegionDragOnly =
          unknownTarget.classList.contains(dragOnlyRegionCssClass) &&
          isAllowedTarget,
        isTargetPlaceholder = unknownTarget.classList.contains(
          CLASS_PLACEHOLDER
        ),
        hasTargetDraggaBleElements =
          unknownTarget.getElementsByClassName(CLASS_DRAGGABLE).length > 0,
        hasTargetPlaceholders =
          unknownTarget.getElementsByClassName(CLASS_PLACEHOLDER).length > 0;

      clearTimeout(hideShadowElementTimeout);

      shadowElement.style.top = top + 'px';
      shadowElement.style.left = left + 'px';
      shadowElement.classList.remove(CLASS_HIDDEN);

      dragsterEventInfo.shadow.top = top;
      dragsterEventInfo.shadow.left = left;

      if (!isDragNodeAvailable && !isTargetRegion && !isTargetPlaceholder) {
        moveActions.removePlaceholders();
      } else if (
        dropTarget &&
        dropTarget !== draggedElement &&
        !isInDragOnlyRegion
      ) {
        moveActions.removePlaceholders();
        moveActions.addPlaceholderOnTarget(
          dropTarget,
          elementPositionY,
          pageYOffset
        );
      } else if (
        isTargetRegion &&
        !isTargetRegionDragOnly &&
        !hasTargetDraggaBleElements &&
        !hasTargetPlaceholders
      ) {
        moveActions.removePlaceholders();
        moveActions.addPlaceholderInRegion(unknownTarget);
      } else if (
        isTargetRegion &&
        !isTargetRegionDragOnly &&
        hasTargetDraggaBleElements &&
        !hasTargetPlaceholders
      ) {
        moveActions.removePlaceholders();
        moveActions.addPlaceholderInRegionBelowTargets(unknownTarget);
      }

      if (scrollWindowOnDrag) {
        scrollWindow(event);
      }

      fnUpdateRegionsHeight();
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
    mouseup: function(event) {
      event.dragster = dragsterEventInfo;

      var isTouch = event.type === EDomEvent.TOUCHSTART,
        moveEvent = isTouch ? EDomEvent.TOUCHMOVE : EDomEvent.MOUSEMOVE,
        upEvent = isTouch ? EDomEvent.TOUCHEND : EDomEvent.MOUSEUP,
        findByClass,
        dropTarget,
        dropDraggableTarget,
        isFromDragOnlyRegion,
        canBeCloned;

      if (onBeforeDragEnd(event) === false) {
        resetDragsterWorkspace(moveEvent, upEvent, regions);

        return false;
      }

      findByClass = replaceElements ? CLASS_REPLACABLE : CLASS_PLACEHOLDER;
      dropTarget = document.getElementsByClassName(findByClass)[0];
      isFromDragOnlyRegion = !!(
        draggedElement && getElement(draggedElement, isInDragOnlyRegionCallback)
      );
      canBeCloned = cloneElements && isFromDragOnlyRegion;
      hideShadowElementTimeout = setTimeout(
        () => resetDragsterWorkspace(moveEvent, upEvent, regions),
        200
      );

      cleanReplacables();

      if (!draggedElement || !dropTarget) {
        resetDragsterWorkspace(moveEvent, upEvent, regions);

        return false;
      }

      dropDraggableTarget = getElement(dropTarget, isDraggableCallback);
      dropDraggableTarget = dropDraggableTarget || dropTarget;

      if (draggedElement !== dropDraggableTarget) {
        if (!replaceElements && !canBeCloned) {
          event.dragster = dropActions.moveElement(
            event.dragster,
            dropTarget,
            dropDraggableTarget
          );

          onAfterDragDrop(event);
        } else if (replaceElements && !canBeCloned) {
          event.dragster = dropActions.replaceElements(
            event.dragster,
            dropDraggableTarget
          );

          onAfterDragDrop(event);
        } else if (!replaceElements && canBeCloned) {
          event.dragster = dropActions.cloneElements(
            event.dragster,
            dropTarget,
            dropDraggableTarget
          );

          onAfterDragDrop(event);
        }

        dropDraggableTarget.classList.remove(CLASS_DRAGOVER);
      }

      resetDragsterWorkspace(moveEvent, upEvent, regions);

      onAfterDragEnd(event);
    },
  };

  moveActions = {
    /**
     * Adds a new placeholder in relation to drop target
     *
     * @method moveActions.addPlaceholderOnTarget
     * @private
     * @param dropTarget {HTMLElement} a drop target element
     * @param elementPositionY {Number} position Y of dragged element
     * @param pageYOffset {Number} position of the scroll bar
     */
    addPlaceholderOnTarget: function(
      dropTarget,
      elementPositionY,
      pageYOffset
    ) {
      var dropTargetRegion = dropTarget.getBoundingClientRect(),
        placeholder = createPlaceholder(),
        maxDistance = dropTargetRegion.height / 2;

      cleanReplacables();

      if (!replaceElements) {
        if (
          elementPositionY - pageYOffset - dropTargetRegion.top < maxDistance &&
          !visiblePlaceholder.top
        ) {
          removeElements(CLASS_PLACEHOLDER);
          placeholder.dataset.placeholderPosition = EVisualPosition.TOP;
          insertBefore(dropTarget.firstChild, placeholder);

          dragsterEventInfo.placeholder.position = EVisualPosition.TOP;
        } else if (
          dropTargetRegion.bottom - (elementPositionY - pageYOffset) <
            maxDistance &&
          !visiblePlaceholder.bottom
        ) {
          removeElements(CLASS_PLACEHOLDER);
          placeholder.dataset.placeholderPosition = EVisualPosition.BOTTOM;
          dropTarget.appendChild(placeholder);

          dragsterEventInfo.placeholder.position = EVisualPosition.BOTTOM;
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
    addPlaceholderInRegion: function(regionTarget) {
      var placeholder = createPlaceholder();

      regionTarget.appendChild(placeholder);

      dragsterEventInfo.placeholder.position = EVisualPosition.BOTTOM;
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
    addPlaceholderInRegionBelowTargets: function(regionTarget) {
      var elementsInRegion = [].slice.call(
          regionTarget.getElementsByClassName(CLASS_DRAGGABLE)
        ),
        filteredElements = elementsInRegion.filter(function(elementInRegion) {
          return elementInRegion.dataset.dragsterId === dragsterId;
        }),
        dropTarget = filteredElements[filteredElements.length - 1],
        placeholder = createPlaceholder();

      placeholder.dataset.placeholderPosition = EVisualPosition.BOTTOM;
      removeElements(CLASS_PLACEHOLDER);
      dropTarget.appendChild(placeholder);

      dragsterEventInfo.placeholder.position = EVisualPosition.BOTTOM;
      dragsterEventInfo.placeholder.node = placeholder;
      dragsterEventInfo.drop.node = dropTarget;
    },

    /**
     * Removes all placeholders from regions
     *
     * @method moveActions.removePlaceholders
     * @private
     */
    removePlaceholders: function() {
      if (!replaceElements) {
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
    moveElement: function(dragsterEvent, dropTarget, dropDraggableTarget) {
      var dropTemp =
          wrapDraggableElements === false
            ? draggedElement
            : createElementWrapper(),
        placeholderPosition = dropTarget.dataset.placeholderPosition;

      if (placeholderPosition === EVisualPosition.TOP) {
        insertBefore(dropDraggableTarget, dropTemp);
      } else {
        if (wrapDraggableElements === false) {
          insertAfter(dropTemp, dropDraggableTarget);
        } else {
          insertAfter(dropDraggableTarget, dropTemp);
        }
      }

      if (draggedElement.firstChild && wrapDraggableElements === true) {
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
    replaceElements: function(dragsterEvent, dropDraggableTarget) {
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
    cloneElements: function(dragsterEvent, dropTarget, dropDraggableTarget) {
      var dropTemp = draggedElement.cloneNode(true),
        placeholderPosition = dropTarget.dataset.placeholderPosition;

      if (placeholderPosition === EVisualPosition.TOP) {
        insertBefore(dropDraggableTarget, dropTemp);
      } else {
        insertAfter(dropDraggableTarget, dropTemp);
      }

      cleanWorkspace({ element: dropTemp, regions });

      dragsterEvent.clonedFrom = draggedElement;
      dragsterEvent.clonedTo = dropTemp;

      return dragsterEvent;
    },
  };

  fnWrapDraggableElements(draggableElements);
  addEventListenersToRegions(regions);

  window.addEventListener('resize', discoverWindowHeight, false);

  return {
    update: () => {
      draggableElements = findDraggableElements();

      fnWrapDraggableElements(draggableElements);
      fnUpdateRegionsHeight();
      discoverWindowHeight();
    },
    updateRegions: () => {
      regions = findRegionElements();

      addEventListenersToRegions(regions);
    },
    destroy: () => {
      regions.forEach((region) => {
        region.classList.remove(CLASS_REGION);

        region.removeEventListener(
          EDomEvent.MOUSEDOWN,
          regionEventHandlers.mousedown
        );
        region.removeEventListener(
          EDomEvent.MOUSEMOVE,
          regionEventHandlers.mousemove
        );
        region.removeEventListener(
          EDomEvent.MOUSEUP,
          regionEventHandlers.mouseup
        );

        region.removeEventListener(
          EDomEvent.TOUCHSTART,
          regionEventHandlers.mousedown
        );
        region.removeEventListener(
          EDomEvent.TOUCHMOVE,
          regionEventHandlers.mousemove
        );
        region.removeEventListener(
          EDomEvent.TOUCHEND,
          regionEventHandlers.mouseup
        );
      });

      document.body.removeEventListener(
        EDomEvent.MOUSEMOVE,
        regionEventHandlers.mousemove
      );
      document.body.removeEventListener(
        EDomEvent.TOUCHMOVE,
        regionEventHandlers.mousemove
      );
      document.body.removeEventListener(
        EDomEvent.MOUSEUP,
        regionEventHandlers.mouseup
      );
      document.body.removeEventListener(
        EDomEvent.TOUCHEND,
        regionEventHandlers.mouseup
      );

      window.removeEventListener('resize', discoverWindowHeight);
    },
  };
};

import { EDomEvent, EVisualPosition } from './enums';
import {
  IDragsterEventInfo,
  IMouseTouchEvent,
  IDragsterEvent,
} from './interfaces';
import { TDragster } from './types';
import {
  moveElementOnDrop,
  cloneElementsOnDrop,
  replaceElementsOnDrop,
} from './actions/drop';
import {
  addPlaceholderOnTargetOnMove,
  addPlaceholderInRegionOnMove,
  addPlaceholderInRegionBelowTargetsOnMove,
} from './actions/move';

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
export const Dragster: TDragster = function({
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
  const createElement = (classnames: string[]) => {
    const elementAfter = document.createElement('div');

    elementAfter.classList.add(...classnames);
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
    elementTarget: ChildNode,
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
    createElement([CLASS_DRAGGABLE]);
  /*
   * Creates a copy of dragged element that follows the cursor movement
   */
  const createShadowElement = (): HTMLElement => {
    const element = createElement([CLASS_TEMP_ELEMENT, CLASS_HIDDEN]);

    element.style.position = 'fixed';
    document.body.appendChild(element);

    return element;
  };
  /*
   * Creates a placeholder where dragged element can be dropped into
   */
  const createPlaceholder = (): HTMLElement =>
    createElement([CLASS_PLACEHOLDER]);
  /*
   * Removes all elements defined by a selector from the DOM
   */
  const removeElements = (selector: string): void => {
    const elements = [
      ...document.getElementsByClassName(selector),
    ] as HTMLElement[];

    elements.forEach((element) => {
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
  const scrollWindow = (event: IMouseTouchEvent): void => {
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
  const addEventListenersToRegions = (regions: HTMLElement[]): void => {
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
  /**
   * Removes all placeholders from regions
   */
  const removePlaceholders = (): void => {
    if (!replaceElements) {
      removeElements(CLASS_PLACEHOLDER);
    } else {
      cleanReplacables();
    }
  };
  let visiblePlaceholder: {
    top: boolean;
    bottom: boolean;
  } = {
    top: false,
    bottom: false,
  };
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
      createElement([CLASS_HIDDEN, CLASS_TEMP_CONTAINER])
    );
  }

  regionEventHandlers = {
    /*
     * `mousedown` or `touchstart` event handler.
     * When user starts dragging an element
     * the function adds a listener to either
     * `mousemove` or `touchmove` events.
     * Creates a shadow element that follows a movement of the cursor.
     */
    mousedown: (event: IDragsterEvent): void => {
      const { which: keyId, changedTouches, type } = event;
      const target = event.target as HTMLElement;

      if (
        dragHandleCssClass &&
        (typeof dragHandleCssClass !== 'string' ||
          !target.classList.contains(dragHandleCssClass))
      ) {
        return;
      }

      if (
        onBeforeDragStart(event) === false ||
        keyId === 3 /* detect right click */
      ) {
        return;
      }

      event.preventDefault();

      draggedElement = getElement(target, isDraggableCallback);

      if (!draggedElement) {
        return;
      }

      const isTouch = type === EDomEvent.TOUCHSTART;
      const eventObject = changedTouches ? changedTouches[0] : event;
      const moveEvent = isTouch ? EDomEvent.TOUCHMOVE : EDomEvent.MOUSEMOVE;
      const upEvent = isTouch ? EDomEvent.TOUCHEND : EDomEvent.MOUSEUP;
      const { mousemove, mouseup } = regionEventHandlers;

      regions.forEach((region) => {
        region.addEventListener(moveEvent, mousemove, false);
        region.addEventListener(upEvent, mouseup, false);
      });

      document.body.addEventListener(moveEvent, mousemove, false);
      document.body.addEventListener(upEvent, mouseup, false);

      const targetRegion = draggedElement.getBoundingClientRect();

      shadowElementPositionXDiff = targetRegion.left - eventObject.clientX;
      shadowElementPositionYDiff = targetRegion.top - eventObject.clientY;

      shadowElement = createShadowElement();
      shadowElement.innerHTML = draggedElement.innerHTML;
      shadowElement.style.width = targetRegion.width + 'px';
      shadowElement.style.height = targetRegion.height + 'px';
      shadowElement.dataset.dragsterId = dragsterId;
      shadowElementRegion = shadowElement.getBoundingClientRect();

      draggedElement.classList.add(CLASS_DRAGGING);

      dragsterEventInfo = {
        drag: { node: draggedElement },
        drop: { node: null },
        shadow: { node: shadowElement, top: null, left: null },
        placeholder: { node: null, position: null },
        dropped: null,
        clonedFrom: null,
        clonedTo: null,
      } as IDragsterEventInfo;

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
     */
    mousemove: (event: IDragsterEvent): void => {
      event.dragster = dragsterEventInfo;

      if (onBeforeDragMove(event) === false || !shadowElementRegion) {
        return;
      }

      event.preventDefault();

      const eventObject = (event.changedTouches
        ? event.changedTouches.item(0)
        : event) as IMouseTouchEvent;
      const { view, clientX, clientY } = eventObject;
      const pageXOffset = view ? view.pageXOffset : 0;
      const pageYOffset = view ? view.pageYOffset : 0;
      const elementPositionY = clientY + pageYOffset;
      const elementPositionX = clientX + pageXOffset;
      const unknownTarget = document.elementFromPoint(
        clientX,
        clientY
      ) as HTMLElement;
      const dropTarget = getElement(
        unknownTarget,
        isDraggableCallback
      ) as HTMLElement;
      const top = shadowElementUnderMouse
        ? clientY + shadowElementPositionYDiff
        : clientY;
      const left = shadowElementUnderMouse
        ? elementPositionX + shadowElementPositionXDiff
        : elementPositionX - shadowElementRegion.width / 2;
      const isDragNodeAvailable =
        dragsterEventInfo.drag.node && dragsterEventInfo.drag.node.dataset;
      const isInDragOnlyRegion = !!(
        dropTarget && getElement(dropTarget, isInDragOnlyRegionCallback)
      );
      const isAllowedTarget = unknownTarget.dataset.dragsterId === dragsterId;
      const isTargetRegion =
        unknownTarget.classList.contains(CLASS_REGION) && isAllowedTarget;
      const isTargetRegionDragOnly =
        unknownTarget.classList.contains(dragOnlyRegionCssClass) &&
        isAllowedTarget;
      const isTargetPlaceholder = unknownTarget.classList.contains(
        CLASS_PLACEHOLDER
      );
      const hasTargetDraggaBleElements =
        unknownTarget.getElementsByClassName(CLASS_DRAGGABLE).length > 0;
      const hasTargetPlaceholders =
        unknownTarget.getElementsByClassName(CLASS_PLACEHOLDER).length > 0;

      clearTimeout(hideShadowElementTimeout);

      shadowElement.style.top = top + 'px';
      shadowElement.style.left = left + 'px';
      shadowElement.classList.remove(CLASS_HIDDEN);

      dragsterEventInfo.shadow.top = top;
      dragsterEventInfo.shadow.left = left;

      const cannotBeDropped =
        !isDragNodeAvailable && !isTargetRegion && !isTargetPlaceholder;
      const isNotDragOnlyDropTarget =
        dropTarget && dropTarget !== draggedElement && !isInDragOnlyRegion;
      const isEmptyDropTargetWithoutPlaceholder =
        isTargetRegion &&
        !isTargetRegionDragOnly &&
        !hasTargetDraggaBleElements &&
        !hasTargetPlaceholders;
      const isNotEmptyDropTargetWithoutPlaceholder =
        isTargetRegion &&
        !isTargetRegionDragOnly &&
        hasTargetDraggaBleElements &&
        !hasTargetPlaceholders;

      if (cannotBeDropped) {
        removePlaceholders();
      } else if (isNotDragOnlyDropTarget) {
        removePlaceholders();
        cleanReplacables();
        dragsterEventInfo = addPlaceholderOnTargetOnMove({
          dropTarget,
          elementPositionY,
          pageYOffset,
          placeholder: createPlaceholder(),
          shouldReplaceElements: replaceElements,
          dragsterEventInfo,
          removePlaceholders,
          cssReplacableClass: CLASS_REPLACABLE,
          insertBefore,
          visiblePlaceholder,
        });
      } else if (isEmptyDropTargetWithoutPlaceholder) {
        removePlaceholders();
        dragsterEventInfo = addPlaceholderInRegionOnMove({
          target: unknownTarget,
          placeholder: createPlaceholder(),
          dragsterEventInfo,
        });
      } else if (isNotEmptyDropTargetWithoutPlaceholder) {
        removePlaceholders();
        dragsterEventInfo = addPlaceholderInRegionBelowTargetsOnMove({
          target: unknownTarget,
          placeholder: createPlaceholder(),
          dragsterEventInfo,
          cssDraggableClass: CLASS_DRAGGABLE,
          dragsterId,
        });
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
     */
    mouseup: (event: IDragsterEvent): void => {
      event.dragster = dragsterEventInfo;

      const isTouch = event.type === EDomEvent.TOUCHSTART;
      const moveEvent = isTouch ? EDomEvent.TOUCHMOVE : EDomEvent.MOUSEMOVE;
      const upEvent = isTouch ? EDomEvent.TOUCHEND : EDomEvent.MOUSEUP;

      if (onBeforeDragEnd(event) === false) {
        resetDragsterWorkspace(moveEvent, upEvent, regions);

        return;
      }

      const findByClass = replaceElements
        ? CLASS_REPLACABLE
        : CLASS_PLACEHOLDER;
      const dropTarget = document.getElementsByClassName(
        findByClass
      )[0] as HTMLElement;
      const isFromDragOnlyRegion = !!(
        draggedElement && getElement(draggedElement, isInDragOnlyRegionCallback)
      );
      const canBeCloned = cloneElements && isFromDragOnlyRegion;
      hideShadowElementTimeout = setTimeout(
        () => resetDragsterWorkspace(moveEvent, upEvent, regions),
        200
      );

      cleanReplacables();

      if (!draggedElement || !dropTarget) {
        resetDragsterWorkspace(moveEvent, upEvent, regions);

        return;
      }

      let dropDraggableTarget = getElement(dropTarget, isDraggableCallback);

      dropDraggableTarget = dropDraggableTarget || dropTarget;

      if (draggedElement !== dropDraggableTarget) {
        if (!replaceElements && !canBeCloned) {
          event.dragster = moveElementOnDrop({
            shouldWrapElements: wrapDraggableElements === true,
            dragsterEvent: event.dragster,
            insertBefore,
            insertAfter,
            draggedElement,
            dropTarget,
            dropDraggableTarget,
            dropTemp:
              wrapDraggableElements === false
                ? draggedElement
                : createElementWrapper(),
          });

          onAfterDragDrop(event);
        } else if (replaceElements && !canBeCloned) {
          event.dragster = replaceElementsOnDrop({
            dragsterEvent: event.dragster,
            dropDraggableTarget,
            dropTemp: document.getElementsByClassName(
              CLASS_TEMP_CONTAINER
            )[0] as HTMLElement,
            draggedElement,
          });

          onAfterDragDrop(event);
        } else if (!replaceElements && canBeCloned) {
          event.dragster = cloneElementsOnDrop({
            dragsterEvent: event.dragster,
            dropTarget,
            insertAfterTarget: (element) => {
              insertAfter(dropDraggableTarget as HTMLElement, element);
            },
            insertBeforeTarget: (element) => {
              insertBefore(dropDraggableTarget as HTMLElement, element);
            },
            draggedElement,
            cleanWorkspace: (element) => cleanWorkspace({ element, regions }),
          });

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
     */
    addPlaceholderOnTarget: (
      dropTarget: HTMLElement,
      elementPositionY: number,
      pageYOffset: number
    ): void => {
      const dropTargetRegion = dropTarget.getBoundingClientRect();
      const placeholder = createPlaceholder();
      const maxDistance = dropTargetRegion.height / 2;

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
     */
    addPlaceholderInRegion: (regionTarget: HTMLElement): void => {
      const placeholder = createPlaceholder();

      regionTarget.appendChild(placeholder);

      dragsterEventInfo.placeholder.position = EVisualPosition.BOTTOM;
      dragsterEventInfo.placeholder.node = placeholder;
      dragsterEventInfo.drop.node = regionTarget;
    },

    /**
     * Adds a new placeholder in an empty region
     */
    addPlaceholderInRegionBelowTargets: (regionTarget: HTMLElement): void => {
      const elementsInRegion = [
        ...regionTarget.getElementsByClassName(CLASS_DRAGGABLE),
      ] as HTMLElement[];
      const filteredElements = elementsInRegion.filter(
        (elementInRegion) => elementInRegion.dataset.dragsterId === dragsterId
      );
      const dropTarget = filteredElements[filteredElements.length - 1];
      const placeholder = createPlaceholder();

      placeholder.dataset.placeholderPosition = EVisualPosition.BOTTOM;
      removeElements(CLASS_PLACEHOLDER);
      dropTarget.appendChild(placeholder);

      dragsterEventInfo.placeholder.position = EVisualPosition.BOTTOM;
      dragsterEventInfo.placeholder.node = placeholder;
      dragsterEventInfo.drop.node = dropTarget;
    },

    /**
     * Removes all placeholders from regions
     */
    removePlaceholders: (): void => {
      if (!replaceElements) {
        removeElements(CLASS_PLACEHOLDER);
      } else {
        cleanReplacables();
      }
    },
  };

  fnWrapDraggableElements(draggableElements);
  addEventListenersToRegions(regions);

  window.addEventListener('resize', discoverWindowHeight, false);

  return {
    update: (): void => {
      draggableElements = findDraggableElements();

      fnWrapDraggableElements(draggableElements);
      fnUpdateRegionsHeight();
      discoverWindowHeight();
    },
    updateRegions: (): void => {
      regions = findRegionElements();

      addEventListenersToRegions(regions);
    },
    destroy: (): void => {
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

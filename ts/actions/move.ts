import { IDragsterEventInfo } from '../interfaces';
import { EVisualPosition } from '../enums';

interface IAddPlaceholderOnTargetOnMoveProps {
  dropTarget: HTMLElement;
  elementPositionY: number;
  pageYOffset: number;
  placeholder: HTMLElement;
  dragsterEventInfo: IDragsterEventInfo;
  shouldReplaceElements: boolean;
  removePlaceholders: () => void;
  cssReplacableClass: string;
  insertBefore: (elementTarget: ChildNode, elementBefore: HTMLElement) => void;
  visiblePlaceholder: {
    top: boolean;
    bottom: boolean;
  };
}

/**
 * Adds a new placeholder in relation to drop target
 */
export const addPlaceholderOnTargetOnMove = ({
  dropTarget,
  elementPositionY,
  pageYOffset,
  placeholder,
  dragsterEventInfo,
  shouldReplaceElements,
  removePlaceholders,
  cssReplacableClass,
  insertBefore,
  visiblePlaceholder,
}: IAddPlaceholderOnTargetOnMoveProps): IDragsterEventInfo => {
  const dropTargetRegion = dropTarget.getBoundingClientRect();
  const maxDistance = dropTargetRegion.height / 2;

  if (shouldReplaceElements) {
    dropTarget.classList.add(cssReplacableClass);

    dragsterEventInfo.placeholder.node = placeholder;
    dragsterEventInfo.drop.node = dropTarget;

    return dragsterEventInfo;
  }

  if (
    elementPositionY - pageYOffset - dropTargetRegion.top < maxDistance &&
    !visiblePlaceholder.top
  ) {
    removePlaceholders();
    placeholder.dataset.placeholderPosition = EVisualPosition.TOP;
    insertBefore(dropTarget.firstChild, placeholder);

    dragsterEventInfo.placeholder.position = EVisualPosition.TOP;
  } else if (
    dropTargetRegion.bottom - (elementPositionY - pageYOffset) < maxDistance &&
    !visiblePlaceholder.bottom
  ) {
    removePlaceholders();
    placeholder.dataset.placeholderPosition = EVisualPosition.BOTTOM;
    dropTarget.appendChild(placeholder);

    dragsterEventInfo.placeholder.position = EVisualPosition.BOTTOM;
  }

  dragsterEventInfo.placeholder.node = placeholder;
  dragsterEventInfo.drop.node = dropTarget;

  return dragsterEventInfo;
};

interface IAddPlaceholderInRegionOnMove {
  target: HTMLElement;
  placeholder: HTMLElement;
  dragsterEventInfo: IDragsterEventInfo;
}

/**
 * Adds a new placeholder in an empty region
 */
export const addPlaceholderInRegionOnMove = ({
  target,
  placeholder,
  dragsterEventInfo,
}: IAddPlaceholderInRegionOnMove): IDragsterEventInfo => {
  target.appendChild(placeholder);

  dragsterEventInfo.placeholder.position = EVisualPosition.BOTTOM;
  dragsterEventInfo.placeholder.node = placeholder;
  dragsterEventInfo.drop.node = target;

  return dragsterEventInfo;
};

interface IAddPlaceholderInRegionBelowTargets {
  target: HTMLElement;
  dragsterEventInfo: IDragsterEventInfo;
  placeholder: HTMLElement;
  cssDraggableClass: string;
  dragsterId: string;
}

/**
 * Adds a new placeholder in an empty region
 */
export const addPlaceholderInRegionBelowTargetsOnMove = ({
  target,
  dragsterEventInfo,
  placeholder,
  cssDraggableClass,
  dragsterId,
}: IAddPlaceholderInRegionBelowTargets): IDragsterEventInfo => {
  const elementsInRegion = [
    ...target.getElementsByClassName(cssDraggableClass),
  ] as HTMLElement[];
  const filteredElements = elementsInRegion.filter(
    (elementInRegion) => elementInRegion.dataset.dragsterId === dragsterId
  );
  const dropTarget = filteredElements[filteredElements.length - 1];

  placeholder.dataset.placeholderPosition = EVisualPosition.BOTTOM;
  dropTarget.appendChild(placeholder);

  dragsterEventInfo.placeholder.position = EVisualPosition.BOTTOM;
  dragsterEventInfo.placeholder.node = placeholder;
  dragsterEventInfo.drop.node = dropTarget;

  return dragsterEventInfo;
};

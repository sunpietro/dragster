import { EVisualPosition } from '../enums';
import { IDragsterEventInfo } from '../interfaces';

interface IMoveElementOnDropProps {
  dragsterEvent: IDragsterEventInfo;
  dropTarget: HTMLElement;
  dropDraggableTarget: HTMLElement;
  dropTemp: HTMLElement;
  insertBefore: (a: HTMLElement, b: HTMLElement) => void;
  insertAfter: (a: HTMLElement, b: HTMLElement) => void;
  shouldWrapElements: boolean;
  draggedElement: HTMLElement;
}

/**
 * Moves element to the final position on drop
 */
export const moveElementOnDrop = ({
  dragsterEvent,
  dropTarget,
  dropDraggableTarget,
  dropTemp,
  insertBefore,
  insertAfter,
  shouldWrapElements,
  draggedElement,
}: IMoveElementOnDropProps): IDragsterEventInfo => {
  const placeholderPosition = dropTarget.dataset.placeholderPosition;

  if (placeholderPosition === EVisualPosition.TOP) {
    insertBefore(dropDraggableTarget, dropTemp);
  } else {
    if (!shouldWrapElements) {
      insertAfter(dropTemp, dropDraggableTarget);
    } else {
      insertAfter(dropDraggableTarget, dropTemp);
    }
  }

  if (draggedElement.firstChild && shouldWrapElements) {
    dropTemp.appendChild(draggedElement.firstChild);
  }

  dragsterEvent.dropped = dropTemp;

  return dragsterEvent;
};

interface IReplaceElementsOnDropProps {
  dragsterEvent: IDragsterEventInfo;
  dropDraggableTarget: HTMLElement;
  dropTemp: HTMLElement;
  draggedElement: HTMLElement;
}

/**
 * Replaces element with target element on drop
 */
export const replaceElementsOnDrop = ({
  dragsterEvent,
  dropDraggableTarget,
  dropTemp,
  draggedElement,
}: IReplaceElementsOnDropProps): IDragsterEventInfo => {
  dropTemp.innerHTML = draggedElement.innerHTML;

  draggedElement.innerHTML = dropDraggableTarget.innerHTML;
  dropDraggableTarget.innerHTML = dropTemp.innerHTML;
  dropTemp.innerHTML = '';
  dragsterEvent.dropped = dropTemp;

  return dragsterEvent;
};

interface ICloneElementsOnDropProps {
  dragsterEvent: IDragsterEventInfo;
  dropTarget: HTMLElement;
  draggedElement: HTMLElement;
  insertBeforeTarget: (element: HTMLElement) => void;
  insertAfterTarget: (element: HTMLElement) => void;
  cleanWorkspace: (element: HTMLElement) => void;
}

/**
 * Clones element to the final position on drop
 */
export const cloneElementsOnDrop = ({
  dragsterEvent,
  dropTarget,
  draggedElement,
  insertBeforeTarget,
  insertAfterTarget,
  cleanWorkspace,
}: ICloneElementsOnDropProps): IDragsterEventInfo => {
  const dropTemp = draggedElement.cloneNode(true) as HTMLElement;
  const placeholderPosition = dropTarget.dataset.placeholderPosition;

  if (placeholderPosition === EVisualPosition.TOP) {
    insertBeforeTarget(dropTemp);
  } else {
    insertAfterTarget(dropTemp);
  }

  cleanWorkspace(dropTemp);

  dragsterEvent.clonedFrom = draggedElement;
  dragsterEvent.clonedTo = dropTemp;

  return dragsterEvent;
};

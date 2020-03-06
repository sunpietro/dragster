import { EVisualPosition } from './enums';

export interface IDragsterOutput {
  update: () => void;
  updateRegions: () => void;
  destroy: () => void;
}

export interface IDragsterInput {
  elementSelector?: string;
  regionSelector?: string;
  dragHandleCssClass?: string;
  dragOnlyRegionCssClass?: string;
  replaceElements?: boolean;
  updateRegionsHeight?: boolean;
  minimumRegionHeight?: number;
  onBeforeDragStart?: (event: DragsterEvent) => boolean;
  onAfterDragStart?: (event: DragsterEvent) => void;
  onBeforeDragMove?: (event: DragsterEvent) => boolean;
  onAfterDragMove?: (event: DragsterEvent) => void;
  onBeforeDragEnd?: (event: DragsterEvent) => boolean;
  onAfterDragEnd?: (event: DragsterEvent) => void;
  onAfterDragDrop?: (event: DragsterEvent) => void;
  scrollWindowOnDrag?: boolean;
  dragOnlyRegionsEnabled?: boolean;
  cloneElements?: boolean;
  wrapDraggableElements?: boolean;
  shadowElementUnderMouse?: boolean;
}

export interface IMouseTouchEvent extends MouseEvent {
  changedTouches: TouchList;
}

export interface DragsterEvent extends MouseEvent {
  dragster: IDragsterEventInfo;
}

export interface IDragsterEventInfo {
  drag: {
    node: HTMLElement;
  };
  drop: {
    node: HTMLElement;
  };
  shadow: {
    node: HTMLElement;
    top: number;
    left: number;
  };
  placeholder: {
    node: HTMLElement;
    position: EVisualPosition;
  };
  dropped: HTMLElement;
  clonedFrom: HTMLElement;
  clonedTo: HTMLElement;
}

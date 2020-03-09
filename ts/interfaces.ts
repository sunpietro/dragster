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
  onBeforeDragStart?: (event: IDragsterEvent) => boolean;
  onAfterDragStart?: (event: IDragsterEvent) => void;
  onBeforeDragMove?: (event: IDragsterEvent) => boolean;
  onAfterDragMove?: (event: IDragsterEvent) => void;
  onBeforeDragEnd?: (event: IDragsterEvent) => boolean;
  onAfterDragEnd?: (event: IDragsterEvent) => void;
  onAfterDragDrop?: (event: IDragsterEvent) => void;
  scrollWindowOnDrag?: boolean;
  dragOnlyRegionsEnabled?: boolean;
  cloneElements?: boolean;
  wrapDraggableElements?: boolean;
  shadowElementUnderMouse?: boolean;
}

export interface ITouchList extends TouchList {
  view: Window | null;
}

export interface IMouseTouchEvent extends MouseEvent, TouchEvent {
  changedTouches: ITouchList;
}

export interface IDragsterEvent extends IMouseTouchEvent {
  dragster: IDragsterEventInfo;
}

export interface IDragsterEventInfo {
  drag?: {
    node: HTMLElement;
  };
  drop?: {
    node: HTMLElement;
  };
  shadow?: {
    node: HTMLElement;
    top: number;
    left: number;
  };
  placeholder?: {
    node: HTMLElement;
    position: EVisualPosition;
  };
  dropped?: HTMLElement;
  clonedFrom?: HTMLElement;
  clonedTo?: HTMLElement;
}

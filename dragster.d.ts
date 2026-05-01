export interface DragsterEventInfo {
    drag: {
        node: HTMLElement | null;
    };
    drop: {
        node: HTMLElement | null;
    };
    shadow: {
        node: HTMLElement | null;
        top: number;
        left: number;
    };
    placeholder: {
        node: HTMLElement | null;
        position: 'top' | 'bottom' | null;
    };
    dropped: HTMLElement | null;
    clonedFrom: HTMLElement | null;
    clonedTo: HTMLElement | null;
}

export type DragsterCallback = (event: DragsterEventInfo) => false | void;

export interface DragsterOptions {
    elementSelector?: string;
    regionSelector?: string;
    dragHandleCssClass?: string | false;
    replaceElements?: boolean;
    cloneElements?: boolean;
    dragOnlyRegionCssClass?: string;
    updateRegionsHeight?: boolean;
    minimumRegionHeight?: number;
    scrollWindowOnDrag?: boolean;
    wrapDraggableElements?: boolean;
    shadowElementUnderMouse?: boolean;
    onBeforeDragStart?: DragsterCallback;
    onAfterDragStart?: DragsterCallback;
    onBeforeDragMove?: DragsterCallback;
    onAfterDragMove?: DragsterCallback;
    onBeforeDragEnd?: DragsterCallback;
    onAfterDragEnd?: DragsterCallback;
    onAfterDragDrop?: DragsterCallback;
}

export interface DragsterInstance {
    update(): void;
    updateRegions(): void;
    destroy(): void;
}

declare function Dragster(options?: DragsterOptions): DragsterInstance;

export default Dragster;

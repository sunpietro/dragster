declare const CLASS_DRAGGING = "is-dragging";
declare const CLASS_DRAGOVER = "is-drag-over";
declare const CLASS_DRAGGABLE = "dragster-draggable";
declare const CLASS_REGION = "dragster-drag-region";
declare const CLASS_PLACEHOLDER = "dragster-drop-placeholder";
declare const CLASS_TEMP_ELEMENT = "dragster-temp";
declare const CLASS_TEMP_CONTAINER = "dragster-temp-container";
declare const CLASS_HIDDEN = "dragster-is-hidden";
declare const CLASS_REPLACABLE = "dragster-replacable";
declare const EVT_TOUCHSTART = "touchstart";
declare const EVT_TOUCHMOVE = "touchmove";
declare const EVT_TOUCHEND = "touchend";
declare const EVT_MOUSEDOWN = "mousedown";
declare const EVT_MOUSEMOVE = "mousemove";
declare const EVT_MOUSEUP = "mouseup";
declare const UNIT = "px";
declare const DIV = "div";
declare enum EPosition {
    top = "top",
    bottom = "bottom"
}
interface IDragsterParams {
    elementSelector: string;
    regionSelector: string;
    dragOnlyRegionCssClass: string;
    shouldReplaceElements: boolean;
    shouldUpdateRegionsHeight: boolean;
    minimumRegionHeight: number;
    onBeforeDragStart: (event: TDragsterEvent) => boolean;
    onAfterDragStart: (event: TDragsterEvent) => boolean;
    onBeforeDragMove: (event: TDragsterEvent) => boolean;
    onAfterDragMove: (event: TDragsterEvent) => boolean;
    onBeforeDragEnd: (event: TDragsterEvent) => boolean;
    onAfterDragEnd: (event: TDragsterEvent) => boolean;
    onAfterDragDrop: (event: TDragsterEvent) => boolean;
    shouldScrollWindowOnDrag: boolean;
    isDragOnlyRegionsEnabled: boolean;
    shouldCloneElements: boolean;
    shouldWrapDraggableElements: boolean;
    shouldPlaceShadowElementUnderMouse: boolean;
}
interface IDragsterOutput {
    destroy: () => void;
    update: () => void;
    updateRegions: () => void;
}
declare type TPlaceholderPosition = 'top' | 'bottom' | null;
interface IDragsterEventInfo {
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
        position: TPlaceholderPosition;
    };
    dropped: {
        node: HTMLElement | null;
    };
    clonedFrom: {
        node: HTMLElement | null;
    };
    clonedTo: {
        node: HTMLElement | null;
    };
}
declare type TDragsterEvent = MouseEvent & {
    dragster: IDragsterEventInfo;
};
declare type TDragster = (params: Partial<IDragsterParams>) => IDragsterOutput;
declare const checkIsTouchEvent: (event: unknown) => event is TouchEvent;
declare const checkIsUIEvent: (event: unknown) => event is UIEvent;
declare type TScrollWindowEvent = WheelEvent | TouchEvent | TDragsterEvent;
declare type TInitDragsterEventInfo = () => (options?: Partial<IDragsterEventInfo>) => IDragsterEventInfo;
/**
 * Scrolls window while dragging an element
 */
declare const scrollWindow: (event: TScrollWindowEvent) => void;
declare const Dragster: TDragster;

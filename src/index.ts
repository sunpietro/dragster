export interface DragsterOptions {
    elementSelector?: string;
    regionSelector?: string;
}

export default class Dragster {
    constructor(_options: DragsterOptions = {}) {
        // PR 1 stub — real implementation lands in subsequent PRs.
    }

    update(): void {}
    updateRegions(): void {}
    destroy(): void {}
}

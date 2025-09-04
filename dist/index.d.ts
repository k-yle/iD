export type Tags = Record<string, string>;
/** during a multi-selection, iD sends us an array of values if the values difer */
export type MultiTags = Record<string, string | string[]>;
export declare class Store<T> {
    #private;
    constructor(defaultValue: T);
    /** your callback should return a function which is called to unsubscribe */
    subscribe: (callback: (value: T) => void) => () => boolean;
    getValue: () => T;
    setValue: (value: T) => void;
}
/**
 * The store is the two-way communication channel between
 * iD and the plugin. iD creates this object and sends it
 * to the plugin.
 */
export type TagsStore = Store<MultiTags>;
/** This data is passed to the plugin when it's first rendered */
export type PluginData = {
    locale: string;
    theme: string;
    tagsStore: TagsStore;
    map: {
        center: [lon: number, lat: number];
    };
};
/** this interface must be implemented by the web component class */
export declare class WebComponentPlugin extends HTMLElement {
    init(data: PluginData): void;
}

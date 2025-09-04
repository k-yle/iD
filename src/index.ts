export type Tags = Record<string, string>;

/** during a multi-selection, iD sends us an array of values if the values difer */
export type MultiTags = Record<string, string | string[]>;

// this is declared on the iD side
export class Store<T> {
  #state: T;

  constructor(defaultValue: T) {
    this.#state = defaultValue;
  }

  #subscribers = new Set<(value: T) => void>();

  /** your callback should return a function which is called to unsubscribe */
  subscribe = (callback: (value: T) => void) => {
    this.#subscribers.add(callback);
    return () => this.#subscribers.delete(callback);
  };

  getValue = () => this.#state;

  setValue = (value: T) => {
    if (JSON.stringify(value) === JSON.stringify(this.#state)) {
      // TODO: this should never happen
      console.warn('bailing out of pointless re-render');
      return;
    }

    this.#state = value;
    for (const callback of this.#subscribers) {
      callback(this.#state);
    }
  };
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

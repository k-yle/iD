"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Store = void 0;
// this is declared on the iD side
class Store {
    #state;
    constructor(defaultValue) {
        this.#state = defaultValue;
    }
    #subscribers = new Set();
    /** your callback should return a function which is called to unsubscribe */
    subscribe = (callback) => {
        this.#subscribers.add(callback);
        return () => this.#subscribers.delete(callback);
    };
    getValue = () => this.#state;
    setValue = (value) => {
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
exports.Store = Store;

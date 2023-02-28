// @ts-check

/**
 * @param {any[]} osmFeatures
 */
export const actionSequence = (osmFeatures) => {
    /**
     * @param {{ key: string; template: string; startNum: string; incrementBy: number }} options
     */
    const action = (options) => (graph) => {
        /** @type {string | number} */
        let current = options.startNum;

        if (!Number.isNaN(+current)) current = +current;

        for (const osmFeature of osmFeatures) {
            graph = graph.replace(osmFeature.mergeTags({
                [options.key]: options.template.replace(/\%/g, `${current}`),
            }));

            if (typeof current === 'number') {
                // it's a number, so simply increment it
                current += options.incrementBy;
            } else {
                // it's a letter, so increment the charcode
                current = String.fromCharCode(current.charCodeAt(0) + options.incrementBy);
            }
        }

        return graph;
    };

    action.disabled = () => {
        if (osmFeatures.some(n => n.type === 'relation')) return 'not_closed';
        if (osmFeatures.length < 1) return 'less_than_four_nodes';

        return false;
    };

    action.transitionable = true;

    return action;
};

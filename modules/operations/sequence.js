// @ts-check
import { t } from '../core/localizer';
import { actionSequence } from '../actions/sequence';
import { behaviorOperation } from '../behavior/operation';


/** @param {string[]} selectedIDs */
export function operationSequence(context, selectedIDs) {
    let _extent;
    const graph = context.graph();
    const osmFeatures = selectedIDs.map(id => graph.hasEntity(id)).filter(Boolean);
    const _action = getAction(selectedIDs[0]);

    /** @param {string} entityID */
    function getAction(entityID) {
        const entity = context.entity(entityID);

        // this operation is only show when multiple features are selected
        if (selectedIDs.length < 1) return null;

        if (!_extent) {
            _extent = entity.extent(context.graph());
        } else {
            _extent = _extent.extend(entity.extent(context.graph()));
        }

        return actionSequence(osmFeatures);
    }

    const operation = () => {
        if (!_action) return;

        const key = prompt('What key?', 'ref');
        if (!key) return;
        const template = prompt('Enter pattern for value, use % for the dynamic value', '%');
        if (!template) return;
        let startNum = prompt('Start number (or letter)', '0');
        if (startNum === null) return;
        let _incrementBy = prompt('Increment by', '1');
        if (_incrementBy === null) return;
        const incrementBy = +_incrementBy;


        context.perform(_action({ key, template, startNum, incrementBy }), operation.annotation());

        window.setTimeout(() => context.validator().validate(), 300); // after any transition
    };

    operation.available = () => !!_action;


    // don't cache this because the visible extent could change
    operation.disabled = () => {
        if (!_action) return '';

        const isDisabled = _action.disabled();
        if (isDisabled) {
            return isDisabled;
        } else if (_extent.percentContainedIn(context.map().extent()) < 0.8) {
            return 'too_large';
        } else if (selectedIDs.some(context.hasHiddenConnections)) {
            return 'connected_to_hidden';
        }

        return false;

    };


    operation.tooltip = () => {
        const disableReason = operation.disabled();
        return disableReason ?
            t('operations.sequence.disabled.' + disableReason) :
            t('operations.sequence.tooltip');
    };


    operation.annotation = () => 'used the sequence operation';

    operation.id = 'sequence';
    operation.keys = ['X'];
    operation.title = t('operations.sequence.title');
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
}

// @ts-nocheck
import { select as d3_select } from 'd3-selection';

import { svgIcon } from '../../svg';
import { uiTooltip } from '../tooltip';
import { uiBetaInfoDialog } from './uiBetaInfoDialog';

export function uiToolBetaInfo(context) {
    const betaInfoDialog = uiBetaInfoDialog(context);

    var tool = {
        id: 'betaInfo',
        label: (selection) => selection.append('span').text('New Features')
    };

    tool.render = function(selection) {
        function update() {
            var buttons = selection.selectAll('button.add-button')
                .data([0], function(d) { return d.id; });

            // exit
            buttons.exit()
                .remove();

            // enter
            var buttonsEnter = buttons.enter()
                .append('button')
                .attr('class', function(d) { return d.id + ' add-button bar-button'; })
                .on('click', function() {
                    context.container().call(betaInfoDialog);
                })
                .call(uiTooltip()
                    .placement('bottom')
                    .title(function() { return 'View information about this beta version of iD'; })
                    .keys(function() { return []; })
                    .scrollContainer(context.container().select('.top-toolbar'))
                );

            buttonsEnter
                .each(function() {
                    d3_select(this)
                        .call(svgIcon('#iD-icon-help'));
                });

            // if we are adding/removing the buttons, check if toolbar has overflowed
            if (buttons.enter().size() || buttons.exit().size()) {
                context.ui().checkOverflow('.top-toolbar', true);
            }

            // update
            buttons = buttons
                .merge(buttonsEnter);
        }
        update();
    };

    return tool;
}

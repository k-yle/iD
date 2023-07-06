// @ts-nocheck
import { select as d3_select } from 'd3-selection';

import { uiModal } from '../modal';


export function uiBetaInfoDialog(context) {
  let _modalSelection = d3_select(null);
  let _content = d3_select(null);


  return (selection) => {
    _modalSelection = uiModal(selection);

    _modalSelection.select('.modal')
      .attr('class', 'modal info-modal');

    _content = _modalSelection.select('.content')
      .append('div')
      .attr('class', 'info-modal-inner');

    _content
      .call(renderModalContent);

    _content.selectAll('.ok-button')
      .node()
      .focus();
  };


  function renderModalContent(selection) {
    /* Header */
    let headerEnter = selection.selectAll('.modal-section-heading')
      .data([0])
      .enter()
      .append('div')
      .attr('class', 'modal-section-heading');

    headerEnter
      .append('h3')
      .attr('class', 'modal-heading')
      .html('iD Beta');

    headerEnter
      .append('div')
      .attr('class', 'modal-heading-desc')
      .html(`
        This is a beta version of iD, which contains features that are not
        yet available in the standard version of iD.
        <br />
        <iframe style="width:100%;height:500px" src="https://gist.github.com/k-yle/288f5c3bba4bffb0221751900ed4c392.pibb"></iframe>
      `);

    let buttonsEnter = selection.selectAll('.modal-section.buttons')
      .data([0])
      .enter()
      .append('div')
      .attr('class', 'modal-section buttons');

    buttonsEnter
      .append('button')
      .attr('class', 'button ok-button action')
      .on('click', () => _modalSelection.remove())
      .text('Close');
  }
}

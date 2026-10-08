import { t } from '../../core';
import { operationImportFile } from '../../operations/import_file';
import { svgIcon } from '../../svg';
import { uiTooltip } from '../tooltip';
import { uiImportFile } from '../import_file';

/** @param {iD.Context} context */
export function uiSectionImportFile(context) {
  const importFile = uiImportFile(context);

  /** @param {PointerEvent} event */
  function onClickImport(event) {
    return importFile((onLoadingStart) =>
      operationImportFile(context, event.ctrlKey, onLoadingStart)
    );
  }

  /** @param {d3.Selection} selection */
  return (selection) => {
    const importDivEnter = selection
      .selectAll('.layer-list-import')
      .data([0])
      .enter()
      .append('div')
      .attr('class', 'layer-list-import');

    importDivEnter
      .append('button')
      .attr('class', 'button-link')
      .call(
        uiTooltip()
          .title(() => t.append('operations.import_from_file.tooltip'))
          .placement('right')
      )
      .call(svgIcon('#iD-icon-save', 'inline'))
      .call(t.append('operations.import_from_file.title'))
      .on('click', onClickImport);
  };
}

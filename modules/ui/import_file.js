import { t } from '../core';
import { uiLoading } from './loading';
import { uiErrorModal } from './error_modal';

/** @param {iD.Context} context */
export function uiImportFile(context) {
  const _loading = uiLoading(context)
    .message(t('operations.import_from_file.loading'))
    .blocking(true);

  const _errorModal = uiErrorModal();

  /** @param {(onLoadingStart: () => void) => Promise<void>} importer */
  return async (importer) => {
    try {
      await importer(() => {
        context.container().call(_loading);
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);

      const subtitle = `${error}`.includes('Conflicts')
        ? t('operations.import_from_file.error.conflicts')
        : t('operations.import_from_file.error.unknown');

      context
        .container()
        .call(
          _errorModal
            .setTitle(t('operations.import_from_file.error.title'))
            .setSubtitle(subtitle)
        );
    }
    _loading.close();
  };
}

import { operationImportFiles } from '../operations/import_file';
import { uiImportFile } from './import_file';

const TRUSTED_ORIGINS = new Set([
  window.location.origin,
  'https://osm-nz.github.io',
  'http://127.0.0.1:4884',
]);

export function uiImportFromPostMessage(context: iD.Context) {
  const opener: WindowProxy = window.opener;
  if (!opener) return;

  const importFile = uiImportFile(context);

  function onMessage(event: MessageEvent) {
    if (event.source !== opener) return;
    if (!TRUSTED_ORIGINS.has(event.origin)) return;

    const data: unknown = event.data;
    if (typeof data !== 'object' || !data || !('files' in data) || !Array.isArray(data.files)) {
      return;
    }

    opener.postMessage('received', event.origin);

    const files = data.files.filter((file) => file instanceof File);
    importFile(async (onLoadingStart) => {
      onLoadingStart();
      await operationImportFiles(context, files, false);
    });
  }
  window.addEventListener('message', onMessage);

  // reply to all possible origins, because we don't know
  // which origin sent the message...
  for (const origin of TRUSTED_ORIGINS) {
    opener.postMessage('ready', origin);
  }
}

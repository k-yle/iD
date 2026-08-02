import { dispatch as d3_dispatch } from 'd3-dispatch';
import { utilRebind } from '../../util';
import {
  Store,
  type MultiTags,
  type WebComponentPlugin,
} from '@openstreetmap/id-plugin-sdk';

type Field = Presets.Field & { safeid: string; url: string };

/** singleton promises to avoid pointless fetching */
const importPromises: { [url: string]: Promise<void> } = {};

export function uiFieldPlugin(field: Field, context: iD.Context) {
  const dispatch = d3_dispatch('change');
  let wrap: d3.Selection<WebComponentPlugin, 0>;

  // the store is the bi-directional communication system with the plugin
  const tagsStore = new Store<MultiTags>({});
  tagsStore.subscribe((tags) => {
    const isAnyMultiSelection = Object.values(tags).some(value => Array.isArray(value));
    if (isAnyMultiSelection) return; // ignore
    dispatch.call('change', undefined, () => tags);
  });

  const elementName = `id-plugin-${field.safeid}`.replaceAll('_', '-');

  // load the web component and register it globally
  importPromises[field.url] ||= import(field.url)
    .then((r) => r.default as typeof WebComponentPlugin)
    .then((WebComponent) => customElements.define(elementName, WebComponent));
  // no explicit error handling if the promise rejects. If the
  // plugin fails to load, then the UI will just be empty.

  async function plugin(selection: d3.Selection) {
    await importPromises[field.url]; // ensure the webcomponent has been registered

    wrap = selection
      .selectAll<WebComponentPlugin, 0>('.form-field-input-wrap')
      .data([0]);

    wrap = wrap
      .enter()
      .append<WebComponentPlugin>(elementName)
      .classed('form-field-input-wrap', true)
      .classed('form-field-plugin', true)
      // key events shouldn't bubble up and trigger iD's own keyboard shortcuts
      .on('keydown', (e: KeyboardEvent) => e.stopPropagation())
      .on('keyup', (e: KeyboardEvent) => e.stopPropagation())
      .on('keypress', (e: KeyboardEvent) => e.stopPropagation())
      .merge(wrap);

    wrap.node()!.init({
      theme: context.theme() as string,
      locale: context.locale(),
      tagsStore,
      map: {
        get center() {
          return context.map().center();
        },
      },
    });
  }

  plugin.tags = (tags: TagsMulti) => tagsStore.setValue(tags);

  return utilRebind(plugin, dispatch, 'on');
}

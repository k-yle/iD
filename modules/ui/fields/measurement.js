import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';
import unitPreference from 'cldr-core/supplemental/unitPreferenceData.json' with { type: 'json' };
import * as countryCoder from '@rapideditor/country-coder';
import { uiCombobox } from '../combobox';
import { t, localizer } from '../../core/localizer';
import { utilGetSetValue, utilNoAuto, utilRebind, utilTotalExtent } from '../../util';
import { likelyRawNumberFormat } from './input';
import { fileFetcher, locationManager } from '../../core';

const FOOT = 'foot';
const INCH = 'inch';

const FOOT_AND_INCH_VALUE = /^(?:(-?[\d.,]+)\s*')?\s*(?:(-?[\d.,]+)\s*")?$/;

const SPEED_SUGGESTIONS = {
    'kilometer-per-hour': [20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
    'mile-per-hour': [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
};

const CLDR_PREFERENCES = unitPreference.supplemental.unitPreferenceData;

const CLDR_UNIT_ALIASES = {
    'foot-and-inch': FOOT,
};

const WORDLIKE = /^\p{L}[\p{L}\p{N}./'’-]*$/u;

let _osmUnits;
let _osmUnitsPromise;

function loadOsmUnits() {
    _osmUnitsPromise ||= fileFetcher.get('preset_units')
        .then((d) => { _osmUnits = d; })
        .catch(() => {});
    return _osmUnitsPromise;
}

export function uiFieldMeasurement(field, context) {
    const dispatch = d3_dispatch('change');
    let wrap = d3_select(null);
    let numberInput = d3_select(null);
    let unitInput = d3_select(null);
    let secondaryNumberInput = d3_select(null);
    let _entityIDs = [];
    let _tags;

    const formatFloat = localizer.floatFormatter(localizer.languageCode());
    const parseLocaleFloat = localizer.floatParser(localizer.languageCode());

    const { dimension, usage, impliedUnit } = field.measurement;

    let _unitOptions = [];
    let _unit;
    let _unknownUnit;
    let _isMixedUnit = false;

    const unitCombo = uiCombobox(context, 'measurement-unit');
    const numberCombo = dimension === 'speed'
        ? uiCombobox(context, 'measurement-number')
        : undefined;

    const preferencesByRegion = CLDR_PREFERENCES[dimension]?.[usage] || {};

    const locationSetIDs = {};
    for (const registered of locationManager.registerLocationSets(
        Object.keys(preferencesByRegion).map((region) => ({
            region,
            locationSet: { include: [region] },
        }))
    )) {
        locationSetIDs[registered.region] = registered.locationSetID;
    }


    function bestRegionAt(loc) {
        if (!loc) return undefined;
        const here = locationManager.locationSetsAt(loc);

        return Object.keys(preferencesByRegion)
            .map((region) => [region, here.get(locationSetIDs[region])])
            .filter(([, areaInKm2]) => areaInKm2 !== undefined)
            .sort((a, b) => a[1] - b[1])[0]?.[0];
    }


    function getUnitOptions(loc) {
        const osmUnits = _osmUnits?.[dimension];
        if (!osmUnits) return [];

        const allowed = field.measurement.units
            ? field.measurement.units.filter((unit) => unit in osmUnits)
            : Object.keys(osmUnits);

        const preferred = (preferencesByRegion[bestRegionAt(loc)] || preferencesByRegion['001'] || [])
            .map((preference) => CLDR_UNIT_ALIASES[preference.unit] || preference.unit);

        const rank = (unit) => {
            const index = preferred.indexOf(unit);
            return index === -1 ? Infinity : index;
        };

        return allowed
            .sort((a, b) => rank(a) - rank(b))
            .map((unit) => {
                const suffix = osmUnits[unit][0];
                const label = t(`_tagging.units.${dimension}.${unit}.narrow`, {
                    default: suffix,
                });

                return {
                    unit,
                    suffix,
                    suffixes: osmUnits[unit],
                    label,
                    name: t(`_tagging.units.${dimension}.${unit}.long`, { default: label }),
                };
            });
    }


    function parseValue(value) {
        const trimmed = value.trim();

        const footAndInch = parseFootAndInch(trimmed);
        if (footAndInch) return footAndInch;

        const match = trimmed.match(/^(-?[\d.,\s]*\d)\s*(.*)$/);
        if (!match) return undefined;

        const [, number, suffix] = match;
        if (!suffix) return { number, unit: impliedUnit, unknownUnit: undefined };

        const option = _unitOptions.find((o) => o.suffixes.includes(suffix));
        if (option) return { number, unit: option.unit, unknownUnit: undefined };

        return WORDLIKE.test(suffix)
            ? { number, unit: undefined, unknownUnit: suffix }
            : undefined;
    }


    function parseFootAndInch(value) {
        if (!_unitOptions.some((o) => o.unit === FOOT)) return undefined;

        const match = value.match(FOOT_AND_INCH_VALUE);
        if (!match || (!match[1] && !match[2])) return undefined;

        return {
            number: match[1],
            secondaryNumber: match[2],
            unit: FOOT,
            unknownUnit: undefined,
        };
    }


    function isFootAndInch() {
        return _unit === FOOT;
    }


    function unitSuffix() {
        if (_unknownUnit) return ` ${_unknownUnit}`;
        if (!_unit || _unit === impliedUnit) return '';
        const option = _unitOptions.find((o) => o.unit === _unit);
        return option?.suffix ? ` ${option.suffix}` : '';
    }


    function parseNumber(value) {
        return likelyRawNumberFormat.test(value)
            ? parseFloat(value)
            : parseLocaleFloat(value);
    }


    function formatNumber(raw) {
        if (!raw) return '';
        const number = parseFloat(raw);
        return isNaN(number) ? raw : formatFloat(number);
    }


    function defaultUnit() {
        if (dimension === 'speed') {
            const loc = combinedEntityExtent()?.center();
            const suffix = loc && countryCoder.roadSpeedUnit(loc);
            const option = suffix && _unitOptions.find((o) => o.suffixes.includes(suffix));
            if (option) return option.unit;
        }

        return impliedUnit || _unitOptions[0]?.unit;
    }


    function selectDefaultUnit() {
        if (!_unknownUnit && !_isMixedUnit) _unit ||= defaultUnit();
    }


    function findUnitOption(text) {
        const typed = text.trim().toLowerCase();
        if (!typed) return undefined;

        return _unitOptions.find((o) =>
            o.label.toLowerCase() === typed ||
            o.name.toLowerCase() === typed ||
            o.unit === typed ||
            o.suffixes.some((suffix) => suffix.toLowerCase() === typed)
        );
    }


    function refreshStyles() {
        const value = utilGetSetValue(unitInput).trim();
        const option = findUnitOption(value);

        unitInput
            .classed('known-value', !!option)
            .classed('raw-value', !!value && !option);
    }


    function setUnitValue() {
        const option = _unitOptions.find((o) => o.unit === _unit);
        utilGetSetValue(unitInput, _unknownUnit || option?.label || '')
            .attr('placeholder', _isMixedUnit ? t('inspector.multiple_values') : null)
            .classed('mixed', _isMixedUnit)
            .attr('disabled', _isMixedUnit ? 'disabled' : null)
            .classed('disabled', _isMixedUnit);
        refreshStyles();
        renderSecondaryInputs();
        setNumberSuggestions();
    }


    function setNumberSuggestions() {
        const values = (_unit && SPEED_SUGGESTIONS[_unit]) || [];

        numberCombo?.data(values.map((value) => {
            const label = formatFloat(value);
            return { value: label, title: label };
        }));
    }


    function renderSecondaryInputs() {
        const data = isFootAndInch() ? [0] : [];
        const inch = t(`_tagging.units.${dimension}.${INCH}.narrow`, { default: '' });
        const inches = t(`_tagging.units.${dimension}.${INCH}.long`, { default: inch });

        secondaryNumberInput = wrap
            .selectAll('input.measurement-secondary-number')
            .data(data);

        secondaryNumberInput.exit().remove();

        secondaryNumberInput = secondaryNumberInput.enter()
            .append('input')
            .attr('type', 'text')
            .attr('class', 'measurement-secondary-number')
            .attr('aria-label', inches)
            .call(utilNoAuto)
            .on('change', change)
            .on('blur', change)
            .merge(secondaryNumberInput);

        const secondaryUnitInput = wrap
            .selectAll('input.measurement-secondary-unit')
            .data(data);

        secondaryUnitInput.exit().remove();

        secondaryUnitInput.enter()
            .append('input')
            .attr('type', 'text')
            .attr('class', 'measurement-secondary-unit disabled')
            .attr('value', inch)
            .attr('disabled', 'disabled')
            .call(utilNoAuto);
    }


    const measurement = (selection) => {
        if (!_osmUnits) {
            loadOsmUnits().then(() => {
                selection.call(measurement);
                if (_tags) measurement.tags(_tags);
            });
        }

        _unitOptions = getUnitOptions(combinedEntityExtent()?.center());

        unitCombo.data(_unitOptions.map(({ label, name, suffix, suffixes }) => ({
            value: label,
            display: (span) => span.text(name),
            description: [
                label === name ? undefined : label,
                suffix === label ? undefined : suffix,
            ].filter(Boolean).join(' — ') || undefined,
            title: name,
            terms: [name, ...suffixes],
        })));

        wrap = selection.selectAll('.form-field-input-wrap')
            .data([0]);

        wrap = wrap.enter()
            .append('div')
            .attr('class', 'form-field-input-wrap form-field-input-' + field.type)
            .merge(wrap);

        numberInput = wrap.selectAll('input.measurement-number')
            .data([0]);

        const numberEnter = numberInput.enter()
            .append('input')
            .attr('type', 'text')
            .attr('class', 'measurement-number')
            .attr('id', field.domId)
            .call(utilNoAuto);

        if (numberCombo) numberEnter.call(numberCombo, wrap);

        numberInput = numberEnter.merge(numberInput);

        numberInput
            .on('change', change)
            .on('blur', change);

        unitInput = wrap.selectAll('input.measurement-unit')
            .data([0]);

        unitInput = unitInput.enter()
            .append('input')
            .attr('type', 'text')
            .attr('class', 'measurement-unit')
            .attr('aria-label', t('inspector.measurement_unit'))
            .call(utilNoAuto)
            .call(unitCombo, wrap)
            .merge(unitInput);

        unitInput
            .on('change', changeUnit)
            .on('blur', changeUnit)
            .on('input', refreshStyles);

        refreshStyles();
    };


    function changeUnit() {
        const typed = utilGetSetValue(unitInput).trim();
        const option = findUnitOption(typed);

        if (option) {
            _unit = option.unit;
            _unknownUnit = undefined;
            _isMixedUnit = false;
        } else if (WORDLIKE.test(typed)) {
            _unit = undefined;
            _unknownUnit = typed;
            _isMixedUnit = false;
        } else if (!typed) {
            _unknownUnit = undefined;
            selectDefaultUnit();
        }
        setUnitValue();

        change.call(this);
    }


    function change() {
        const tag = {};
        const value = utilGetSetValue(numberInput).trim();
        const secondary = secondaryNumberInput.empty()
            ? ''
            : utilGetSetValue(secondaryNumberInput).trim();

        if (!value && !secondary && Array.isArray(_tags?.[field.key])) return;

        if (!value && !secondary) {
            tag[field.key] = undefined;
        } else if (isFootAndInch()) {
            const feet = value ? parseNumber(value) : undefined;
            const inches = secondary ? parseNumber(secondary) : undefined;

            tag[field.key] = Number.isNaN(feet) || Number.isNaN(inches)
                ? context.cleanTagValue(value)
                : context.cleanTagValue(
                    (feet === undefined ? '' : `${feet}'`) +
                    (inches === undefined ? '' : `${inches}"`));
        } else {
            const number = parseNumber(value);

            tag[field.key] = isNaN(number)
                ? context.cleanTagValue(value)
                : context.cleanTagValue(number + unitSuffix());
        }

        dispatch.call('change', this, tag);
    }


    measurement.tags = function(tags) {
        _tags = tags;

        const rawValue = tags[field.key];
        const isMixed = Array.isArray(rawValue);
        let value = '';
        let secondaryValue = '';

        if (isMixed) {
            const parsed = rawValue.filter(Boolean).map((each) => parseValue(each));

            _unit = parsed[0]?.unit;
            _unknownUnit = parsed[0]?.unknownUnit;
            _isMixedUnit = parsed.some((each) =>
                each?.unit !== _unit || each?.unknownUnit !== _unknownUnit);

            if (_isMixedUnit) {
                _unit = undefined;
                _unknownUnit = undefined;
            }
        } else {
            _isMixedUnit = false;

            if (rawValue) {
                const parsed = parseValue(rawValue);
                if (parsed) {
                    _unit = parsed.unit;
                    _unknownUnit = parsed.unknownUnit;
                    value = formatNumber(parsed.number);
                    secondaryValue = formatNumber(parsed.secondaryNumber);
                } else {
                    value = rawValue;
                }
            }
        }

        selectDefaultUnit();
        setUnitValue();

        utilGetSetValue(numberInput, value)
            .attr('title', isMixed ? rawValue.filter(Boolean).join('\n') : null)
            .attr('placeholder', isMixed ? t('inspector.multiple_values') : field.placeholder())
            .classed('mixed', isMixed);

        utilGetSetValue(secondaryNumberInput, secondaryValue)
            .attr('placeholder', isMixed ? t('inspector.multiple_values') : formatFloat(0))
            .classed('mixed', isMixed);
    };


    measurement.focus = function() {
        numberInput.node().focus();
    };


    measurement.reset = function() {
        _unit = undefined;
        _unknownUnit = undefined;
        _isMixedUnit = false;

        selectDefaultUnit();
        setUnitValue();
    };


    measurement.entityIDs = function(val) {
        _entityIDs = val;
    };


    function combinedEntityExtent() {
        return _entityIDs?.length ? utilTotalExtent(_entityIDs, context.graph()) : undefined;
    }


    return utilRebind(measurement, dispatch, 'on');
}

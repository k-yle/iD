export * from './check';
export * from './combo';
export * from './input';
export * from './access';
export * from './address';
export * from './directional_combo';
export * from './lanes';
export * from './localized';
export * from './measurement';
export * from './roadheight';
export * from './roadspeed';
export * from './radio';
export * from './restrictions';
export * from './textarea';
export * from './wikidata';
export * from './wikipedia';

import {
    uiFieldCheck,
    uiFieldDefaultCheck,
    uiFieldOnewayCheck
} from './check';

import {
    uiFieldCombo,
    uiFieldManyCombo,
    uiFieldMultiCombo,
    uiFieldNetworkCombo,
    uiFieldSemiCombo,
    uiFieldTypeCombo
} from './combo';

import {
    uiFieldColour,
    uiFieldEmail,
    uiFieldIdentifier,
    uiFieldInteger,
    uiFieldNumber,
    uiFieldSchedule,
    uiFieldTel,
    uiFieldText,
    uiFieldUrl
} from './input';

import {
    uiFieldRadio,
    uiFieldStructureRadio
} from './radio';

import { uiFieldAccess } from './access';
import { uiFieldAddress } from './address';
import { uiFieldDirectionalCombo } from './directional_combo';
import { uiFieldMeasurement } from './measurement';
import { uiFieldLanes } from './lanes';
import { uiFieldLocalized } from './localized';
import { uiFieldRoadheight } from './roadheight';
import { uiFieldRoadspeed } from './roadspeed';
import { uiFieldRestrictions } from './restrictions';
import { uiFieldPlugin } from './plugin';
import { uiFieldTextarea } from './textarea';
import { uiFieldWikidata } from './wikidata';
import { uiFieldWikipedia } from './wikipedia';

export var uiFields = {
    access: uiFieldAccess,
    address: uiFieldAddress,
    check: uiFieldCheck,
    colour: uiFieldColour,
    combo: uiFieldCombo,
    cycleway: uiFieldDirectionalCombo,
    date: uiFieldText,
    defaultCheck: uiFieldDefaultCheck,
    directionalCombo: uiFieldDirectionalCombo,
    email: uiFieldEmail,
    identifier: uiFieldIdentifier,
    integer: uiFieldInteger,
    lanes: uiFieldLanes,
    localized: uiFieldLocalized,
    manyCombo: uiFieldManyCombo,
    measurement: uiFieldMeasurement,
    multiCombo: uiFieldMultiCombo,
    networkCombo: uiFieldNetworkCombo,
    number: uiFieldNumber,
    onewayCheck: uiFieldOnewayCheck,
    plugin: uiFieldPlugin,
    radio: uiFieldRadio,
    restrictions: uiFieldRestrictions,
    roadheight: uiFieldRoadheight,
    roadspeed: uiFieldRoadspeed,
    schedule: uiFieldSchedule,
    semiCombo: uiFieldSemiCombo,
    structureRadio: uiFieldStructureRadio,
    tel: uiFieldTel,
    text: uiFieldText,
    textarea: uiFieldTextarea,
    typeCombo: uiFieldTypeCombo,
    url: uiFieldUrl,
    wikidata: uiFieldWikidata,
    wikipedia: uiFieldWikipedia
};

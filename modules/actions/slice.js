import { geoPathHasIntersections, geoPointInPolygon } from '../geo';

import { actionSplit } from './split';
import { actionDeleteWay } from './delete_way';
import { osmTagSuggestingArea } from '../osm';

/**
 * Slices an area into two, i.e. divides a closed area way into two such areas along a given removable cut line.
 * This must be supplied either with a cut line and the area or just the cut line with an unambiguous parent area.
 *
 * For testing convenience, accepts an ID to assign to the new way.
 * Normally, this will be undefined and the way will automatically
 * be assigned a new ID.
 */
export function actionSlice(selectedIDs, newWayIds) {

    var _resultingWayIds;

    /**
     * If our action is disabled because an underlying different action is disabled,
     * then this is the reason as returned by that action.
     * For UI purposes, this can be appended as the more exact reason for being unable to slice.
     */
    var _disabledInternalReason;


    /**
     * @param {coreGraph} graph
     */
    var action = function(graph) {

        let [parentWayID, cutLineWayID] = getAreaAndCutlineFromSelected();

        let way = graph.entity(parentWayID);

        let originalTags = way.tags;

        // We have to remove tags for now from the area or the split action will create a multipolygon if it wasn't already
        graph = graph.replace(way.update({ tags: [] }));

        let terminalNodes = getTerminalNodes(graph, cutLineWayID);

        let split = actionSplit(terminalNodes, newWayIds);
        split.limitWays([parentWayID]);

        graph = split(graph);

        let createdWayIds = split.getCreatedWayIDs(); // this should only be 1 way

        graph = followCutLine(graph, parentWayID, cutLineWayID);
        graph = followCutLine(graph, createdWayIds[0], cutLineWayID);

        graph = actionDeleteWay(cutLineWayID)(graph);

        graph = reapplyTags(graph, parentWayID, originalTags);
        graph = reapplyTags(graph, createdWayIds[0], originalTags);

        _resultingWayIds = [ parentWayID, createdWayIds[0] ];

        return graph;


        /**
         * Used to quickly select the area way and the cut line way from the given/selected entities.
         * This assumes the selection is a valid unambiguous combination.
         * @returns {[string, string]}
         */
        function getAreaAndCutlineFromSelected() {
            if (selectedIDs.length === 2) {
                // The user has selected both the cutline and an area

                let ways = action.tellApartCutLineAndArea(graph, selectedIDs); // 0 is cut line and 1 is parent area

                return [
                    ways[1].id,
                    ways[0].id
                ];

            } else { // length === 1
                // The user has selected a cutline only and it's in an area we can unambiguously find/assume

                let cutline = graph.entity(selectedIDs[0]);

                return [
                    action.getSplicableAreaBetween(graph, cutline).id,
                    selectedIDs[0]
                ];
            }
        }


        /**
         * Closes an open way along the given way,
         * i.e. appends nodes to the newly-split now-open area from the cut line.
         * This will choose the correct direction based on the way.
         * @param {coreGraph} graph
         * @param {string} wayId
         * @param {string} followedWayId
         * @returns {coreGraph}
         */
        function followCutLine(graph, wayId, followedWayId) {
            // If we have a way 2-3-4-5-6 and we want to follow way 6-8-9-2, we will end up with 2-3-4-5-6-8-9-2

            let way = graph.entity(wayId);
            let followedWay = graph.entity(followedWayId);

            let appendableNodes = followedWay.nodes;
            if (way.nodes[0] === followedWay.nodes[0]) { // i.e. ways have opposite directions
                appendableNodes = [...appendableNodes].reverse();
            }

            for (let i = 1; i < appendableNodes.length; i++) {
                way = way.addNode(appendableNodes[i]);
            }

            return graph.replace(way);
        }


        /**
         * Copies previously-recorded tags onto a (new) way.
         * This is a 1:1 copy and assumes all the previous tags apply.
         * @param {coreGraph} graph
         * @param {string} wayID
         * @param originalTags
         * @returns {coreGraph}
         */
        function reapplyTags(graph, wayID, originalTags) {

            if (originalTags.length === 0) return graph; // nothing to copy

            let copiedTags = {};
            Object.keys(originalTags).forEach(function(key) { copiedTags[key] = originalTags[key]; });

            graph = graph.replace(graph.entity(wayID).update({ tags: copiedTags }));

            return graph;
        }
    };


    /**
     * Returns the first and last node for the given way.
     * @param {coreGraph} graph
     * @param {string} cutLineWayID
     * @returns {[string, string]}
     */
    function getTerminalNodes(graph, cutLineWayID) {

        let cutLineWay = graph.entity(cutLineWayID);

        let node1 = cutLineWay.nodes[0];
        let node2 = cutLineWay.nodes[cutLineWay.nodes.length - 1];

        return [node1, node2];
    }


    /**
     * Attempts to find an area that is potentially splicable by the given cutline,
     * i.e. connects two non-adjacent nodes of the area.
     * This does not imply that it's allowed to slice this area,
     * this simply locates a potentially-compatible geometry.
     * @param {coreGraph} graph
     * @param {osmWay} cutline
     * @returns {osmWay}
     */
    action.getSplicableAreaBetween = function(graph, cutline) {

        let startNode = graph.entity(cutline.nodes[0]);
        let endNode = graph.entity(cutline.nodes[cutline.nodes.length - 1]);

        let startParents = graph.parentWays(startNode);
        if (startParents.length === 1) return null; // just the cutline

        let endParents = graph.parentWays(endNode);
        if (endParents.length === 1) return null; // just the cutline

        // Find a (single) area that the cutline could unambiguously slice

        let parent = null;

        for (let i = 0; i < startParents.length; i++) {

            if (startParents[i] === cutline) continue;

            if (!startParents[i].isClosed()) continue; // ignoring open ways

            if (!this.isSplicableArea(graph, startParents[i])) continue; // ignoring closed ways that aren't areas

            if (!endParents.includes(startParents[i])) continue;

            if (parent !== null) return null; // multiple splicable areas - ambiguous

            parent = startParents[i];
        }

        if (parent === null) return null;

        // Cut line cannot be an edge of the parent area
        if (cutline.nodes.length === 2 && parent.areAdjacent(startNode, endNode)) return null;

        return parent;
    };

    /**
     * Returns whether the given way can be considered an "area" from user's perspective,
     * i.e. something that should be slicable.
     * @param {coreGraph} graph
     * @param {osmWay} way
     * @returns {boolean}
     */
    action.isSplicableArea = function(graph, way) {
        if (way.isArea()) return true;

        let parentRelations = graph.parentRelations(way);

        for (let i = 0; i < parentRelations.length; i++) {
            if (parentRelations[i].isMultipolygon()) {
                if (parentRelations[i].memberById(way.id).role === 'outer') {
                    if (osmTagSuggestingArea(parentRelations[i].tags)) {
                        return true;
                    }
                }
            }
        }

        return false;
    };


    /**
     * The way IDs that were created after running the action.
     * This includes the original area.
     * @returns {string[]}
     */
    action.getResultingWayIds = function () {
        return _resultingWayIds;
    };

    action.disabledInternalReason = function () {
        return _disabledInternalReason;
    };

    /**
     * Decides between the two provided ways which one is the cut line and which the parent area.
     * @param {coreGraph} graph
     * @param {string[2]} selectedIDs
     * @returns {[osmWay, osmWay]}
     */
    action.tellApartCutLineAndArea = function(graph, selectedIDs) {
        let entity1 = graph.hasEntity(selectedIDs[0]);
        let entity2 = graph.hasEntity(selectedIDs[1]);

        if (entity1.isClosed()) {
            return [entity2, entity1];
        } else {
            return [entity1, entity2];
        }
    };


    action.disabled = function(graph) {
        let cutLineWay;
        let parentWay;

        if (selectedIDs.length === 2) {
            // The user has selected both the cutline and an area

            let ways = action.tellApartCutLineAndArea(graph, selectedIDs); // 0 is cut line and 1 is parent area

            cutLineWay = ways[0];
            parentWay = ways[1];

        } else { // length === 1
            // The user has selected a cutline that's in an area

            cutLineWay = graph.entity(selectedIDs[0]);

            parentWay = action.getSplicableAreaBetween(graph, cutLineWay); // expected to exist if operation allowed action with 1 way
        }


        if (cutLineWay.hasInterestingTags()) return 'cutline_tagged';

        if (graph.parentRelations(cutLineWay).length > 0) return 'cutline_in_relation';

        let parentPolygonCoords = parentWay.nodes.map(function(node) { return graph.entity(node).loc; });

        for (let i = 1; i < cutLineWay.nodes.length - 1; i++) {
            // Note that we don't care about first and last node - they won't be removed or changed

            let node = graph.entity(cutLineWay.nodes[i]);

            if (node.hasInterestingTags()) return 'cutline_nodes_tagged';

            if (graph.parentRelations(node).length > 0) return 'cutline_nodes_in_relation';

            if (graph.isShared(node)) {
                if (graph.parentWays(node).includes(parentWay)) {
                    return 'cutline_multiple_connection';
                } else {
                    return 'cutline_connected_to_other';
                }
            }

            if (!geoPointInPolygon(node.loc, parentPolygonCoords)) return 'cutline_outside_area';
        }


        let isAreaItself = parentWay.isArea();

        let parentRelations = graph.parentRelations(parentWay);

        if (parentRelations.length > 0) {

            let cutlineCoords = cutLineWay.nodes.map(function(node) { return graph.entity(node).loc; });

            for (let i = 0; i < parentRelations.length; i++) {

                if (!parentRelations[i].isMultipolygon()) continue;

                let relationMembers = parentRelations[i].members;

                for (let i = 0; i < relationMembers.length; i++) {

                    if (relationMembers[i].id === parentWay.id) {

                        if (isAreaItself && relationMembers[i].role !== 'inner') return 'area_not_outer_relation_member';
                        // Note that this would produce touching inner rings
                        // (https://wiki.openstreetmap.org/wiki/Relation:multipolygon#Touching_inner_rings)

                        if (!isAreaItself && relationMembers[i].role !== 'outer') return 'area_not_outer_relation_member';

                        continue;
                    }

                    if (relationMembers[i].type !== 'way') continue;

                    let member = graph.hasEntity(relationMembers[i].id);
                    if (!member) return 'area_member_not_downloaded';

                    let memberCoords = member.nodes.map(function(node) { return graph.entity(node).loc; });

                    if (geoPathHasIntersections(cutlineCoords, memberCoords)) return 'cutline_intersects_inner_members';
                }
            }
        }

        // At this point, our own checks are good to go,
        // but we rely on split action internally, so check that we can actually split

        let terminalNodes = getTerminalNodes(graph, cutLineWay.id);

        let split = actionSplit(terminalNodes, newWayIds);
        split.limitWays([parentWay.id]);

        let splitDisabled = split.disabled(graph);

        if (splitDisabled) {
            // We make no assumptions when split is available - if it fails, then so do we.
            // But we can provide the internal reason for the user.
            _disabledInternalReason = 'operations.split.' + splitDisabled;
            return 'cannot_split_area';
        }

        return false;
    };


    return action;
}

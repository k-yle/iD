describe('iD.actionGridify', function () {
    var mockProjection = function (coord) { return coord; };
    mockProjection.invert = function (coord) { return coord; };

    it('splits a way into a grid of smaller ways', function () {
        //    B
        //   / \
        //  /   C
        // A   /
        //  \ /
        //   D
        var graph = iD.coreGraph([
            iD.osmNode({ id: 'A', loc: [0, 2] }),
            iD.osmNode({ id: 'B', loc: [3, 5] }),
            iD.osmNode({ id: 'C', loc: [2, 0] }),
            iD.osmNode({ id: 'D', loc: [5, 3] }),
            iD.osmWay({ id: 'tmp', nodes: ['A', 'B', 'C', 'D', 'A'], tags: { amenity: 'parking_space' } })
        ]);

        // split into a 2x3 grid (2 along the short edge, 3 along long edge)
        graph = iD.actionGridify('tmp', mockProjection)(2, 3)(graph);

        // the original way is gone
        expect(!!graph.hasEntity('tmp')).to.be.false;

        // but the original nodes (A,B,C,D) still exist
        expect(!!graph.hasEntity('A')).to.be.true;

        // in our 2x3 grid, we now have 2*3 ways, made up of (2+1)*(3+1) nodes

        // the first way is row 0, col 0. It re-uses node A.
        expect(graph.entity('w-1').nodes).to.eql(['A', 'n-1', 'n-2', 'n-3', 'A']);
        expect(graph.entity('w-2').nodes).to.eql(['n-3', 'n-2', 'n-4', 'B', 'n-3']);
        expect(graph.entity('w-3').nodes).to.eql(['n-1', 'n-5', 'n-6', 'n-2', 'n-1']);
        expect(graph.entity('w-4').nodes).to.eql(['n-2', 'n-6', 'n-7', 'n-4', 'n-2']);
        expect(graph.entity('w-5').nodes).to.eql(['n-5', 'D', 'n-8', 'n-6', 'n-5']);
        expect(graph.entity('w-6').nodes).to.eql(['n-6', 'n-8', 'C', 'n-7', 'n-6']);
        // the last way is row 1, col 2. It re-uses node C.

        // TODO: assert individual nodes locations

        // check that it copies the tags to all its ways
        expect(graph.entity('w-1').tags).to.eql({ amenity: 'parking_space' });
        expect(graph.entity('w-6').tags).to.eql({ amenity: 'parking_space' });
    });
});

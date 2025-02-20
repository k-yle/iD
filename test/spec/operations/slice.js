describe('iD.operationSlice', function () {
    var fakeContext;
    var graph;

    // Set up the fake context
    fakeContext = {};
    fakeContext.graph = function() { return graph; };

    describe('valid geometry - area', function () {

        beforeEach(function () {
            //
            // Situation:
            //    b ---> c
            //    ^ \    |
            //    |    \ v
            //    a <--- d
            //
            //    Area a-b-c-d-a
            //    Cut line b-d

            var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
            var b = new iD.osmNode({ id: 'b', loc: [0, 1] });
            var c = new iD.osmNode({ id: 'c', loc: [1, 1] });
            var d = new iD.osmNode({ id: 'd', loc: [1, 0] });

            graph = new iD.coreGraph([
                a, b, c, d,
                new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
                new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] })
            ]);
        });

        describe('#not_available', function () {

            it('for no selected ids', function () {
                expect(iD.operationSlice(fakeContext, []).available()).toBeFalsy();
            });

            it('for selected area', function () {
                expect(iD.operationSlice(fakeContext, [ 'area' ]).available()).toBeFalsy();
            });

            it('for selected cutline, area and some node', function () {
                expect(iD.operationSlice(fakeContext, [ 'area', 'cutline', 'a' ]).available()).toBeFalsy();
            });

            it('for selected area and node', function () {
                expect(iD.operationSlice(fakeContext, [ 'area', 'b' ]).available()).toBeFalsy();
            });

            it('for selected cutline\'s node', function () {
                expect(iD.operationSlice(fakeContext, [ 'b', 'd' ]).available()).toBeFalsy();
            });

            it('for selected area and cutline\'s node', function () {
                expect(iD.operationSlice(fakeContext, [ 'area', 'b', 'd' ]).available()).toBeFalsy();
            });
        });

        describe('#available', function () {

            it('for selected cutline', function () {
                expect(iD.operationSlice(fakeContext, [ 'cutline' ]).available()).toBeTruthy();
            });

            it('for selected cutline and area', function () {
                expect(iD.operationSlice(fakeContext, [ 'cutline', 'area' ]).available()).toBeTruthy();
                expect(iD.operationSlice(fakeContext, [ 'area', 'cutline' ]).available()).toBeTruthy();
            });
        });
    });

    describe('invalid geometry - loop', function () {

        beforeEach(function () {
            //
            // Situation:
            //    b ---> c
            //    ^ \    |
            //    |    \ v
            //    a <--- d
            //
            //    Loop (closed way but not area) a-b-c-d-a
            //    Cut line b-d

            var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
            var b = new iD.osmNode({ id: 'b', loc: [0, 1] });
            var c = new iD.osmNode({ id: 'c', loc: [1, 1] });
            var d = new iD.osmNode({ id: 'd', loc: [1, 0] });

            graph = new iD.coreGraph([
                a, b, c, d,
                new iD.osmWay({ id: 'loop', nodes: ['a', 'b', 'c', 'd', 'a'] }),
                new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'], tags: { interesting: 'yes' } })
            ]);
        });

        describe('#not_available', function () {

            it('for selected cutline', function () {
                expect(iD.operationSlice(fakeContext, [ 'cutline' ]).available()).toBeFalsy();
            });

            it('for selected cutline and area', function () {
                expect(iD.operationSlice(fakeContext, [ 'cutline', 'loop' ]).available()).toBeFalsy();
                expect(iD.operationSlice(fakeContext, [ 'loop', 'cutline' ]).available()).toBeFalsy();
            });

            it('for selected area', function () {
                expect(iD.operationSlice(fakeContext, [ 'loop' ]).available()).toBeFalsy();
            });
        });
    });

    describe('valid geometry - separated multipolygon', function () {

        beforeEach(function () {
            //
            // Situation:
            //    b ---> c       y ---> w
            //    ^ \    |       ^      |
            //    |    \ |       |      v
            //    a <--- d       u <--- z
            //
            //    Area a-b-c-d-a
            //    Cut line b-d
            //    Another area u-y-w-z-u
            //    Multipolygon Relation with members Area and Another area

            var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
            var b = new iD.osmNode({ id: 'b', loc: [0, 1] });
            var c = new iD.osmNode({ id: 'c', loc: [1, 1] });
            var d = new iD.osmNode({ id: 'd', loc: [1, 0] });
            var u = new iD.osmNode({ id: 'u', loc: [2, 0] });
            var y = new iD.osmNode({ id: 'y', loc: [2, 1] });
            var w = new iD.osmNode({ id: 'w', loc: [3, 1] });
            var z = new iD.osmNode({ id: 'z', loc: [2, 1] });

            graph = new iD.coreGraph([
                a, b, c, d, u, y, w, z,
                new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'] }),
                new iD.osmWay({ id: 'another', nodes: ['y', 'w', 'u', 'z', 'y'] }),
                new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] }),
                new iD.osmRelation({ id: 'rel', tags: { type: 'multipolygon', area: 'yes' }, members: [
                    { id: 'area', type: 'way', role: 'outer' },
                    { id: 'another', type: 'way', role: 'outer' }
                ]})
            ]);
        });

        describe('#not_available', function () {

            it('for selected cutline and other area', function () {
                expect(iD.operationSlice(fakeContext, [ 'cutline', 'another' ]).available()).toBeFalsy();
                expect(iD.operationSlice(fakeContext, [ 'another', 'cutline' ]).available()).toBeFalsy();
            });
        });

        describe('#available', function () {

            it('for selected cutline', function () {
                expect(iD.operationSlice(fakeContext, [ 'cutline' ]).available()).toBeTruthy();
            });

            it('for selected cutline and area', function () {
                expect(iD.operationSlice(fakeContext, [ 'cutline', 'area' ]).available()).toBeTruthy();
                expect(iD.operationSlice(fakeContext, [ 'area', 'cutline' ]).available()).toBeTruthy();
            });
        });
    });

    describe('invalid geometry - relation', function () {

        beforeEach(function () {
            //
            // Situation:
            //    b ---> c       y ---> w
            //    ^ \    |       ^      |
            //    |    \ |       |      v
            //    a <--- d       u <--- z
            //
            //    Area a-b-c-d-a
            //    Cut line b-d
            //    Another area u-y-w-z-u
            //    Random Relation with members Area and Another area

            var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
            var b = new iD.osmNode({ id: 'b', loc: [0, 1] });
            var c = new iD.osmNode({ id: 'c', loc: [1, 1] });
            var d = new iD.osmNode({ id: 'd', loc: [1, 0] });
            var u = new iD.osmNode({ id: 'u', loc: [2, 0] });
            var y = new iD.osmNode({ id: 'y', loc: [2, 1] });
            var w = new iD.osmNode({ id: 'w', loc: [3, 1] });
            var z = new iD.osmNode({ id: 'z', loc: [2, 1] });

            graph = new iD.coreGraph([
                a, b, c, d, u, y, w, z,
                new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'] }),
                new iD.osmWay({ id: 'another', nodes: ['y', 'w', 'u', 'z', 'y'] }),
                new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] }),
                new iD.osmRelation({ id: 'rel', tags: { type: 'whatever' }, members: [
                    { id: 'area', type: 'way' },
                    { id: 'another', type: 'way' }
                ]})
            ]);
        });

        describe('#not_available', function () {

            it('for selected cutline', function () {
                expect(iD.operationSlice(fakeContext, [ 'cutline' ]).available()).toBeFalsy();
            });

            it('for selected cutline and area', function () {
                expect(iD.operationSlice(fakeContext, [ 'cutline', 'area' ]).available()).toBeFalsy();
                expect(iD.operationSlice(fakeContext, [ 'area', 'cutline' ]).available()).toBeFalsy();
            });
        });
    });
});

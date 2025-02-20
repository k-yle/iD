describe('iD.actionSlice', function () {

    describe('#disabled', function () {

        it('disabled when cutline has tags', function () {
            //
            // Situation:
            //    b ---> c
            //    ^ \    |
            //    |    \ v
            //    a <--- d
            //
            //    Area a-b-c-d-a
            //    Cut line b-d; has tags

            var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
            var b = new iD.osmNode({ id: 'b', loc: [0, 1] });
            var c = new iD.osmNode({ id: 'c', loc: [1, 1] });
            var d = new iD.osmNode({ id: 'd', loc: [1, 0] });
            var graph = new iD.coreGraph([
                a, b, c, d,
                new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
                new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'], tags: { interesting: 'yes' } })
            ]);

            expect(iD.actionSlice(['area', 'cutline']).disabled(graph)).toEqual('cutline_tagged');
        });

        it('disabled when cutline is in a relation', function () {
            //
            // Situation:
            //    b ---> c
            //    ^ \    |
            //    |    \ v
            //    a <--- d
            //
            //    Area a-b-c-d-a
            //    Cut line b-d; in is relation

            var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
            var b = new iD.osmNode({ id: 'b', loc: [0, 1] });
            var c = new iD.osmNode({ id: 'c', loc: [1, 1] });
            var d = new iD.osmNode({ id: 'd', loc: [1, 0] });
            var graph = new iD.coreGraph([
                a, b, c, d,
                new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
                new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] }),
                new iD.osmRelation({ id: 'relation', members: [ { id: 'cutline', type: 'way' } ]})
            ]);

            expect(iD.actionSlice(['area', 'cutline']).disabled(graph)).toEqual('cutline_in_relation');
        });

        it('disabled when cutline\'s inner node has tags', function () {
            //
            // Situation:
            //    b ------> c
            //    ^  \      |
            //    |    x    |
            //    |      \  v
            //    a <------ d
            //
            //    Area a-b-c-d-a
            //    Cut line b-x-d
            //    Node x has tags

            var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
            var b = new iD.osmNode({ id: 'b', loc: [0, 2] });
            var c = new iD.osmNode({ id: 'c', loc: [2, 2] });
            var d = new iD.osmNode({ id: 'd', loc: [2, 0] });
            var x = new iD.osmNode({ id: 'x', loc: [1, 1], tags: { interesting: 'yes' } });
            var graph = new iD.coreGraph([
                a, b, c, d, x,
                new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
                new iD.osmWay({ id: 'cutline', nodes: ['b', 'x', 'd'] })
            ]);

            expect(iD.actionSlice(['area', 'cutline']).disabled(graph)).toEqual('cutline_nodes_tagged');
        });

        it('disabled when cutline\'s inner node is in a relation', function () {
            //
            // Situation:
            //    b ------> c
            //    ^  \      |
            //    |    x    |
            //    |      \  v
            //    a <------ d
            //
            //    Area a-b-c-d-a
            //    Cut line b-x-d
            //    Node x is in relation

            var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
            var b = new iD.osmNode({ id: 'b', loc: [0, 2] });
            var c = new iD.osmNode({ id: 'c', loc: [2, 2] });
            var d = new iD.osmNode({ id: 'd', loc: [2, 0] });
            var x = new iD.osmNode({ id: 'x', loc: [1, 1] });
            var graph = new iD.coreGraph([
                a, b, c, d, x,
                new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
                new iD.osmWay({ id: 'cutline', nodes: ['b', 'x', 'd'] }),
                new iD.osmRelation({ id: 'relation', members: [ { id: 'x', type: 'way' } ]})
            ]);

            expect(iD.actionSlice(['area', 'cutline']).disabled(graph)).toEqual('cutline_nodes_in_relation');
        });

        it('disabled when cutline\'s inner node connects to other ways', function () {
            //
            // Situation:
            //    b --------> c
            //    ^ \         |
            //    |   \   y   |
            //    |     x     |
            //    |       \   |
            //    |         \ v
            //    a <-------- d
            //
            //    Area a-b-c-d-a
            //    Cut line b-x-d
            //    Way x-y

            var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
            var b = new iD.osmNode({ id: 'b', loc: [0, 2] });
            var c = new iD.osmNode({ id: 'c', loc: [2, 2] });
            var d = new iD.osmNode({ id: 'd', loc: [2, 0] });
            var x = new iD.osmNode({ id: 'x', loc: [1, 1] });
            var y = new iD.osmNode({ id: 'y', loc: [1.5, 1.5] });
            var graph = new iD.coreGraph([
                a, b, c, d, x, y,
                new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
                new iD.osmWay({ id: 'cutline', nodes: ['b', 'x', 'd'] }),
                new iD.osmWay({ id: 'other', nodes: ['x', 'y'] })
            ]);

            expect(iD.actionSlice(['area', 'cutline']).disabled(graph)).toEqual('cutline_connected_to_other');
        });

        it('disabled when cutline\'s inner node connect to parent way', function () {
            //
            // Situation:
            //    b -----> c
            //    ^  \     |
            //    |     \  |
            //    |        x
            //    |     /  |
            //    |  /     v
            //    a <----- d
            //
            //    Area a-b-c-x-d-a
            //    Cut line b-x-d
            //    Node x is shared
            //

            var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
            var b = new iD.osmNode({ id: 'b', loc: [0, 4] });
            var c = new iD.osmNode({ id: 'c', loc: [2, 4] });
            var x = new iD.osmNode({ id: 'x', loc: [2, 2] });
            var d = new iD.osmNode({ id: 'd', loc: [2, 0] });
            var graph = new iD.coreGraph([
                a, b, c, d, x,
                new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'x', 'd', 'a'], tags: { area: 'yes' } }),
                new iD.osmWay({ id: 'cutline', nodes: ['b', 'x', 'a'] })
            ]);

            expect(iD.actionSlice(['area', 'cutline']).disabled(graph)).toEqual('cutline_multiple_connection');
        });

        it('disabled when cutline\'s inner node is outside the parent way', function () {
            //
            // Situation:
            //
            //           __--- x
            //     ---```     /
            //    b ---> c   /
            //    ^      |  /
            //    |      v /
            //    a <--- d
            //
            //    Area a-b-c-d-a
            //    Cut line b-x-d
            //    Node x is outside area
            //

            var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
            var b = new iD.osmNode({ id: 'b', loc: [0, 1] });
            var c = new iD.osmNode({ id: 'c', loc: [1, 1] });
            var d = new iD.osmNode({ id: 'd', loc: [1, 0] });
            var x = new iD.osmNode({ id: 'x', loc: [2, 2] });
            var graph = new iD.coreGraph([
                a, b, c, d, x,
                new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
                new iD.osmWay({ id: 'cutline', nodes: ['b', 'x', 'd'] })
            ]);

            expect(iD.actionSlice(['area', 'cutline']).disabled(graph)).toEqual('cutline_outside_area');
        });

        it('disabled when cutline intersects with another way in parent way\'s multipolygon relation', function () {
            //
            // Situation:
            //    b ------------> c
            //    ^ \             |
            //    |   \           |
            //    |  u -\ ---- w  |
            //    |  |    \    |  |
            //    |  y -----\- z  |
            //    |           \   |
            //    |             \ v
            //    a <------------ d
            //
            //    Area a-b-c-d-a
            //    Cut line b-d
            //    Inner area y-u-w-z-y
            //    Relation containing Area and Inner area

            var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
            var b = new iD.osmNode({ id: 'b', loc: [0, 5] });
            var c = new iD.osmNode({ id: 'c', loc: [5, 5] });
            var d = new iD.osmNode({ id: 'd', loc: [5, 0] });
            var y = new iD.osmNode({ id: 'y', loc: [1, 2] });
            var u = new iD.osmNode({ id: 'u', loc: [1, 3] });
            var w = new iD.osmNode({ id: 'w', loc: [4, 3] });
            var z = new iD.osmNode({ id: 'z', loc: [4, 2] });
            var graph = new iD.coreGraph([
                a, b, c, d, y, u, w, z,
                new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'] }),
                new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] }),
                new iD.osmWay({ id: 'inside', nodes: ['y', 'u', 'w', 'z', 'y'] }),
                new iD.osmRelation({ id: 'rel', tags: { type: 'multipolygon', area: 'yes' }, members: [
                    { id: 'area', type: 'way', role: 'outer' },
                    { id: 'inside', type: 'way', role: 'inner' }
                ]})
            ]);

            expect(iD.actionSlice(['area', 'cutline']).disabled(graph)).toEqual('cutline_intersects_inner_members');
        });

        it('disabled when cutline is on a inner multipolygon way that is not an area', function () {
            //
            // Situation:
            //    u -------------- w
            //    |                |
            //    |    b ---> c    |
            //    |    ^ \    |    |
            //    |    |    \ v    |
            //    |    a <--- d    |
            //    |                |
            //    y -------------- z
            //
            //    Area a-b-c-d-a
            //    Cut line b-d
            //    Outside area y-u-w-z-y
            //    Relation containing Area and Outside area

            var a = new iD.osmNode({ id: 'a', loc: [1, 1] });
            var b = new iD.osmNode({ id: 'b', loc: [1, 2] });
            var c = new iD.osmNode({ id: 'c', loc: [2, 2] });
            var d = new iD.osmNode({ id: 'd', loc: [2, 1] });
            var y = new iD.osmNode({ id: 'y', loc: [0, 0] });
            var u = new iD.osmNode({ id: 'u', loc: [0, 3] });
            var w = new iD.osmNode({ id: 'w', loc: [3, 3] });
            var z = new iD.osmNode({ id: 'z', loc: [3, 0] });
            var graph = new iD.coreGraph([
                a, b, c, d, y, u, w, z,
                new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'] }),
                new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] }),
                new iD.osmWay({ id: 'outside', nodes: ['y', 'u', 'w', 'z', 'y'] }),
                new iD.osmRelation({ id: 'rel', tags: { type: 'multipolygon', area: 'yes' }, members: [
                    { id: 'area', type: 'way', role: 'inner' },
                    { id: 'outside', type: 'way', role: 'outer' }
                ]})
            ]);

            expect(iD.actionSlice(['area', 'cutline']).disabled(graph)).toEqual('area_not_outer_relation_member');
        });

    });


    it('slices a square', function () {
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
        var graph = new iD.coreGraph([
            a, b, c, d,
            new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
            new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] })
        ]);

        var graph1 = iD.actionSlice(['area', 'cutline'], ['new'])(graph);
        expect(graph1.hasEntity('cutline')).toBeUndefined();
        expect(graph1.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph1.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);

        var graph2 = iD.actionSlice(['cutline'], ['new'])(graph);
        expect(graph2.hasEntity('cutline')).toBeUndefined();
        expect(graph2.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph2.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);
    });

    it('slices with an extra node', function () {
        //
        // Situation:
        //    b ------> c
        //    ^  \      |
        //    |    x    |
        //    |      \  v
        //    a <------ d
        //
        //    Area a-b-c-d-a
        //    Cut line b-x-d

        var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
        var b = new iD.osmNode({ id: 'b', loc: [0, 2] });
        var c = new iD.osmNode({ id: 'c', loc: [2, 2] });
        var d = new iD.osmNode({ id: 'd', loc: [2, 0] });
        var x = new iD.osmNode({ id: 'x', loc: [1, 1] });
        var graph = new iD.coreGraph([
            a, b, c, d, x,
            new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
            new iD.osmWay({ id: 'cutline', nodes: ['b', 'x', 'd'] })
        ]);

        var graph1 = iD.actionSlice(['area', 'cutline'], ['new'])(graph);
        expect(graph1.hasEntity('cutline')).toBeUndefined();
        expect(graph1.entity('area').nodes).toEqual(['d', 'a', 'b', 'x', 'd']);
        expect(graph1.entity('new').nodes).toEqual(['b', 'c', 'd', 'x', 'b']);

        var graph2 = iD.actionSlice(['cutline'], ['new'])(graph);
        expect(graph2.hasEntity('cutline')).toBeUndefined();
        expect(graph2.entity('area').nodes).toEqual(['d', 'a', 'b', 'x', 'd']);
        expect(graph2.entity('new').nodes).toEqual(['b', 'c', 'd', 'x', 'b']);
    });

    it('slices when another way terminates at node', function () {
        //
        // Situation:
        //    b ---> c
        //    ^ \    |
        //    |    \ v
        //    a <--- d ---> y
        //
        //    Area a-b-c-d-a
        //    Way d-y
        //    Cut line b-d

        var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
        var b = new iD.osmNode({ id: 'b', loc: [0, 1] });
        var c = new iD.osmNode({ id: 'c', loc: [1, 1] });
        var d = new iD.osmNode({ id: 'd', loc: [1, 0] });
        var y = new iD.osmNode({ id: 'y', loc: [2, 0] });
        var graph = new iD.coreGraph([
            a, b, c, d, y,
            new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
            new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] }),
            new iD.osmWay({ id: 'Y', nodes: ['d', 'y'] })
        ]);

        var graph1 = iD.actionSlice(['area', 'cutline'], ['new'])(graph);
        expect(graph1.hasEntity('cutline')).toBeUndefined();
        expect(graph1.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph1.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);

        var graph2 = iD.actionSlice(['cutline'], ['new'])(graph);
        expect(graph2.hasEntity('cutline')).toBeUndefined();
        expect(graph2.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph2.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);
    });

    it('slices when another way passes through a node', function () {
        //
        // Situation:
        //    b ---> c
        //    ^ \    |
        //    |    \ v
        //    a <--- d ---- y
        //           |
        //           u
        //
        //    Area a-b-c-d-a
        //    Way u-d-y
        //    Cut line b-d

        var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
        var b = new iD.osmNode({ id: 'b', loc: [0, 1] });
        var c = new iD.osmNode({ id: 'c', loc: [1, 1] });
        var d = new iD.osmNode({ id: 'd', loc: [1, 0] });
        var y = new iD.osmNode({ id: 'y', loc: [2, 0] });
        var u = new iD.osmNode({ id: 'u', loc: [1, -1] });
        var graph = new iD.coreGraph([
            a, b, c, d, y, u,
            new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
            new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] }),
            new iD.osmWay({ id: 'Y', nodes: ['u', 'd', 'y'] })
        ]);

        var graph1 = iD.actionSlice(['area', 'cutline'], ['new'])(graph);
        expect(graph1.hasEntity('cutline')).toBeUndefined();
        expect(graph1.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph1.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);

        var graph2 = iD.actionSlice(['cutline'], ['new'])(graph);
        expect(graph2.hasEntity('cutline')).toBeUndefined();
        expect(graph2.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph2.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);
    });

    it('slices when another area terminates at node', function () {
        //
        // Situation:
        //    b ---> c      u
        //    ^ \    |    / |
        //    |    \ v  /   |
        //    a <--- d ---- y
        //
        //    Area a-b-c-d-a
        //    Area d-y-u-d
        //    Cut line b-d

        var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
        var b = new iD.osmNode({ id: 'b', loc: [0, 1] });
        var c = new iD.osmNode({ id: 'c', loc: [1, 1] });
        var d = new iD.osmNode({ id: 'd', loc: [1, 0] });
        var y = new iD.osmNode({ id: 'y', loc: [2, 0] });
        var u = new iD.osmNode({ id: 'u', loc: [2, 1] });
        var graph = new iD.coreGraph([
            a, b, c, d, y, u,
            new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
            new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] }),
            new iD.osmWay({ id: 'Y', nodes: ['d', 'y', 'u', 'd'] })
        ]);

        var graph1 = iD.actionSlice(['area', 'cutline'], ['new'])(graph);
        expect(graph1.hasEntity('cutline')).toBeUndefined();
        expect(graph1.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph1.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);

        var graph2 = iD.actionSlice(['cutline'], ['new'])(graph);
        expect(graph2.hasEntity('cutline')).toBeUndefined();
        expect(graph2.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph2.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);
    });

    it('slices when another way connects to both nodes', function () {
        //
        // Situation:
        //    w ----------- u
        //    |             |
        //    b ---> c      |
        //    ^ \    |      |
        //    |    \ v      |
        //    a <--- d ---- y
        //
        //    Area a-b-c-d-a
        //    Way d-y-u-w-b
        //    Cut line b-d

        var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
        var b = new iD.osmNode({ id: 'b', loc: [0, 1] });
        var c = new iD.osmNode({ id: 'c', loc: [1, 1] });
        var d = new iD.osmNode({ id: 'd', loc: [1, 0] });
        var y = new iD.osmNode({ id: 'y', loc: [2, 0] });
        var u = new iD.osmNode({ id: 'u', loc: [2, 2] });
        var w = new iD.osmNode({ id: 'w', loc: [0, 2] });
        var graph = new iD.coreGraph([
            a, b, c, d, y, u, w,
            new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
            new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] }),
            new iD.osmWay({ id: 'Y', nodes: ['d', 'y', 'u', 'w', 'b'] })
        ]);

        var graph1 = iD.actionSlice(['area', 'cutline'], ['new'])(graph);
        expect(graph1.hasEntity('cutline')).toBeUndefined();
        expect(graph1.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph1.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);

        var graph2 = iD.actionSlice(['cutline'], ['new'])(graph);
        expect(graph2.hasEntity('cutline')).toBeUndefined();
        expect(graph2.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph2.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);
    });

    it('slices explicitly when another area connects to both nodes', function () {
        //
        // Situation:
        //    w ----------- u
        //    |             |
        //    b ---> c      |
        //    ^ \    |      |
        //    |    \ v      |
        //    a <--- d ---- y
        //
        //    Area a-b-c-d-a
        //    Area a-b-w-u-y-d-a
        //    Cut line b-d

        var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
        var b = new iD.osmNode({ id: 'b', loc: [0, 1] });
        var c = new iD.osmNode({ id: 'c', loc: [1, 1] });
        var d = new iD.osmNode({ id: 'd', loc: [1, 0] });
        var y = new iD.osmNode({ id: 'y', loc: [2, 0] });
        var u = new iD.osmNode({ id: 'u', loc: [2, 2] });
        var w = new iD.osmNode({ id: 'w', loc: [0, 2] });
        var graph = new iD.coreGraph([
            a, b, c, d, y, u, w,
            new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
            new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] }),
            new iD.osmWay({ id: 'Y', nodes: ['a', 'b', 'w', 'u', 'y', 'd', 'a'] })
        ]);

        graph = iD.actionSlice(['area', 'cutline'], ['new'])(graph);
        expect(graph.hasEntity('cutline')).toBeUndefined();
        expect(graph.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);
    });

    it('slices when a cutline\'s terminal node has tags', function () {
        //
        // Situation:
        //    b ---> c
        //    ^ \    |
        //    |    \ v
        //    a <--- d
        //
        //    Area a-b-c-d-a
        //    Cut line b-d
        //    Node d has tags

        var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
        var b = new iD.osmNode({ id: 'b', loc: [0, 1] });
        var c = new iD.osmNode({ id: 'c', loc: [1, 1] });
        var d = new iD.osmNode({ id: 'd', loc: [1, 0], tags: { interesting: 'yes' } });
        var graph = new iD.coreGraph([
            a, b, c, d,
            new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
            new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] })
        ]);

        var graph1 = iD.actionSlice(['area', 'cutline'], ['new'])(graph);
        expect(graph1.hasEntity('cutline')).toBeUndefined();
        expect(graph1.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph1.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);

        var graph2 = iD.actionSlice(['cutline'], ['new'])(graph);
        expect(graph2.hasEntity('cutline')).toBeUndefined();
        expect(graph2.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph2.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);
    });

    it('slices an area in a relation', function () {
        //
        // Situation:
        //    b ---> c
        //    ^ \    |
        //    |    \ v
        //    a <--- d
        //
        //    Area a-b-c-d-a
        //    Cut line b-d
        //    Relation containing Area and Node e

        var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
        var b = new iD.osmNode({ id: 'b', loc: [0, 1] });
        var c = new iD.osmNode({ id: 'c', loc: [1, 1] });
        var d = new iD.osmNode({ id: 'd', loc: [1, 0] });
        var graph = new iD.coreGraph([
            a, b, c, d,
            new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
            new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] }),
            new iD.osmRelation({ id: 'rel', tags: { type: 'multipolygon' }, members: [
                { id: 'area', type: 'way' },
            ]})
        ]);

        var graph1 = iD.actionSlice(['area', 'cutline'], ['new'])(graph);
        expect(graph1.hasEntity('cutline')).toBeUndefined();
        expect(graph1.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph1.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);

        var graph2 = iD.actionSlice(['cutline'], ['new'])(graph);
        expect(graph2.hasEntity('cutline')).toBeUndefined();
        expect(graph2.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph2.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);
    });

    it('slice when cutline doesn\'t intersect with another way in parent way\'s multipolygon relation', function () {
        //
        // Situation:
        //    b -- c --------> d
        //    ^    :           |
        //    |    :   u -- w  |
        //    |    :   |    |  |
        //    |    :   y -- z  |
        //    |    :           v
        //    a <- f <-------- e
        //
        //    Area a-b-c-d-e-f-a
        //    Cut line c-f
        //    Inner area y-u-w-z-y
        //    Relation containing Area and Inner area

        var a = new iD.osmNode({ id: 'a', loc: [0, 0] });
        var b = new iD.osmNode({ id: 'b', loc: [0, 3] });
        var c = new iD.osmNode({ id: 'c', loc: [1, 3] });
        var d = new iD.osmNode({ id: 'd', loc: [3, 3] });
        var e = new iD.osmNode({ id: 'e', loc: [3, 0] });
        var f = new iD.osmNode({ id: 'f', loc: [1, 0] });
        var y = new iD.osmNode({ id: 'y', loc: [2, 1] });
        var u = new iD.osmNode({ id: 'u', loc: [2, 2] });
        var w = new iD.osmNode({ id: 'w', loc: [3, 2] });
        var z = new iD.osmNode({ id: 'z', loc: [3, 1] });
        var graph = new iD.coreGraph([
            a, b, c, d, e, f, y, u, w, z,
            new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'e', 'f', 'a'], tags: { area: 'yes' } }),
            new iD.osmWay({ id: 'cutline', nodes: ['c', 'f'] }),
            new iD.osmWay({ id: 'inside', nodes: ['y', 'u', 'w', 'z', 'y'] }),
            new iD.osmRelation({ id: 'rel', tags: { type: 'multipolygon' }, members: [
                { id: 'area', type: 'way', role: 'outer' },
                { id: 'inside', type: 'way', role: 'inner' }
            ]})
        ]);

        var graph1 = iD.actionSlice(['area', 'cutline'], ['new'])(graph);
        expect(graph1.hasEntity('cutline')).toBeUndefined();
        expect(graph1.entity('area').nodes).toEqual(['c', 'd', 'e', 'f', 'c']);
        expect(graph1.entity('new').nodes).toEqual(['f', 'a', 'b', 'c', 'f']);

        var graph2 = iD.actionSlice(['cutline'], ['new'])(graph);
        expect(graph2.hasEntity('cutline')).toBeUndefined();
        expect(graph2.entity('area').nodes).toEqual(['c', 'd', 'e', 'f', 'c']);
        expect(graph2.entity('new').nodes).toEqual(['f', 'a', 'b', 'c', 'f']);
    });

    it('slice when cutline is on an area that is an inner multipolygon member', function () {
        //
        // Situation:
        //    u -------------- w
        //    |                |
        //    |    b ---> c    |
        //    |    ^ \    |    |
        //    |    |    \ v    |
        //    |    a <--- d    |
        //    |                |
        //    y -------------- z
        //
        //    Area a-b-c-d-a
        //    Cut line b-d
        //    Outside area y-u-w-z-y
        //    Relation containing Area and Outside area

        var a = new iD.osmNode({ id: 'a', loc: [1, 1] });
        var b = new iD.osmNode({ id: 'b', loc: [1, 2] });
        var c = new iD.osmNode({ id: 'c', loc: [2, 2] });
        var d = new iD.osmNode({ id: 'd', loc: [2, 1] });
        var y = new iD.osmNode({ id: 'y', loc: [0, 0] });
        var u = new iD.osmNode({ id: 'u', loc: [0, 3] });
        var w = new iD.osmNode({ id: 'w', loc: [3, 3] });
        var z = new iD.osmNode({ id: 'z', loc: [3, 0] });
        var graph = new iD.coreGraph([
            a, b, c, d, y, u, w, z,
            new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes' } }),
            new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] }),
            new iD.osmWay({ id: 'outside', nodes: ['y', 'u', 'w', 'z', 'y'] }),
            new iD.osmRelation({ id: 'rel', tags: { type: 'multipolygon' }, members: [
                    { id: 'area', type: 'way', role: 'inner' },
                    { id: 'outside', type: 'way', role: 'outer' }
                ]})
        ]);

        var graph1 = iD.actionSlice(['area', 'cutline'], ['new'])(graph);
        expect(graph1.hasEntity('cutline')).toBeUndefined();
        expect(graph1.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph1.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);

        var graph2 = iD.actionSlice(['cutline'], ['new'])(graph);
        expect(graph2.hasEntity('cutline')).toBeUndefined();
        expect(graph2.entity('area').nodes).toEqual(['d', 'a', 'b', 'd']);
        expect(graph2.entity('new').nodes).toEqual(['b', 'c', 'd', 'b']);
    });

    it('copies given area\'s tags to the new area', function () {
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
        var graph = new iD.coreGraph([
            a, b, c, d,
            new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes', interesting: 'very' } }),
            new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] })
        ]);

        graph = iD.actionSlice(['area', 'cutline'], ['new'])(graph);
        expect(graph.entity('area').tags).toEqual({ area: 'yes', interesting: 'very' });
        expect(graph.entity('new').tags).toEqual({ area: 'yes', interesting: 'very' });
    });

    it('adds the new area to the given area\'s relation', function () {
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
        var graph = new iD.coreGraph([
            a, b, c, d,
            new iD.osmWay({ id: 'area', nodes: ['a', 'b', 'c', 'd', 'a'], tags: { area: 'yes', interesting: 'very' } }),
            new iD.osmWay({ id: 'cutline', nodes: ['b', 'd'] }),
            new iD.osmRelation({ id: 'rel', tags: { type: 'multipolygon' }, members: [
                { id: 'area', type: 'way', role: 'outer' }
            ]})
        ]);

        graph = iD.actionSlice(['area', 'cutline'], ['new'])(graph);
        expect(graph.entity('rel').members.map(function (m) { return m.id; })).toEqual(['area', 'new']);
        // todo: is the new one role:outer too?
    });
});

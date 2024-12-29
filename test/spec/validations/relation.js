const n1 = new iD.osmNode({ loc: [1, 1] });
const n2 = new iD.osmNode({ loc: [2, 2] });
const n3 = new iD.osmNode({ loc: [3, 3] });
const line = new iD.osmWay({ nodes: [n1.id, n2.id, n3.id] });

describe('iD.validations.relation', () => {
  /** @type {iD.Context} */
  let context;

  beforeEach(async () => {
    context = iD.coreContext().assetPath('../dist/').init();
    iD.fileFetcher.cache().preset_presets = {
      Suburb: { tags: { place: '*' }, geometry: ['point', 'vertex'] },

      'Admin Boundary': {
        tags: { type: 'boundary' },
        geometry: ['relation'],
        relation: {
          reference: 'boundary',
          allowDuplicateMembers: false,
          role_labels: {
            inner: 'Inner',
            outer: 'Outer',
            admin_center: 'Admin Centre',
            label: 'Label',
          },
          members: [
            { role: 'inner', geometry: ['line', 'area'] },
            { role: 'outer', geometry: ['line', 'area'], min: 1 },
            {
              role: 'admin_center',
              geometry: ['point', 'vertex'],
              matchTags: [{ place: '*' }],
              max: 1,
            },
            {
              role: 'label',
              geometry: ['point', 'vertex'],
              matchTags: [{ place: '*' }],
              max: 1,
            },
          ],
        },
      },
      // this preset borrows the schema from the preset above
      'Disputed Admin Boundary': {
        tags: { type: 'boundary', boundary: 'disputed' },
        geometry: ['relation'],
        relationCrossReference: '{Admin Boundary}',
      },
    };
    await iD.presetManager.ensureLoaded(true);
  });

  /**
   * extracts the plain text from the result of `t.append(…)`
   * @param {import('../../../modules/core/localizer').LocalizedTextRenderer} renderer
   */
  const text = (renderer) => renderer.info?.texts.join('');

  /**
   * @param {Tags} tags
   * @param {({ role: string; type: 'n' | 'w' | 'r'; tags?: Tags } | { role: string; raw: iD.OsmEntity })[]} members
   */
  function createRelation(tags, members) {
    const resolvedMembers = members.map((member) => {
      if ('raw' in member) return member.raw;
      if (member.type === 'n') {
        return new iD.osmNode({ loc: [0, 0], tags: member.tags });
      }
      if (member.type === 'w') {
        return new iD.osmWay({ nodes: [], tags: member.tags });
      }
      return new iD.osmRelation({ members: [], tags: member.tags });
    });

    const mainRelation = new iD.osmRelation({
      members: members.map((m, index) => {
        const resolved = resolvedMembers[index];
        return { role: m.role, type: resolved.type, id: resolved.id };
      }),
      tags,
    });

    const toAdd = [...resolvedMembers, mainRelation, n1, n2, n3];
    context.perform(...toAdd.map(iD.actionAddEntity));

    return mainRelation;
  }

  function validate() {
    const validator = iD.validationRelation();
    const changes = context.history().changes();
    const issues = Object.values(changes)
      .flat()
      .flatMap((entity) => validator(entity, context.graph()));
    return issues;
  }

  it('has no errors on init', () => {
    const issues = validate();
    expect(issues).toStrictEqual([]);
  });

  it('errors if there are min requirement is not satisfied', () => {
    createRelation({ type: 'boundary' }, []);

    const issues = validate();
    expect(issues).toHaveLength(1);
    expect(issues[0].subtype).toBe('too_few');
    expect(text(issues[0].message())).toBe(
      'Admin Boundary does not have enough members with the role “Outer”'
    );
    const fixes = issues[0].dynamicFixes();
    expect(fixes).toHaveLength(1);
    expect(text(fixes[0].title)).toBe('Add 1 member/s with the role “Outer”');
  });

  it('errors if there are max requirement is not satisfied', () => {
    createRelation({ type: 'boundary', name: 'Exampletown' }, [
      { role: 'outer', type: 'w' },
      { role: 'label', type: 'n', tags: { place: 'village' } },
      { role: 'label', type: 'n', tags: { place: 'town' } },
    ]);
    const issues = validate();

    expect(issues).toHaveLength(1);
    expect(issues[0].subtype).toBe('too_many');
    expect(text(issues[0].message())).toBe(
      'Exampletown has too many members with the role “Label”'
    );

    const fixes = issues[0].dynamicFixes();
    expect(fixes).toHaveLength(1);
    expect(text(fixes[0].title)).toBe('Remove 1 member/s with the role “Label”');
  });

  it('errors if a role is missing, and only suggests appropriate roles (ways)', () => {
    createRelation({ type: 'boundary' }, [
      { role: 'outer', type: 'w' },
      { role: '', raw: line },
    ]);

    const issues = validate();
    expect(issues).toHaveLength(1);
    expect(issues[0].subtype).toBe('wrong_role');
    expect(text(issues[0].message())).toBe('Line Line has the wrong role within Admin Boundary');

    const fixes = issues[0].dynamicFixes();
    expect(fixes).toHaveLength(3);
    expect(text(fixes[0].title)).toBe('Change role to “Inner”');
    expect(text(fixes[1].title)).toBe('Change role to “Outer”');
    // admin_centre is not a suggestion, because this is a way, not a node.
    expect(text(fixes[2].title)).toBe('Remove from relation');
  });

  it('errors if a role is missing, and only suggests appropriate roles (nodes)', () => {
    createRelation({ type: 'boundary' }, [
      { role: 'outer', type: 'w' },
      { role: '', type: 'n', tags: { place: 'suburb' } },
    ]);

    const issues = validate();
    expect(issues).toHaveLength(1);
    expect(issues[0].subtype).toBe('wrong_role');
    expect(text(issues[0].message())).toBe('Suburb Suburb has the wrong role within Admin Boundary');

    const fixes = issues[0].dynamicFixes();
    expect(fixes).toHaveLength(3);
    expect(text(fixes[0].title)).toBe('Change role to “Admin Centre”');
    expect(text(fixes[1].title)).toBe('Change role to “Label”');
    expect(text(fixes[2].title)).toBe('Remove from relation');
  });

  it('errors if a role is missing, and does not suggest roles if the maximum has been reached', () => {
    createRelation({ type: 'boundary' }, [
      { role: 'outer', type: 'w' },
      { role: 'admin_center', type: 'n', tags: { place: 'suburb' } },
      { role: 'label', type: 'n', tags: { place: 'suburb' } },
      { role: '', type: 'n', tags: { place: 'suburb' } },
    ]);

    const issues = validate();
    expect(issues).toHaveLength(1);
    expect(issues[0].subtype).toBe('wrong_role');
    expect(text(issues[0].message())).toBe('Suburb Suburb has the wrong role within Admin Boundary');

    const fixes = issues[0].dynamicFixes();
    expect(fixes).toHaveLength(1);
    // no suggestion to 'Change to “Admin Centre”' or 'Change to “Label”',
    // because then there would be too many with that role.
    expect(text(fixes[0].title)).toBe('Remove from relation');
  });

  it('errors if a member appears multiple times', () => {
    createRelation({ type: 'boundary', name: 'Exampletown CDP' }, [
      { role: 'outer', raw: line },
      { role: 'outer', raw: line },
    ]);

    const issues = validate();
    expect(issues).toHaveLength(1);
    expect(issues[0].subtype).toBe('duplicate_member');
    expect(text(issues[0].message())).toBe(
      'Line Line is included multiple times in Exampletown CDP'
    );

    const fixes = issues[0].dynamicFixes();
    expect(fixes).toHaveLength(1);
    expect(text(fixes[0].title)).toBe('Remove from relation');
  });

  it('errors if a role is invalid, and only suggests appropriate roles', () => {
    createRelation({ type: 'boundary', building: 'house' }, [
      { role: 'potatoe', raw: line },
      { role: 'outer', type: 'w' },
    ]);

    const issues = validate();
    expect(issues).toHaveLength(1);
    expect(issues[0].subtype).toBe('wrong_role');
    expect(text(issues[0].message())).toBe('Line Line has the wrong role within Admin Boundary'); // FIXME: this is pretty unhelpful...

    const fixes = issues[0].dynamicFixes();
    expect(fixes).toHaveLength(3);
    expect(text(fixes[0].title)).toBe('Change role to “Inner”');
    expect(text(fixes[1].title)).toBe('Change role to “Outer”');
    expect(text(fixes[2].title)).toBe('Remove from relation');
  });

  it('errors if the required tags are missing for that role', () => {
    createRelation({ type: 'boundary' }, [
      { role: 'admin_center', raw: n1 },
      { role: 'outer', raw: line },
    ]);

    const issues = validate();
    expect(issues).toHaveLength(1);
    expect(issues[0].subtype).toBe('invalid_tags');
    expect(text(issues[0].message())).toBe('Point Point needs different tags');

    const fixes = issues[0].dynamicFixes();
    expect(fixes).toHaveLength(2);
    expect(text(fixes[0].title)).toBe('Change to a Suburb');
    expect(text(fixes[1].title)).toBe('Remove from relation');
  });

  it('errors if the geometry of a member is invalid', () => {
    createRelation({ type: 'boundary' }, [
      { role: 'admin_center', type: 'w', tags: { place: 'suburb' } },
      { role: 'outer', raw: line },
    ]);

    const issues = validate();
    expect(issues).toHaveLength(1);
    expect(issues[0].subtype).toBe('invalid_geometry');
    expect(text(issues[0].message())).toBe('Line Line can’t have this geometry, since it belongs to Admin Boundary');

    const fixes = issues[0].dynamicFixes();
    expect(fixes).toHaveLength(2);
    expect(text(fixes[0].title)).toBe(
      'Change the geometry to a point or vertex'
    );
    expect(text(fixes[1].title)).toBe('Remove from relation');
  });

  it('errors if a role is missing, and has no suggestions', () => {
    createRelation({ type: 'boundary' }, [
      { role: '', type: 'n', tags: {} },
      { role: 'outer', raw: line },
    ]);

    const issues = validate();
    expect(issues).toHaveLength(1);
    expect(issues[0].subtype).toBe('role_not_allowed');
    expect(text(issues[0].message())).toBe(
      'Admin Boundary cannot have a member with the role “”'
    );

    const fixes = issues[0].dynamicFixes();
    expect(fixes).toHaveLength(1);
    expect(text(fixes[0].title)).toBe('Remove from relation');
  });

  it('follows relationCrossReference to find the schema', () => {
    createRelation({ type: 'boundary', boundary: 'disputed' }, []);

    const issues = validate();
    expect(issues).toHaveLength(1);
    expect(issues[0].subtype).toBe('too_few');
    expect(text(issues[0].message())).toBe(
      'Disputed Admin Boundary does not have enough members with the role “Outer”'
    );
  });
});

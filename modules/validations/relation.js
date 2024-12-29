import { actionChangeMember } from '../actions/change_member';
import { actionDeleteMember } from '../actions/delete_member';
import { localizer, t } from '../core/localizer';
import { utilDisplayLabel } from '../util/utilDisplayLabel';
import { validationIssue, validationIssueFix } from '../core/validation';
import { presetManager } from '../presets';
import { actionChangeTags } from '../actions';
import { utilArrayFindIndexMultiple } from '../util/array';

/** @param {string} role */
const formatRole = (role) => t('issues.relation.role', { role });

/** @param {Presets.Geometry} geometry */
const getGeometryLabel = (geometry) => t(`geometry.${geometry}`);

export function validationRelation() {
  const type = 'relation';

  /** @param {iD.OsmEntity} entity @param {iD.Graph} graph */
  const validation = (entity, graph) => {
    if (entity.type !== 'relation') return [];

    const geometry = entity.geometry(graph);
    const loc = entity.extent(graph).center();

    const relationSchema =
      presetManager.match(entity, graph)?.relation ||
      presetManager.matchTags({ type: entity.tags.type }, geometry, loc)
        ?.relation;

    // no schema, so there's nothing to validate
    if (!relationSchema) return [];

    return validateAgainstSchema(entity, relationSchema, graph, loc);
  };

  /** @type {(_: {
        member: iD.OsmRelation['members'][number],
        memberEntity: iD.OsmEntity;
        memberGeometry: Presets.Geometry;
    }) => Record<'role' | 'tags' | 'geometry',  (schema: Presets.RelationSchema['members'][number]) => boolean>
  } */
  const createCheckers = ({ member, memberEntity, memberGeometry }) => ({
    role: (schema) => member.role === schema.role,

    // if `matchTags` is not specified, then any tags are allowed
    tags: (schema) =>
      !schema.matchTags ||
      schema.matchTags.some((tags) => {
        return Object.entries(tags).every(([k, v]) =>
          v === '*' ? memberEntity.tags[k] : memberEntity.tags[k] === v
        );
      }),
    geometry: (schema) =>
      !schema.geometry || schema.geometry.includes(memberGeometry),
  });

  /**
   * @param {iD.OsmRelation} relation
   * @param {Presets.RelationSchema | undefined} relationSchema
   * @param {iD.Graph} graph
   * @param {import('../geo/vector').Vec2} loc
   */
  function validateAgainstSchema(relation, relationSchema, graph, loc) {
    if (!relationSchema) return;

    /** @type {validationIssue[]} */
    const issues = [];

    /** @param {string} role */
    const labelForRole = (role) => relationSchema?.role_labels?.[role] ?? role;

    const isFullyDownloaded = relation.members.every((member) =>
      graph.hasEntity(member.id)
    );

    /**
     * For roles with a maximum, this contains the roles
     * that can no longer be added, because the maximum
     * has been reached.
     * @type {Set<string>}
     */
    const rolesNotAllowed = new Set();

    if (isFullyDownloaded) {
      // check min/max
      for (const category of relationSchema.members) {
        const count = relation.members.filter((member) => {
          const memberEntity = graph.entity(member.id);
          const memberGeometry = memberEntity.geometry(graph);
          const checkers = createCheckers({
            member,
            memberEntity,
            memberGeometry,
          });
          return Object.values(checkers).every((checker) => checker(category));
        }).length;

        const messageData = {
          relation: utilDisplayLabel(relation, graph),
          relationPreset: presetManager.match(relation, graph)?.name() || '',
          role: formatRole(labelForRole(category.role)),
          min: category.min,
          max: category.max,
        };

        // too few
        if (category.min && count < category.min) {
          issues.push(
            makeIssue({
              issueId: 'too_few',
              relation,
              messageData,
              dynamicFixes: [
                new validationIssueFix({
                  title: t.append('issues.relation.messages.too_few.action', {
                    role: messageData.role,
                    n: category.min - count,
                  }),
                }),
              ],
            })
          );
        }

        // too many
        if (category.max && count > category.max) {
          issues.push(
            makeIssue({
              issueId: 'too_many',
              relation,
              messageData,
              dynamicFixes: [
                new validationIssueFix({
                  title: t.append('issues.relation.messages.too_many.action', {
                    role: messageData.role,
                    n: count - category.max,
                  }),
                }),
              ],
            })
          );
        }

        // too many or exactly at the maximum
        if (category.max && count >= category.max) {
          rolesNotAllowed.add(category.role);
        }
      }
    }

    /** @type {Set<string>} */
    const seen = new Set();
    for (const member of relation.members) {
      // skip members that have not downloaded
      if (!graph.hasEntity(member.id)) continue;

      const memberEntity = graph.entity(member.id);
      const memberGeometry = memberEntity.geometry(graph);

      const messageData = {
        relation: utilDisplayLabel(relation, graph),
        member: utilDisplayLabel(memberEntity, graph),
        relationPreset: presetManager.match(relation, graph)?.name() || '',
        memberPreset: presetManager.match(memberEntity, graph)?.name() || '',
        role: member.role,
      };
      const checkers = createCheckers({
        member,
        memberEntity,
        memberGeometry,
      });

      const matchingSchemaByRole = relationSchema.members.find(checkers.role);

      if (matchingSchemaByRole) {
        if (!checkers.tags(matchingSchemaByRole)) {
          // tags are invalid
          const expectedRolesForSameTags = new Set(
            relationSchema.members
              .filter(checkers.tags)
              .filter(checkers.geometry)
              .map((schema) => schema.role)
              .filter((role) => !rolesNotAllowed.has(role))
          );
          const expectedTagsForSameRole = (
            matchingSchemaByRole.matchTags || []
          ).map((tags) => ({
            presetName: presetManager.matchTags(tags, memberGeometry, loc).name(),
            tags,
          }));

          issues.push(
            makeIssue({
              issueId: expectedTagsForSameRole.length ? 'invalid_tags' : 'wrong_role',
              messageData: {
                ...messageData,
                expectedRoles: localizer.listFormat.or(
                  [...expectedRolesForSameTags].map((role) =>
                    formatRole(labelForRole(role))
                  )
                ),
              },
              relation,
              member,
              dynamicFixes: [
                // FIXME: test this with turn restriction to/from a non-highway
                ...expectedTagsForSameRole.map((preset) =>
                  makeChangeTagsFix(
                    memberEntity,
                    preset.presetName,
                    preset.tags
                  )
                ),
                ...[...expectedRolesForSameTags].map((role) =>
                  makeChangeRoleFix(
                    relation,
                    member,
                    role,
                    labelForRole(role)
                  )
                ),
                makeRemoveMemberFix(relation, member),
              ],
            })
          );
        }
        if (!checkers.geometry(matchingSchemaByRole)) {
          // geometry is invalid
          const expectedGeometry = localizer.listFormat.or(
            matchingSchemaByRole.geometry?.map(getGeometryLabel) || []
          );

          issues.push(
            makeIssue({
              issueId: 'invalid_geometry',
              messageData: {
                ...messageData,
                expectedGeometry,
              },
              relation,
              member,
              dynamicFixes: [
                new validationIssueFix({
                  title: t.append(
                    'issues.relation.messages.invalid_geometry.action',
                    { expectedGeometry }
                  ),
                  entityIds: [memberEntity.id],
                }),
                makeRemoveMemberFix(relation, member),
              ],
            })
          );
        }
      } else {
        const otherCandidates = relationSchema.members.filter(
          (x) => checkers.tags(x) && checkers.geometry(x)
        );
        if (otherCandidates.length) {
          // the role must be invalid
          const expectedRoles = otherCandidates
            .map((x) => x.role)
            .filter((role) => !rolesNotAllowed.has(role));

          issues.push(
            makeIssue({
              issueId: 'wrong_role',
              relation,
              member,
              messageData: {
                ...messageData,
                expectedRoles: localizer.listFormat.or(
                  expectedRoles.map((role) => formatRole(labelForRole(role)))
                ),
              },
              dynamicFixes: [
                ...expectedRoles.map((role) =>
                  makeChangeRoleFix(
                    relation,
                    member,
                    role,
                    labelForRole(role)
                  )
                ),
                makeRemoveMemberFix(relation, member),
              ],
            })
          );
        } else {
          // no other valid options
          issues.push(
            makeIssue({
              issueId: 'role_not_allowed',
              relation,
              member,
              messageData,
              dynamicFixes: [makeRemoveMemberFix(relation, member)],
            })
          );
        }
      }

      // check for duplicates
      if (
        seen.has(member.id) &&
        relationSchema.allowDuplicateMembers === false
      ) {
        issues.push(
          makeIssue({
            issueId: 'duplicate_member',
            relation,
            member,
            messageData,
            dynamicFixes: [makeRemoveMemberFix(relation, member)],
          })
        );
      }
      seen.add(member.id);
    }

    return issues;
  }

  /**
   * @param {{
   *  issueId: string;
   *  relation: iD.OsmRelation;
   *  member?: iD.OsmRelation['members'][number];
   *  messageData: Record<string, any>;
   *  dynamicFixes: validationIssueFix[];
   * }} _
   */
  function makeIssue({ issueId, relation, member, messageData, dynamicFixes }) {
    return new validationIssue({
      type: type,
      subtype: issueId,
      severity: 'suggestion',
      message: () =>
        t.append(`issues.relation.messages.${issueId}.message`, messageData),
      /** @param {d3.Selection} selection */
      reference: (selection) => {
        selection
          .selectAll('.issue-reference')
          .data([0])
          .enter()
          .append('div')
          .attr('class', 'issue-reference')
          .call(
            t.append(
              `issues.relation.messages.${issueId}.reference`,
              messageData
            )
          );
      },
      entityIds: member ? [member.id, relation.id] : [relation.id],
      hash: `${issueId}-${relation.id}-${member?.id}`,
      dynamicFixes: () => [...dynamicFixes],
    });
  }

  /**
   * @param {iD.OsmRelation} relation
   * @param {iD.OsmRelation['members'][number]} member
   */
  function makeRemoveMemberFix(relation, member) {
    return new validationIssueFix({
      icon: 'iD-operation-delete',
      title: t.append('issues.fix.remove_from_relation.title'),
      onClick: (context) => {
        // if the member exists multiple times, only the first occurance
        // will be removed.
        const memberIndex = relation.members.findIndex(
          (m) => m.id === member.id
        );
        context.perform(
          actionDeleteMember(relation.id, memberIndex),
          t('operations.delete_member.annotation', { n: 1 })
        );
      },
      entityIds: [member.id],
    });
  }

  /**
   * @param {iD.OsmRelation} relation
   * @param {iD.OsmRelation['members'][number]} member
   * @param {string} newRole
   * @param {string} newRoleLabel
   */
  function makeChangeRoleFix(relation, member, newRole, newRoleLabel) {
    return new validationIssueFix({
      title: t.append('issues.relation.messages.wrong_role.action', {
        role: formatRole(newRoleLabel),
      }),
      onClick: (context) => {
        /** @type {number[]} */
        const memberIndexes = utilArrayFindIndexMultiple(
          relation.members,
          (m) => m.id === member.id,
        );
        context.perform(
          ...memberIndexes.map(memberIndex =>
            actionChangeMember(
              relation.id,
              { ...member, role: newRole },
              memberIndex
            )
          ),
          t('operations.change_role.annotation', { n: 1 })
        );
      },
      entityIds: [member.id],
    });
  }

  /**
   * @param {iD.OsmEntity} entity
   * @param {string} presetName
   * @param {Tags} presetTags
   */
  function makeChangeTagsFix(entity, presetName, presetTags) {
    return new validationIssueFix({
      title: t.append('issues.relation.messages.invalid_tags.action', {
        presetName: presetName,
      }),
      onClick: (context) => {
        const graph = context.graph();
        const geometry = entity.geometry(graph);
        const loc = entity.extent(graph).center();

        const oldPreset = presetManager.match(entity, graph);

        let newTags = { ...entity.tags };

        // remove the current preset
        newTags = oldPreset.unsetTags(
          newTags,
          geometry,
          undefined,
          undefined,
          loc
        );

        // add the expected tags
        Object.assign(newTags, presetTags);

        context.perform(
          actionChangeTags(entity.id, newTags),
          t('operations.change_tags.annotation')
        );
      },
      entityIds: [entity.id],
    });
  }

  validation.type = type;

  return validation;
}

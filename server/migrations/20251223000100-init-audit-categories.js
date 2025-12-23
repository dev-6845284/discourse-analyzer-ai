/**
 * Migration: Initialize canonical dynamic audit/flaws categories
 *
 * This migration inserts a canonical set of category definitions into a
 * dedicated `auditCategories` collection to serve as the single source of
 * truth for prompt generation and UI rendering.
 *
 * Each category document has a stable `id` (machine name), human `title`,
 * `description`, `promptGuidance`, `modes` (which prompt flavors use it),
 * `severityDefault`, optional `legacyNames` for migration compatibility, and ordering.
 */

const now = new Date();

const CATEGORIES = [
  {
    id: 'verifiableFalsehood',
    title: 'Verifiable Falsehood',
    description: 'Statement contradicts documented facts or is demonstrably untrue.',
    promptGuidance: 'Use when the statement contradicts documented facts or is demonstrably untrue based on public record.',
    modes: ['audit'],
    severityDefault: 'NONE',
    legacyNames: ['Lies & False Claims'],
    uiOrder: 10,
  },
  {
    id: 'misleadingFraming',
    title: 'Misleading Framing',
    description: 'Facts are selectively presented or framed to mislead the audience.',
    promptGuidance: 'Use when facts are selectively presented, negative reality is reframed as success, or criticism is reinterpreted as misunderstanding.',
    modes: ['audit'],
    severityDefault: 'NONE',
    legacyNames: ['Fact Twisting'],
    uiOrder: 20,
  },
  {
    id: 'realityInversion',
    title: 'Reality Inversion',
    description: 'Failure is reframed as success or backlash is portrayed as approval.',
    promptGuidance: 'Use when public backlash is portrayed as approval, failure is reframed as achievement, or reputational damage is reframed as impact.',
    modes: ['audit'],
    severityDefault: 'NONE',
    uiOrder: 30,
  },
  {
    id: 'responsibilityShifting',
    title: 'Responsibility Shifting',
    description: 'Blame is moved to external actors or groups instead of accepting accountability.',
    promptGuidance: 'Use when the statement shifts blame to "politics", "media", or "opponents", or portrays affected groups as manipulated or irrational.',
    modes: ['audit'],
    severityDefault: 'NONE',
    uiOrder: 40,
  },
  {
    id: 'unsupportedAssertion',
    title: 'Unsupported Assertion',
    description: 'Claims presented without evidence, data, or verifiable metrics.',
    promptGuidance: 'Use when no evidence, data, or metric is provided and claims rely solely on personal belief or anecdote.',
    modes: ['audit'],
    severityDefault: 'NONE',
    uiOrder: 50,
  },
  {
    id: 'narrativeControl',
    title: 'Narrative Control / Propaganda',
    description: 'Language attempts to normalize controversy or delegitimize critics.',
    promptGuidance: 'Use when language attempts to normalize controversy, delegitimize critics, or redefine criticism as hostile propaganda.',
    modes: ['audit'],
    severityDefault: 'NONE',
    legacyNames: ['Populism', 'Inflammatory Language'],
    uiOrder: 60,
  },
  {
    id: 'dehumanization',
    title: 'Dehumanization',
    description: 'Targets are described as subhuman, dead, or otherwise stripped of dignity.',
    promptGuidance: 'Use when people are described as dead, subhuman, vermin, objects, or stripped of agency/dignity.',
    modes: ['flaws'],
    severityDefault: 'NONE',
    uiOrder: 110,
  },
  {
    id: 'symbolicViolence',
    title: 'Symbolic Violence / Death-Wishing',
    description: 'Language fantasizes about or normalizes death, removal, or ritual elimination.',
    promptGuidance: 'Use when the statement fantasizes about death, removal, disposal, or uses historical/cultural metaphors to simulate execution or burial.',
    modes: ['flaws'],
    severityDefault: 'NONE',
    uiOrder: 120,
  },
  {
    id: 'hateSpeechAdjacent',
    title: 'Hate-Speech Adjacent Rhetoric',
    description: 'Language targets individuals or groups as inherently corrupt, evil, or unworthy.',
    promptGuidance: 'Use when the language targets groups with humiliation, ridicule, or contempt and invites audience participation in scorn or hatred.',
    modes: ['flaws'],
    severityDefault: 'NONE',
    uiOrder: 130,
  },
  {
    id: 'authoritarianMobLogic',
    title: 'Authoritarian / Mob Logic',
    description: 'Argument replaced by expulsion, silencing, or elimination of opponents.',
    promptGuidance: 'Use when the statement replaces argument with expulsion or implies removal/silencing is preferable to discourse.',
    modes: ['flaws'],
    severityDefault: 'NONE',
    uiOrder: 140,
  },
  {
    id: 'democraticNormViolation',
    title: 'Democratic Norm Violation',
    description: 'Rhetoric that undermines pluralism, legitimacy of opponents, or democratic norms.',
    promptGuidance: 'Use when the statement treats disagreement as moral rot, undermines pluralism, or erodes norms of political coexistence.',
    modes: ['flaws'],
    severityDefault: 'NONE',
    uiOrder: 150,
  },
  {
    id: 'psychologicalProfile',
    title: 'Psychological & Rhetorical Profile',
    description: 'Diagnostic-style reading of the speaker’s rhetorical behaviors and impulses.',
    promptGuidance: 'Diagnose what the language reveals about impulse control, hostility level, contempt for democratic process, or reliance on provocation over reasoning.',
    modes: ['flaws'],
    severityDefault: 'NONE',
    uiOrder: 160,
  }
];

module.exports = {
  async up(db, client) {
    const collectionName = `auditCategories${process.env.DB_COLLECTION_SUFFIX || ''}`;
    const collection = db.collection(collectionName);

    // Upsert each category by id for idempotency
    for (const cat of CATEGORIES) {
      const doc = {
        ...cat,
        createdAt: now,
        updatedAt: now,
      };
      await collection.updateOne(
        { id: cat.id },
        { $setOnInsert: doc },
        { upsert: true }
      );
    }

    console.log(`Initialized ${CATEGORIES.length} audit/flaws categories in collection ${collectionName}.`);
  },

  async down(db, client) {
    const collectionName = `auditCategories${process.env.DB_COLLECTION_SUFFIX || ''}`;
    const collection = db.collection(collectionName);

    const ids = CATEGORIES.map(c => c.id);
    await collection.deleteMany({ id: { $in: ids } });

    console.log(`Removed ${ids.length} audit/flaws categories from collection ${collectionName}.`);
  }
};
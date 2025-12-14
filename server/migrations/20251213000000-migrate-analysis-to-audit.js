/**
 * Migration: Convert legacy analysis structure to new audit structure
 * 
 * This migration transforms the old 4-category analysis format to the new
 * 6-category audit format with verdict and rationale.
 * 
 * Old structure (metadata.analysis):
 * {
 *   "Populism": { "rating": "None", "justification": "..." },
 *   "Fact Twisting": { "rating": "Low", "justification": "..." },
 *   "Lies & False Claims": { "rating": "Medium", "justification": "..." },
 *   "Inflammatory Language": { "rating": "High", "justification": "..." }
 * }
 * 
 * New structure (metadata.audit):
 * {
 *   "verdict": "MISLEADING",
 *   "rationale": "...",
 *   "categories": {
 *     "Verifiable Falsehood": { "severity": "NONE", "evidence": "..." },
 *     "Misleading Framing": { "severity": "LOW", "evidence": "..." },
 *     "Reality Inversion": { "severity": "NONE", "evidence": "..." },
 *     "Responsibility Shifting": { "severity": "NONE", "evidence": "..." },
 *     "Unsupported Assertion": { "severity": "MEDIUM", "evidence": "..." },
 *     "Narrative Control / Propaganda": { "severity": "HIGH", "evidence": "..." }
 *   }
 * }
 */

// Mapping from old ratings to new severity levels
const RATING_TO_SEVERITY = {
  'None': 'NONE',
  'Low': 'LOW',
  'Medium': 'MEDIUM',
  'High': 'HIGH',
  'Severe': 'SEVERE'
};

// Map old categories to new categories (best effort)
const CATEGORY_MAPPING = {
  'Populism': 'Narrative Control / Propaganda',
  'Fact Twisting': 'Misleading Framing',
  'Lies & False Claims': 'Verifiable Falsehood',
  'Inflammatory Language': 'Narrative Control / Propaganda'
};

// Derive a verdict from old ratings
function deriveVerdict(analysis) {
  const ratings = Object.values(analysis).map(d => d.rating);
  const hasHigh = ratings.includes('High') || ratings.includes('Severe');
  const hasMedium = ratings.includes('Medium');
  const hasLow = ratings.includes('Low');
  
  // Check for lies specifically
  const liesRating = analysis['Lies & False Claims']?.rating;
  if (liesRating === 'Severe' || liesRating === 'High') {
    return 'FALSE';
  }
  if (liesRating === 'Medium') {
    return 'MISLEADING';
  }
  
  // Check for fact twisting
  const factTwistingRating = analysis['Fact Twisting']?.rating;
  if (factTwistingRating === 'Severe' || factTwistingRating === 'High') {
    return 'MANIPULATIVE';
  }
  if (factTwistingRating === 'Medium') {
    return 'MISLEADING';
  }
  
  // General assessment
  if (hasHigh) {
    return 'MANIPULATIVE';
  }
  if (hasMedium) {
    return 'MISLEADING';
  }
  if (hasLow) {
    return 'UNFOUNDED';
  }
  
  return 'TRUE';
}

function migrateAnalysisToAudit(analysis) {
  if (!analysis || typeof analysis !== 'object') {
    return null;
  }

  // Initialize new categories with NONE
  const categories = {
    'Verifiable Falsehood': { severity: 'NONE', evidence: '' },
    'Misleading Framing': { severity: 'NONE', evidence: '' },
    'Reality Inversion': { severity: 'NONE', evidence: '' },
    'Responsibility Shifting': { severity: 'NONE', evidence: '' },
    'Unsupported Assertion': { severity: 'NONE', evidence: '' },
    'Narrative Control / Propaganda': { severity: 'NONE', evidence: '' }
  };

  const justifications = [];

  // Map old categories to new
  for (const [oldCat, detail] of Object.entries(analysis)) {
    if (!detail || !detail.rating) continue;
    
    const newCat = CATEGORY_MAPPING[oldCat];
    if (!newCat) continue;

    const newSeverity = RATING_TO_SEVERITY[detail.rating] || 'NONE';
    const currentSeverity = categories[newCat].severity;
    
    // Keep the higher severity if multiple old categories map to the same new one
    const severityOrder = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'SEVERE'];
    if (severityOrder.indexOf(newSeverity) > severityOrder.indexOf(currentSeverity)) {
      categories[newCat].severity = newSeverity;
    }
    
    // Concatenate evidence if multiple old categories map to the same new one
    if (detail.justification) {
      if (categories[newCat].evidence) {
        categories[newCat].evidence += ' | ' + detail.justification;
      } else {
        categories[newCat].evidence = detail.justification;
      }
      justifications.push(detail.justification);
    }
  }

  // Derive verdict and rationale
  const verdict = deriveVerdict(analysis);
  const rationale = justifications.length > 0 
    ? `[Migrated from legacy analysis] ${justifications.join(' ')}`.slice(0, 500)
    : '[Migrated from legacy analysis] No detailed rationale available.';

  return {
    verdict,
    rationale,
    categories
  };
}

module.exports = {
  async up(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const collection = db.collection(`quotes${suffix}`);
    
    // Find all quotes with legacy analysis but no audit
    const cursor = collection.find({
      'metadata.analysis': { $exists: true },
      'metadata.audit': { $exists: false }
    });

    let migrated = 0;
    let failed = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      
      try {
        const legacyAnalysis = doc.metadata?.analysis;
        if (!legacyAnalysis) continue;

        const audit = migrateAnalysisToAudit(legacyAnalysis);
        if (!audit) continue;

        await collection.updateOne(
          { _id: doc._id },
          { 
            $set: { 
              'metadata.audit': audit,
              'metadata.legacyAnalysis': legacyAnalysis // Keep backup
            }
          }
        );
        migrated++;
      } catch (e) {
        console.error(`Failed to migrate quote ${doc._id}:`, e.message);
        failed++;
      }
    }

    console.log(`Migration complete: ${migrated} quotes migrated, ${failed} failed`);
  },

  async down(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const collection = db.collection(`quotes${suffix}`);

    // Remove audit and restore original analysis (if backup exists)
    await collection.updateMany(
      { 'metadata.legacyAnalysis': { $exists: true } },
      [
        {
          $set: {
            'metadata.analysis': '$metadata.legacyAnalysis'
          }
        },
        {
          $unset: ['metadata.audit', 'metadata.legacyAnalysis']
        }
      ]
    );

    // For quotes without backup, just remove audit
    await collection.updateMany(
      { 'metadata.audit': { $exists: true } },
      { $unset: { 'metadata.audit': '' } }
    );
  }
};

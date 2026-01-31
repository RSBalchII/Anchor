/**
 * Semantic Taxonomy System for ECE (Semantic Shift Refactor)
 * 
 * Defines the constrained high-level semantic categories that replace
 * the previous granular entity tags. This enables narrative discovery
 * by focusing on meaning rather than keywords.
 */

export enum SemanticCategory {
  RELATIONSHIP = '#Relationship', // People interacting, personal connections
  NARRATIVE = '#Narrative',       // Stories, timelines, memories, sequences
  TECHNICAL = '#Technical',       // Code, architecture, system docs
  INDUSTRY = '#Industry',         // External market data (Oil, CO2, etc.)
  LOCATION = '#Location',         // Geographic or spatial references
  EMOTIONAL = '#Emotional',       // High sentiment variance content
  TEMPORAL = '#Temporal',         // Time-based sequences and chronology
  CAUSAL = '#Causal',             // Cause-effect relationships
  PROFESSIONAL = '#Professional', // Work-related connections
  PERSONAL = '#Personal',         // Private/personal content
  KNOWLEDGE = '#Knowledge',       // Information and learning content
}

/**
 * Semantic Molecule Interface
 * Represents a coherent text chunk with semantic meaning
 */
export interface SemanticMolecule {
  id: string;
  content: string;
  source: string;
  timestamp: number;
  semanticTags: SemanticCategory[]; // High-level semantic categories only
  containedEntities: string[];      // The atomic entities within this molecule
  provenance: string;
  score?: number;
  [key: string]: any;
}

/**
 * Semantic Rule Interface
 * Defines rules for semantic tag derivation
 */
export interface SemanticRule {
  category: SemanticCategory;
  triggers: string[];        // Keywords/phrases that trigger this category
  requiredEntities?: string[]; // Required entity types for this category
  exclusions?: string[];     // Keywords that prevent this category
  weight: number;           // Importance weighting (0-1)
}

/**
 * Semantic Atom Interface
 * Represents individual entities within semantic molecules
 */
export interface SemanticAtom {
  id: string;
  entityValue: string;      // The actual entity value (e.g., "Rob", "Jade", "Albuquerque")
  entityType: 'person' | 'place' | 'concept' | 'date' | 'technical' | 'other';
  confidence: number;
  sourceMoleculeId: string;
  [key: string]: any;
}

/**
 * Semantic Category Configuration
 * Defines the rules for each semantic category
 */
export interface SemanticRule {
  category: SemanticCategory;
  triggers: string[];        // Keywords/phrases that trigger this category
  exclusions?: string[];     // Keywords that prevent this category
  requiredEntities?: string[]; // Required entity types for this category
  weight: number;           // Importance weighting (0-1)
}

export const SEMANTIC_RULES: SemanticRule[] = [
  {
    category: SemanticCategory.RELATIONSHIP,
    triggers: [
      'and', 'with', 'met', 'told', 'said to', 'spoke to', 'visited', 
      'called', 'texted', 'together', 'relationship', 'friend', 'partner',
      'love', 'missed', 'cared about', 'knows', 'introduced to'
    ],
    requiredEntities: ['person'],
    weight: 0.9
  },
  {
    category: SemanticCategory.NARRATIVE,
    triggers: [
      'when', 'then', 'later', 'before', 'after', 'during', 'while',
      'first', 'next', 'finally', 'meanwhile', 'eventually', 'suddenly',
      'it was', 'there was', 'once upon', 'story', 'remember', 'recall'
    ],
    requiredEntities: ['person', 'date'],
    weight: 0.8
  },
  {
    category: SemanticCategory.TECHNICAL,
    triggers: [
      'function', 'class', 'method', 'variable', 'code', 'algorithm',
      'API', 'endpoint', 'database', 'server', 'client', 'library',
      'framework', 'module', 'component', 'system', 'architecture'
    ],
    requiredEntities: ['technical'],
    weight: 0.95
  },
  {
    category: SemanticCategory.INDUSTRY,
    triggers: [
      'market', 'industry', 'company', 'business', 'finance', 'economy',
      'oil', 'gas', 'energy', 'seismic', 'co2', 'sequestration',
      'production', 'drilling', 'reservoir', 'pipeline', 'refinery'
    ],
    requiredEntities: ['concept'],
    weight: 0.85
  },
  {
    category: SemanticCategory.LOCATION,
    triggers: [
      'in', 'at', 'near', 'by', 'around', 'beside', 'between', 'within',
      'city', 'town', 'country', 'state', 'street', 'building', 'room',
      'address', 'coordinates', 'region', 'area', 'district', 'zone'
    ],
    requiredEntities: ['place'],
    weight: 0.7
  },
  {
    category: SemanticCategory.EMOTIONAL,
    triggers: [
      'happy', 'sad', 'angry', 'excited', 'frustrated', 'anxious', 'joy',
      'fear', 'love', 'hate', 'regret', 'hope', 'despair', 'grateful',
      'felt', 'emotions', 'feelings', 'heart', 'soul', 'spirit'
    ],
    weight: 0.8
  },
  {
    category: SemanticCategory.TEMPORAL,
    triggers: [
      'yesterday', 'today', 'tomorrow', 'morning', 'afternoon', 'evening',
      'night', 'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
      '2025', '2026', '2027', 'year', 'month', 'day', 'week', 'hour', 'minute'
    ],
    requiredEntities: ['date'],
    weight: 0.75
  },
  {
    category: SemanticCategory.CAUSAL,
    triggers: [
      'because', 'since', 'therefore', 'thus', 'consequently', 'accordingly',
      'due to', 'caused by', 'leads to', 'results in', 'affects', 'influences',
      'reason', 'cause', 'effect', 'outcome', 'impact', 'consequence'
    ],
    weight: 0.85
  },
  {
    category: SemanticCategory.PROFESSIONAL,
    triggers: [
      'work', 'job', 'office', 'meeting', 'colleague', 'boss', 'employee',
      'project', 'task', 'deadline', 'company', 'team', 'department',
      'career', 'profession', 'employment', 'colleagues', 'supervisor'
    ],
    requiredEntities: ['person'],
    weight: 0.75
  },
  {
    category: SemanticCategory.PERSONAL,
    triggers: [
      'private', 'personal', 'myself', 'family', 'home', 'private',
      'intimate', 'confidential', 'secret', 'diary', 'journal', 'notes',
      'thoughts', 'feelings', 'private thoughts', 'personal notes'
    ],
    weight: 0.7
  },
  {
    category: SemanticCategory.KNOWLEDGE,
    triggers: [
      'learn', 'study', 'knowledge', 'understand', 'comprehend', 'grasp',
      'teach', 'explain', 'educate', 'inform', 'aware', 'conscious',
      'wisdom', 'insight', 'understanding', 'intelligence', 'cognition'
    ],
    weight: 0.7
  }
];

/**
 * Helper function to check if a category is a high-level semantic category
 */
export function isValidSemanticCategory(tag: string): boolean {
  return Object.values(SemanticCategory).includes(tag as SemanticCategory);
}

/**
 * Helper function to get semantic rules for a specific category
 */
export function getSemanticRulesForCategory(category: SemanticCategory): SemanticRule | undefined {
  return SEMANTIC_RULES.find(rule => rule.category === category);
}
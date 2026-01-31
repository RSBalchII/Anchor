
// Replace enum with const object for compatibility with erasableSyntaxOnly
export const SemanticCategory = {
    RELATIONSHIP: 'Relationship',
    NARRATIVE: 'Narrative',
    TECHNICAL: 'Technical',
    INDUSTRY: 'Industry',
    LOCATION: 'Location',
    EMOTIONAL: 'Emotional',
    TEMPORAL: 'Temporal',
    CAUSAL: 'Causal',
    UNCATEGORIZED: 'Uncategorized'
} as const;

export type SemanticCategory = typeof SemanticCategory[keyof typeof SemanticCategory];

export interface SemanticRule {
    category: SemanticCategory;
    weight: number; // 0.1 - 1.0
    triggers: string[]; // Keywords that trigger this category
    exclusions: string[]; // Keywords that exclude this category
    requiredEntities: string[]; // e.g., 'person', 'date'
}

export interface DiscoveredEntity {
    name: string;
    frequency: number;
    suggestedCategory: SemanticCategory;
}

export interface TaxonomyPreset {
    id: string;
    name: string;
    timestamp: number;
    rules: SemanticRule[];
}

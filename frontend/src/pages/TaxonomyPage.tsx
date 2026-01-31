
import React, { useState, useEffect } from 'react';
import { RuleCard } from '../components/taxonomy/RuleCard';
import { DiscoveryPanel } from '../components/taxonomy/DiscoveryPanel';
import { PresetManager } from '../components/taxonomy/PresetManager';
import type { SemanticRule, DiscoveredEntity, TaxonomyPreset } from '../types/taxonomy';
import { SemanticCategory } from '../types/taxonomy';
import { RefreshCw, Sliders } from 'lucide-react';

export const TaxonomyPage: React.FC = () => {
    const [rules, setRules] = useState<SemanticRule[]>([]);
    const [suggestions, setSuggestions] = useState<DiscoveredEntity[]>([]);
    const [presets, setPresets] = useState<TaxonomyPreset[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Mock initial data load
    useEffect(() => {
        // In real app: fetch from /v1/taxonomy/*
        setTimeout(() => {
            setRules([
                { category: SemanticCategory.RELATIONSHIP, weight: 0.9, triggers: ['friend', 'partner', 'met'], exclusions: ['code', 'api'], requiredEntities: ['person'] },
                { category: SemanticCategory.TECHNICAL, weight: 0.5, triggers: ['function', 'api', 'database'], exclusions: ['love', 'dinner'], requiredEntities: [] },
                { category: SemanticCategory.NARRATIVE, weight: 0.7, triggers: ['then', 'suddenly'], exclusions: [], requiredEntities: ['date'] },
                { category: SemanticCategory.INDUSTRY, weight: 0.6, triggers: ['oil', 'gas', 'co2'], exclusions: [], requiredEntities: [] },
            ]);
            setSuggestions([
                { name: 'Jade', frequency: 124, suggestedCategory: SemanticCategory.RELATIONSHIP },
                { name: 'Dr. Smith', frequency: 45, suggestedCategory: SemanticCategory.RELATIONSHIP },
                { name: 'Kubernetes', frequency: 89, suggestedCategory: SemanticCategory.TECHNICAL },
                { name: 'Permian Basin', frequency: 32, suggestedCategory: SemanticCategory.INDUSTRY },
            ]);
            setPresets([
                { id: '1', name: 'Default Profile', timestamp: Date.now(), rules: [] },
                { id: '2', name: 'Work Mode (Tech)', timestamp: Date.now() - 86400000, rules: [] }
            ]);
            setIsLoading(false);
        }, 800);
    }, []);

    const updateRule = (updatedRule: SemanticRule) => {
        setRules(rules.map(r => r.category === updatedRule.category ? updatedRule : r));
    };

    const addSuggestionToRule = (entity: DiscoveredEntity, category: SemanticCategory) => {
        const rule = rules.find(r => r.category === category);
        if (rule && !rule.triggers.includes(entity.name.toLowerCase())) {
            updateRule({
                ...rule,
                triggers: [...rule.triggers, entity.name.toLowerCase()]
            });
            // Ideally remove from suggestions after adding
            setSuggestions(suggestions.filter(s => s.name !== entity.name));
        }
    };

    const savePreset = (name: string) => {
        const newPreset: TaxonomyPreset = {
            id: Date.now().toString(),
            name,
            timestamp: Date.now(),
            rules: [...rules]
        };
        setPresets([newPreset, ...presets]);
        console.log(`[Taxonomy] Saved preset: ${name}`);
    };

    const loadPreset = (id: string) => {
        console.log(`[Taxonomy] Loading preset: ${id}`);
        // In real app: fetch preset details
    };

    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
            {/* MAIN CONTENT (Left 70%) */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* HEADER */}
                <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-900/20 rounded-lg text-purple-400">
                            <Sliders size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight">Taxonomy Control</h1>
                            <p className="text-xs text-slate-500">Semantic Rule Engine</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <PresetManager presets={presets} onSave={savePreset} onLoad={loadPreset} />
                        <button className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200 transition-colors" title="Refresh Graph">
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </header>

                {/* SCROLLABLE RULES AREA */}
                <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-800">
                    <div className="max-w-4xl mx-auto">
                        {isLoading ? (
                            <div className="text-center py-20 text-slate-500 animate-pulse">Loading Rules...</div>
                        ) : (
                            <div className="grid gap-6">
                                {rules.map(rule => (
                                    <RuleCard key={rule.category} rule={rule} onUpdate={updateRule} />
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* DISCOVERY PANEL (Right 30%) */}
            <aside className="w-80 border-l border-slate-800 bg-slate-900/30">
                <DiscoveryPanel suggestions={suggestions} onAdd={addSuggestionToRule} isLoading={isLoading} />
            </aside>
        </div>
    );
};

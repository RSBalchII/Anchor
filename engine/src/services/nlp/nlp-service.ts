/**
 * NLP Service for ECE Semantic Architecture
 * 
 * Provides NLP capabilities for entity extraction and semantic analysis
 */

import wink from 'wink-nlp';
import model from 'wink-eng-lite-web-model';

const nlp = wink(model);

export class NlpService {
  /**
   * Extract entities from text using Wink NLP
   */
  public extractEntities(text: string): string[] {
    const doc = nlp.readDoc(text);
    const entities = doc.entities();
    
    // Extract named entities
    const entityValues: string[] = [];
    entities.each((entity: any) => {
      entityValues.push(entity.out());
    });
    
    return entityValues;
  }

  /**
   * Identify if an entity is a person
   */
  public isPersonEntity(entity: string): boolean {
    // Basic heuristic for person names
    const personIndicators = ['mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'jr.', 'sr.'];
    const lowerEntity = entity.toLowerCase();
    
    // Check if it's a capitalized name pattern
    if (/^[A-Z][a-z]+/.test(entity) && !this.isCommonWord(entity)) {
      return true;
    }
    
    // Check for person indicators
    return personIndicators.some(indicator => lowerEntity.includes(indicator));
  }

  /**
   * Identify if an entity is a place
   */
  public isPlaceEntity(entity: string): boolean {
    const placeIndicators = [
      'city', 'town', 'state', 'country', 'street', 'avenue', 'road', 'building', 
      'avenue', 'boulevard', 'lane', 'drive', 'court', 'place', 'plaza', 'square',
      'mountain', 'river', 'lake', 'ocean', 'sea', 'valley', 'canyon', 'park',
      'hotel', 'restaurant', 'store', 'mall', 'airport', 'station', 'port'
    ];
    return placeIndicators.some(indicator => 
      entity.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Identify if an entity is a technical term
   */
  public isTechnicalEntity(entity: string): boolean {
    const techTerms = [
      'node.js', 'typescript', 'javascript', 'api', 'database', 'function', 'class', 
      'method', 'variable', 'algorithm', 'cozodb', 'electron', 'react', 'vite',
      'graphql', 'rest', 'json', 'xml', 'html', 'css', 'sql', 'nosql', 'mongodb',
      'postgresql', 'mysql', 'redis', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
      'glm', 'llama', 'model', 'tensor', 'vector', 'embedding', 'rag', 'ai', 'ml', 'dl'
    ];
    return techTerms.includes(entity.toLowerCase());
  }

  /**
   * Identify if an entity is a date
   */
  public isDateEntity(entity: string): boolean {
    // Check for date patterns
    const dateRegex = /^(19|20)\d{2}$|^(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])|^(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])/;
    if (dateRegex.test(entity)) return true;
    
    // Check if it's a month name
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                   'july', 'august', 'september', 'october', 'november', 'december'];
    return months.includes(entity.toLowerCase());
  }

  /**
   * Classify entity type
   */
  public classifyEntity(entity: string): 'person' | 'place' | 'technical' | 'date' | 'concept' {
    if (this.isPersonEntity(entity)) return 'person';
    if (this.isPlaceEntity(entity)) return 'place';
    if (this.isTechnicalEntity(entity)) return 'technical';
    if (this.isDateEntity(entity)) return 'date';
    return 'concept';
  }

  /**
   * Check if a word is common (non-entity)
   */
  private isCommonWord(word: string): boolean {
    const commonWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'shall', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ];
    return commonWords.includes(word.toLowerCase());
  }

  /**
   * Check if text contains relationship indicators
   */
  public hasRelationshipIndicators(text: string): boolean {
    const relationshipIndicators = [
      'and', 'with', 'met', 'told', 'said', 'spoke', 'visited', 
      'called', 'texted', 'together', 'relationship', 'friend', 'partner',
      'love', 'missed', 'cared', 'knows', 'introduced', 'about', 'to'
    ];
    const lowerText = text.toLowerCase();
    return relationshipIndicators.some(indicator => 
      lowerText.includes(` ${indicator} `) || 
      lowerText.startsWith(`${indicator} `) || 
      lowerText.endsWith(` ${indicator}`) ||
      lowerText.includes(`${indicator},`) ||
      lowerText.includes(`${indicator}.`)
    );
  }
}
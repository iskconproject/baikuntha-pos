import { getDb } from "@/lib/db/connection";
import type { SearchLanguage, LanguageMapping, TransliterationResult } from "@/types/search";

export class TranslationService {
  private db = getDb();
  
  // Common Hindi transliterations
  private hindiTransliterations: Record<string, string[]> = {
    'book': ['किताब', 'पुस्तक', 'ग्रंथ'],
    'books': ['किताबें', 'पुस्तकें', 'ग्रंथ'],
    'gita': ['गीता'],
    'bhagavad': ['भगवद्', 'भगवत्'],
    'krishna': ['कृष्ण', 'कृष्णा'],
    'rama': ['राम', 'रामा'],
    'hanuman': ['हनुमान'],
    'mala': ['माला'],
    'tulsi': ['तुलसी'],
    'incense': ['धूप', 'अगरबत्ती'],
    'deity': ['देवता', 'भगवान्', 'देव'],
    'prayer': ['प्रार्थना', 'पूजा'],
    'spiritual': ['आध्यात्मिक', 'धार्मिक'],
    'temple': ['मंदिर', 'देवालय'],
    'god': ['भगवान्', 'ईश्वर', 'देव'],
    'lord': ['भगवान्', 'प्रभु'],
    'sacred': ['पवित्र', 'पावन'],
    'holy': ['पवित्र', 'पावन'],
    'divine': ['दिव्य', 'देवी'],
    'mantra': ['मंत्र'],
    'chant': ['जप', 'कीर्तन'],
    'meditation': ['ध्यान', 'समाधि'],
    'yoga': ['योग'],
    'peace': ['शांति', 'शान्ति'],
    'love': ['प्रेम', 'प्रीति'],
    'devotion': ['भक्ति'],
    'wisdom': ['ज्ञान', 'विद्या'],
    'truth': ['सत्य', 'सच'],
    'light': ['प्रकाश', 'ज्योति'],
    'soul': ['आत्मा', 'जीव'],
    'heart': ['हृदय', 'दिल'],
    'mind': ['मन', 'चित्त'],
    'consciousness': ['चेतना', 'चैतन्य'],
    'bliss': ['आनंद', 'सुख'],
    'eternal': ['शाश्वत', 'अनंत'],
    'infinite': ['अनंत', 'असीम'],
    'pure': ['शुद्ध', 'पवित्र'],
    'blessed': ['धन्य', 'आशीर्वादित'],
  };

  // Common Bengali transliterations
  private bengaliTransliterations: Record<string, string[]> = {
    'book': ['বই', 'পুস্তক', 'গ্রন্থ'],
    'books': ['বইগুলি', 'পুস্তকসমূহ'],
    'gita': ['গীতা'],
    'bhagavad': ['ভগবদ্'],
    'krishna': ['কৃষ্ণ'],
    'rama': ['রাম'],
    'hanuman': ['হনুমান'],
    'mala': ['মালা'],
    'tulsi': ['তুলসী'],
    'incense': ['ধূপ', 'অগরবাতি'],
    'deity': ['দেবতা', 'ভগবান'],
    'prayer': ['প্রার্থনা', 'পূজা'],
    'spiritual': ['আধ্যাত্মিক', 'ধর্মীয়'],
    'temple': ['মন্দির', 'দেবালয়'],
    'god': ['ভগবান', 'ঈশ্বর'],
    'lord': ['ভগবান', 'প্রভু'],
    'sacred': ['পবিত্র', 'পাবন'],
    'holy': ['পবিত্র', 'পাবন'],
    'divine': ['দিব্য', 'দেবী'],
    'mantra': ['মন্ত্র'],
    'chant': ['জপ', 'কীর্তন'],
    'meditation': ['ধ্যান', 'সমাধি'],
    'yoga': ['যোগ'],
    'peace': ['শান্তি'],
    'love': ['প্রেম', 'ভালোবাসা'],
    'devotion': ['ভক্তি'],
    'wisdom': ['জ্ঞান', 'বিদ্যা'],
    'truth': ['সত্য'],
    'light': ['আলো', 'জ্যোতি'],
    'soul': ['আত্মা', 'জীব'],
    'heart': ['হৃদয়', 'মন'],
    'mind': ['মন', 'চিত্ত'],
    'consciousness': ['চেতনা'],
    'bliss': ['আনন্দ', 'সুখ'],
    'eternal': ['শাশ্বত', 'অনন্ত'],
    'infinite': ['অনন্ত', 'অসীম'],
    'pure': ['শুদ্ধ', 'পবিত্র'],
    'blessed': ['ধন্য', 'আশীর্বাদিত'],
  };

  /**
   * Get language mappings from database
   */
  async getLanguageMappings(): Promise<LanguageMapping[]> {
    // TODO: Implement language mappings table and query
    // For now, return empty array
    return [];
  }

  /**
   * Add or update language mapping
   */
  async addLanguageMapping(
    englishTerm: string,
    hindiTerm?: string,
    bengaliTerm?: string,
    type: string = 'keyword'
  ): Promise<void> {
    // TODO: Implement language mappings table and insert logic
    console.log(`Would add mapping: ${englishTerm} -> ${hindiTerm} / ${bengaliTerm} (${type})`);
  }

  /**
   * Transliterate query to target language
   */
  async transliterateQuery(query: string, targetLanguage: SearchLanguage): Promise<TransliterationResult> {
    const original = query.toLowerCase().trim();
    const transliterated: string[] = [];

    if (targetLanguage === 'hi') {
      // Hindi transliteration
      const words = original.split(/\s+/);
      for (const word of words) {
        const hindiVariants = this.hindiTransliterations[word] || [];
        transliterated.push(...hindiVariants);
      }
    } else if (targetLanguage === 'bn') {
      // Bengali transliteration
      const words = original.split(/\s+/);
      for (const word of words) {
        const bengaliVariants = this.bengaliTransliterations[word] || [];
        transliterated.push(...bengaliVariants);
      }
    }

    return {
      original,
      transliterated: Array.from(new Set(transliterated)), // Remove duplicates, keep as array
      confidence: 1,
    };
  }

  /**
   * Expand query with multi-language terms
   */
  async expandQuery(query: string): Promise<string[]> {
    const expandedTerms: string[] = [query];
    const words = query.toLowerCase().split(/\s+/);

    for (const word of words) {
      // Add Hindi variants
      const hindiVariants = this.hindiTransliterations[word] || [];
      expandedTerms.push(...hindiVariants);

      // Add Bengali variants
      const bengaliVariants = this.bengaliTransliterations[word] || [];
      expandedTerms.push(...bengaliVariants);
    }

    return Array.from(new Set(expandedTerms)); // Remove duplicates
  }

  /**
   * Detect language of query
   */
  detectLanguage(query: string): SearchLanguage {
    // Simple language detection based on character ranges
    const hindiRegex = /[\u0900-\u097F]/;
    const bengaliRegex = /[\u0980-\u09FF]/;

    if (hindiRegex.test(query)) {
      return 'hi';
    } else if (bengaliRegex.test(query)) {
      return 'bn';
    } else {
      return 'en';
    }
  }

  /**
   * Get reverse translation (from Hindi/Bengali to English)
   */
  async reverseTranslate(query: string, sourceLanguage: SearchLanguage): Promise<string[]> {
    const englishTerms: string[] = [];

    if (sourceLanguage === 'hi') {
      // Find English equivalents for Hindi terms
      for (const [english, hindiVariants] of Object.entries(this.hindiTransliterations)) {
        if (hindiVariants.some(variant => query.includes(variant))) {
          englishTerms.push(english);
        }
      }
    } else if (sourceLanguage === 'bn') {
      // Find English equivalents for Bengali terms
      for (const [english, bengaliVariants] of Object.entries(this.bengaliTransliterations)) {
        if (bengaliVariants.some(variant => query.includes(variant))) {
          englishTerms.push(english);
        }
      }
    }

    return Array.from(new Set(englishTerms));
  }

  /**
   * Build multi-language search query
   */
  async buildMultiLanguageQuery(originalQuery: string): Promise<string> {
    const detectedLanguage = this.detectLanguage(originalQuery);
    const expandedTerms = await this.expandQuery(originalQuery);
    
    // If query is in Hindi or Bengali, also get English equivalents
    if (detectedLanguage !== 'en') {
      const englishTerms = await this.reverseTranslate(originalQuery, detectedLanguage);
      expandedTerms.push(...englishTerms);
    }

    // Build FTS5 query with OR logic for all variants
    const uniqueTerms = Array.from(new Set(expandedTerms));
    return uniqueTerms.map(term => `"${term}"`).join(' OR ');
  }

  /**
   * Initialize common language mappings
   */
  async initializeCommonMappings(): Promise<void> {
    const commonMappings = [
      // Religious terms
      { en: 'krishna', hi: 'कृष्ण', bn: 'কৃষ্ণ', type: 'deity' },
      { en: 'rama', hi: 'राम', bn: 'রাম', type: 'deity' },
      { en: 'hanuman', hi: 'हनुमान', bn: 'হনুমান', type: 'deity' },
      { en: 'ganesha', hi: 'गणेश', bn: 'গণেশ', type: 'deity' },
      { en: 'shiva', hi: 'शिव', bn: 'শিব', type: 'deity' },
      
      // Books and literature
      { en: 'bhagavad gita', hi: 'भगवद् गीता', bn: 'ভগবদ্ গীতা', type: 'book' },
      { en: 'ramayana', hi: 'रामायण', bn: 'রামায়ণ', type: 'book' },
      { en: 'mahabharata', hi: 'महाभारत', bn: 'মহাভারত', type: 'book' },
      { en: 'purana', hi: 'पुराण', bn: 'পুরাণ', type: 'book' },
      { en: 'upanishad', hi: 'उपनिषद्', bn: 'উপনিষদ্', type: 'book' },
      
      // Items and products
      { en: 'mala', hi: 'माला', bn: 'মালা', type: 'product' },
      { en: 'tulsi', hi: 'तुलसी', bn: 'তুলসী', type: 'product' },
      { en: 'rudraksha', hi: 'रुद्राक्ष', bn: 'রুদ্রাক্ষ', type: 'product' },
      { en: 'incense', hi: 'धूप', bn: 'ধূপ', type: 'product' },
      { en: 'camphor', hi: 'कपूर', bn: 'কর্পূর', type: 'product' },
      { en: 'sandalwood', hi: 'चंदन', bn: 'চন্দন', type: 'product' },
      
      // Spiritual concepts
      { en: 'dharma', hi: 'धर्म', bn: 'ধর্ম', type: 'concept' },
      { en: 'karma', hi: 'कर्म', bn: 'কর্ম', type: 'concept' },
      { en: 'moksha', hi: 'मोक्ष', bn: 'মোক্ষ', type: 'concept' },
      { en: 'bhakti', hi: 'भक्ति', bn: 'ভক্তি', type: 'concept' },
      { en: 'yoga', hi: 'योग', bn: 'যোগ', type: 'concept' },
      { en: 'meditation', hi: 'ध्यान', bn: 'ধ্যান', type: 'concept' },
      { en: 'mantra', hi: 'मंत्र', bn: 'মন্ত্র', type: 'concept' },
      { en: 'puja', hi: 'पूजा', bn: 'পূজা', type: 'concept' },
      { en: 'aarti', hi: 'आरती', bn: 'আরতি', type: 'concept' },
      { en: 'prasadam', hi: 'प्रसाद', bn: 'প্রসাদ', type: 'concept' },
    ];

    for (const mapping of commonMappings) {
      await this.addLanguageMapping(mapping.en, mapping.hi, mapping.bn, mapping.type);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Export singleton instance
export const translationService = new TranslationService();

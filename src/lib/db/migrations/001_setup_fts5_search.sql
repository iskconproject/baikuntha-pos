-- Create FTS5 virtual table for full-text search
DROP TABLE IF EXISTS product_search_fts;

CREATE VIRTUAL TABLE product_search_fts USING fts5(
  product_id UNINDEXED,
  name,
  description,
  keywords,
  category_name,
  variant_names,
  metadata_text,
  language UNINDEXED,
  boost UNINDEXED,
  content='',
  contentless_delete=1
);

-- Create triggers to maintain FTS5 index
CREATE TRIGGER products_fts_insert AFTER INSERT ON products BEGIN
  INSERT INTO product_search_fts(
    product_id, 
    name, 
    description, 
    keywords, 
    category_name,
    variant_names,
    metadata_text,
    language,
    boost
  )
  SELECT 
    NEW.id,
    NEW.name,
    COALESCE(NEW.description, ''),
    COALESCE(NEW.keywords, '[]'),
    COALESCE(c.name, ''),
    COALESCE(
      (SELECT GROUP_CONCAT(pv.name, ' ') 
       FROM product_variants pv 
       WHERE pv.product_id = NEW.id), 
      ''
    ),
    COALESCE(NEW.metadata, '{}'),
    'en',
    1.0
  FROM categories c 
  WHERE c.id = NEW.category_id;
END;

CREATE TRIGGER products_fts_update AFTER UPDATE ON products BEGIN
  DELETE FROM product_search_fts WHERE product_id = OLD.id;
  INSERT INTO product_search_fts(
    product_id, 
    name, 
    description, 
    keywords, 
    category_name,
    variant_names,
    metadata_text,
    language,
    boost
  )
  SELECT 
    NEW.id,
    NEW.name,
    COALESCE(NEW.description, ''),
    COALESCE(NEW.keywords, '[]'),
    COALESCE(c.name, ''),
    COALESCE(
      (SELECT GROUP_CONCAT(pv.name, ' ') 
       FROM product_variants pv 
       WHERE pv.product_id = NEW.id), 
      ''
    ),
    COALESCE(NEW.metadata, '{}'),
    'en',
    1.0
  FROM categories c 
  WHERE c.id = NEW.category_id;
END;

CREATE TRIGGER products_fts_delete AFTER DELETE ON products BEGIN
  DELETE FROM product_search_fts WHERE product_id = OLD.id;
END;

-- Triggers for product variants
CREATE TRIGGER variants_fts_update AFTER INSERT ON product_variants BEGIN
  DELETE FROM product_search_fts WHERE product_id = NEW.product_id;
  INSERT INTO product_search_fts(
    product_id, 
    name, 
    description, 
    keywords, 
    category_name,
    variant_names,
    metadata_text,
    language,
    boost
  )
  SELECT 
    p.id,
    p.name,
    COALESCE(p.description, ''),
    COALESCE(p.keywords, '[]'),
    COALESCE(c.name, ''),
    COALESCE(
      (SELECT GROUP_CONCAT(pv.name, ' ') 
       FROM product_variants pv 
       WHERE pv.product_id = p.id), 
      ''
    ),
    COALESCE(p.metadata, '{}'),
    'en',
    1.0
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE p.id = NEW.product_id;
END;

CREATE TRIGGER variants_fts_update_after_update AFTER UPDATE ON product_variants BEGIN
  DELETE FROM product_search_fts WHERE product_id = NEW.product_id;
  INSERT INTO product_search_fts(
    product_id, 
    name, 
    description, 
    keywords, 
    category_name,
    variant_names,
    metadata_text,
    language,
    boost
  )
  SELECT 
    p.id,
    p.name,
    COALESCE(p.description, ''),
    COALESCE(p.keywords, '[]'),
    COALESCE(c.name, ''),
    COALESCE(
      (SELECT GROUP_CONCAT(pv.name, ' ') 
       FROM product_variants pv 
       WHERE pv.product_id = p.id), 
      ''
    ),
    COALESCE(p.metadata, '{}'),
    'en',
    1.0
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE p.id = NEW.product_id;
END;

CREATE TRIGGER variants_fts_delete AFTER DELETE ON product_variants BEGIN
  DELETE FROM product_search_fts WHERE product_id = OLD.product_id;
  INSERT INTO product_search_fts(
    product_id, 
    name, 
    description, 
    keywords, 
    category_name,
    variant_names,
    metadata_text,
    language,
    boost
  )
  SELECT 
    p.id,
    p.name,
    COALESCE(p.description, ''),
    COALESCE(p.keywords, '[]'),
    COALESCE(c.name, ''),
    COALESCE(
      (SELECT GROUP_CONCAT(pv.name, ' ') 
       FROM product_variants pv 
       WHERE pv.product_id = p.id), 
      ''
    ),
    COALESCE(p.metadata, '{}'),
    'en',
    1.0
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE p.id = OLD.product_id;
END;

-- Create search suggestions table
CREATE TABLE IF NOT EXISTS search_suggestions (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  type TEXT NOT NULL, -- 'product', 'category', 'keyword'
  frequency INTEGER DEFAULT 1,
  language TEXT DEFAULT 'en',
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX search_suggestions_text_idx ON search_suggestions(text);
CREATE INDEX search_suggestions_type_idx ON search_suggestions(type);
CREATE INDEX search_suggestions_frequency_idx ON search_suggestions(frequency);
CREATE INDEX search_suggestions_language_idx ON search_suggestions(language);

-- Create language mappings table for multi-language support
CREATE TABLE IF NOT EXISTS language_mappings (
  id TEXT PRIMARY KEY,
  english_term TEXT NOT NULL,
  hindi_term TEXT,
  bengali_term TEXT,
  type TEXT NOT NULL, -- 'product', 'category', 'keyword'
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX language_mappings_english_idx ON language_mappings(english_term);
CREATE INDEX language_mappings_hindi_idx ON language_mappings(hindi_term);
CREATE INDEX language_mappings_bengali_idx ON language_mappings(bengali_term);
CREATE INDEX language_mappings_type_idx ON language_mappings(type);

-- Insert some common language mappings
INSERT OR IGNORE INTO language_mappings (id, english_term, hindi_term, bengali_term, type) VALUES
  ('lang_book', 'book', 'किताब', 'বই', 'category'),
  ('lang_books', 'books', 'किताबें', 'বইগুলি', 'category'),
  ('lang_gita', 'gita', 'गीता', 'গীতা', 'product'),
  ('lang_bhagavad', 'bhagavad', 'भगवद्', 'ভগবদ্', 'product'),
  ('lang_mala', 'mala', 'माला', 'মালা', 'product'),
  ('lang_tulsi', 'tulsi', 'तुलसी', 'তুলসী', 'product'),
  ('lang_incense', 'incense', 'धूप', 'ধূপ', 'product'),
  ('lang_deity', 'deity', 'देवता', 'দেবতা', 'category'),
  ('lang_prayer', 'prayer', 'प्रार्थना', 'প্রার্থনা', 'keyword'),
  ('lang_spiritual', 'spiritual', 'आध्यात्मिक', 'আধ্যাত্মিক', 'keyword');
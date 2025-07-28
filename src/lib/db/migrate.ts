import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { getLocalDb } from './connection';
import Database from 'better-sqlite3';

export async function runMigrations() {
  const db = getLocalDb();
  
  try {
    // Run standard Drizzle migrations
    await migrate(db, { migrationsFolder: './drizzle' });
    
    // Set up FTS5 virtual table manually since Drizzle doesn't fully support it
    await setupFTS5Table();
    
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function setupFTS5Table() {
  const db = getLocalDb();
  
  try {
    // Drop existing FTS table if it exists
    await db.run(`DROP TABLE IF EXISTS product_search_fts`);
    
    // Create FTS5 virtual table for full-text search
    await db.run(`
      CREATE VIRTUAL TABLE product_search_fts USING fts5(
        product_id UNINDEXED,
        content,
        content='',
        contentless_delete=1
      )
    `);
    
    // Create triggers to maintain FTS index
    await db.run(`
      CREATE TRIGGER products_fts_insert AFTER INSERT ON products BEGIN
        INSERT INTO product_search_fts(product_id, content) 
        VALUES (
          NEW.id, 
          NEW.name || ' ' || 
          COALESCE(NEW.description, '') || ' ' || 
          COALESCE(NEW.keywords, '')
        );
      END
    `);
    
    await db.run(`
      CREATE TRIGGER products_fts_update AFTER UPDATE ON products BEGIN
        DELETE FROM product_search_fts WHERE product_id = OLD.id;
        INSERT INTO product_search_fts(product_id, content) 
        VALUES (
          NEW.id, 
          NEW.name || ' ' || 
          COALESCE(NEW.description, '') || ' ' || 
          COALESCE(NEW.keywords, '')
        );
      END
    `);
    
    await db.run(`
      CREATE TRIGGER products_fts_delete AFTER DELETE ON products BEGIN
        DELETE FROM product_search_fts WHERE product_id = OLD.id;
      END
    `);
    
    // Create triggers for product variants
    await db.run(`
      CREATE TRIGGER variants_fts_insert AFTER INSERT ON product_variants BEGIN
        UPDATE product_search_fts 
        SET content = content || ' ' || NEW.name || ' ' || COALESCE(NEW.keywords, '')
        WHERE product_id = NEW.product_id;
      END
    `);
    
    await db.run(`
      CREATE TRIGGER variants_fts_update AFTER UPDATE ON product_variants BEGIN
        -- Rebuild FTS content for the product
        DELETE FROM product_search_fts WHERE product_id = NEW.product_id;
        INSERT INTO product_search_fts(product_id, content)
        SELECT 
          p.id,
          p.name || ' ' || 
          COALESCE(p.description, '') || ' ' || 
          COALESCE(p.keywords, '') || ' ' ||
          COALESCE(GROUP_CONCAT(pv.name || ' ' || COALESCE(pv.keywords, ''), ' '), '')
        FROM products p
        LEFT JOIN product_variants pv ON p.id = pv.product_id
        WHERE p.id = NEW.product_id
        GROUP BY p.id;
      END
    `);
    
    await db.run(`
      CREATE TRIGGER variants_fts_delete AFTER DELETE ON product_variants BEGIN
        -- Rebuild FTS content for the product
        DELETE FROM product_search_fts WHERE product_id = OLD.product_id;
        INSERT INTO product_search_fts(product_id, content)
        SELECT 
          p.id,
          p.name || ' ' || 
          COALESCE(p.description, '') || ' ' || 
          COALESCE(p.keywords, '') || ' ' ||
          COALESCE(GROUP_CONCAT(pv.name || ' ' || COALESCE(pv.keywords, ''), ' '), '')
        FROM products p
        LEFT JOIN product_variants pv ON p.id = pv.product_id
        WHERE p.id = OLD.product_id
        GROUP BY p.id;
      END
    `);
    
    console.log('✅ FTS5 virtual table and triggers created successfully');
  } catch (error) {
    console.error('❌ FTS5 setup failed:', error);
    throw error;
  }
}

// Utility to rebuild FTS index
export async function rebuildFTSIndex() {
  const db = getLocalDb();
  
  try {
    // Clear existing FTS data
    await db.run(`DELETE FROM product_search_fts`);
    
    // Rebuild FTS index from current products and variants
    await db.run(`
      INSERT INTO product_search_fts(product_id, content)
      SELECT 
        p.id,
        p.name || ' ' || 
        COALESCE(p.description, '') || ' ' || 
        COALESCE(p.keywords, '') || ' ' ||
        COALESCE(GROUP_CONCAT(pv.name || ' ' || COALESCE(pv.keywords, ''), ' '), '')
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE p.is_active = 1
      GROUP BY p.id
    `);
    
    console.log('✅ FTS index rebuilt successfully');
  } catch (error) {
    console.error('❌ FTS index rebuild failed:', error);
    throw error;
  }
}
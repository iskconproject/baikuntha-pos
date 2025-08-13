-- Add custom variant support to transaction_items table
ALTER TABLE transaction_items ADD COLUMN is_custom_variant INTEGER DEFAULT 0;
ALTER TABLE transaction_items ADD COLUMN custom_variant_data TEXT;

-- Create index for custom variant queries
CREATE INDEX item_custom_idx ON transaction_items(is_custom_variant);
-- Add script columns to collections (collection-level scripts)
ALTER TABLE collections ADD COLUMN pre_request_script TEXT DEFAULT '';
ALTER TABLE collections ADD COLUMN test_script TEXT DEFAULT '';

-- Add script columns to collection_items (folder-level scripts)
ALTER TABLE collection_items ADD COLUMN pre_request_script TEXT DEFAULT '';
ALTER TABLE collection_items ADD COLUMN test_script TEXT DEFAULT '';

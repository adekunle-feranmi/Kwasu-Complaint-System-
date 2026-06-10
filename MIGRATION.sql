-- Run this ONCE against your Railway MySQL database to add the new
-- profile columns for ID image + OCR cross-check.
-- (Your app auto-creates new TABLES but not new COLUMNS on existing ones.)

ALTER TABLE profiles
  ADD COLUMN id_image MEDIUMBLOB,
  ADD COLUMN id_image_mime VARCHAR(64),
  ADD COLUMN ocr_matric_text VARCHAR(255),
  ADD COLUMN ocr_match VARCHAR(20);

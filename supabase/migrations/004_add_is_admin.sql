-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set darin.j.manley@gmail.com as admin
UPDATE users SET is_admin = TRUE WHERE email = 'darin.j.manley@gmail.com';

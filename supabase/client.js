const { createClient } = require('@supabase/supabase-js');

// Initialize the Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

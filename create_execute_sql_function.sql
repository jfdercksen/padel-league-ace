-- Create a function that can execute arbitrary SQL
-- This is needed to create other functions dynamically
CREATE OR REPLACE FUNCTION execute_sql(sql text) RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
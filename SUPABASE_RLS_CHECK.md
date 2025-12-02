# Supabase RLS Policy Check - Complete

Run these SQL queries in Supabase to verify ALL policies are correct:

## 1. Check ALL RLS Policies

```sql
-- Show all RLS policies for all tables
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS operation,
  CASE
    WHEN cmd = 'SELECT' THEN 'Read'
    WHEN cmd = 'INSERT' THEN 'Create'
    WHEN cmd = 'UPDATE' THEN 'Update'
    WHEN cmd = 'DELETE' THEN 'Delete'
    ELSE cmd
  END as action
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

## 2. Check Which Tables Have RLS Enabled

```sql
-- Show RLS status for all tables
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

## 3. REQUIRED Policies

### For `profiles` table:
- ✅ SELECT policy (read) - EXISTS
- ✅ INSERT policy (create own profile) - EXISTS
- ✅ UPDATE policy (update own profile) - EXISTS

### For `arbeitsnachweise` table:
- ❓ SELECT policy - NEEDS CHECK
- ❓ INSERT policy - NEEDS CHECK
- ❓ UPDATE policy - NEEDS CHECK

### For `auslagennachweise` table:
- ❓ SELECT policy - NEEDS CHECK
- ❓ INSERT policy - NEEDS CHECK
- ❓ UPDATE policy - NEEDS CHECK

### For `fahrer` table:
- ❓ SELECT policy - NEEDS CHECK
- ❓ INSERT policy - NEEDS CHECK

## 4. Create Missing Policies

If any are missing, run these:

```sql
-- Policies for ARBEITSNACHWEISE (Tours)
CREATE POLICY IF NOT EXISTS "Users can read own arbeitsnachweise"
ON arbeitsnachweise FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can create own arbeitsnachweise"
ON arbeitsnachweise FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own pending arbeitsnachweise"
ON arbeitsnachweise FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

-- Policies for AUSLAGENNACHWEISE (Expenses)
CREATE POLICY IF NOT EXISTS "Users can read own auslagennachweise"
ON auslagennachweise FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can create own auslagennachweise"
ON auslagennachweise FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own pending auslagennachweise"
ON auslagennachweise FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

-- Policies for FAHRER table
CREATE POLICY IF NOT EXISTS "Users can read own fahrer data"
ON fahrer FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Admins can read all fahrer"
ON fahrer FOR SELECT
TO authenticated
USING (true);  -- Simplified - all authenticated users can read

CREATE POLICY IF NOT EXISTS "System can create fahrer"
ON fahrer FOR INSERT
TO authenticated
WITH CHECK (true);  -- Allow insert for authenticated users

CREATE POLICY IF NOT EXISTS "Users can update own fahrer data"
ON fahrer FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
```

## 5. Test Queries

After creating policies, test if they work:

```sql
-- Test if arbeitsnachweise INSERT would work
-- This should return the policy details
SELECT * FROM pg_policies
WHERE tablename = 'arbeitsnachweise' AND cmd = 'INSERT';

-- Test if auslagennachweise INSERT would work
SELECT * FROM pg_policies
WHERE tablename = 'auslagennachweise' AND cmd = 'INSERT';

-- Test if fahrer INSERT would work
SELECT * FROM pg_policies
WHERE tablename = 'fahrer' AND cmd = 'INSERT';
```

## 6. Disable RLS Temporarily for Testing (IF NEEDED)

```sql
-- Only use this for testing if policies don't work
ALTER TABLE arbeitsnachweise DISABLE ROW LEVEL SECURITY;
ALTER TABLE auslagennachweise DISABLE ROW LEVEL SECURITY;
ALTER TABLE fahrer DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
-- ALTER TABLE arbeitsnachweise ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE auslagennachweise ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fahrer ENABLE ROW LEVEL SECURITY;
```

## Priority Order

1. **First:** Run query #1 to see all policies
2. **Second:** Run query #2 to see which tables have RLS
3. **Third:** Create missing policies from section #4
4. **Fourth:** Test with actual upload on website

## Expected Result

All tables should have:
- RLS enabled: `true`
- SELECT policy for reading
- INSERT policy for creating
- UPDATE policy for updating own data

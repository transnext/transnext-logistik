-- Füge 'billed' Status zu auslagennachweise hinzu

-- Entferne alte Constraint
ALTER TABLE auslagennachweise 
DROP CONSTRAINT IF EXISTS auslagennachweise_status_check;

-- Erstelle neue Constraint mit 'billed'
ALTER TABLE auslagennachweise 
ADD CONSTRAINT auslagennachweise_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'billed'));

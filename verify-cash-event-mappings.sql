-- Verification Query for CASH_EQUIVALENTS_END Event Mappings
-- Expected: 6 mappings (2 activities × 3 projects)

SELECT 
  e.code as event_code,
  da.name as activity_name,
  da.project_type,
  cem.mapping_type,
  cem.is_active
FROM configurable_event_mappings cem
JOIN events e ON e.id = cem.event_id
JOIN dynamic_activities da ON da.id = cem.activity_id
WHERE e.code = 'CASH_EQUIVALENTS_END'
  AND da.module_type = 'execution'
  AND cem.is_active = true
ORDER BY da.project_type, da.name;

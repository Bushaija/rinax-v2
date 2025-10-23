-- Simple check for PLANNING vs EXECUTION data

-- 1. Check if any PLANNING data exists at all
SELECT 
    da.entity_type,
    COUNT(*) as record_count,
    COUNT(DISTINCT da.facility_id) as unique_facilities,
    COUNT(DISTINCT da.reporting_period_id) as unique_periods
FROM dynamic_activities da
GROUP BY da.entity_type;

-- 2. Check PLANNING data for our specific criteria (reportingPeriodId=2, facilityId=17)
SELECT 
    'PLANNING for period 2, facility 17' as check_description,
    COUNT(*) as planning_activities
FROM dynamic_activities da
JOIN projects p ON da.project_id = p.id
WHERE da.entity_type = 'PLANNING'
  AND da.reporting_period_id = 2
  AND da.facility_id = 17
  AND p.project_type = 'Malaria';

-- 3. Check EXECUTION data for comparison
SELECT 
    'EXECUTION for period 2, facility 17' as check_description,
    COUNT(*) as execution_activities
FROM dynamic_activities da
JOIN projects p ON da.project_id = p.id
WHERE da.entity_type = 'EXECUTION'
  AND da.reporting_period_id = 2
  AND da.facility_id = 17
  AND p.project_type = 'Malaria';

-- 4. Check if there are any schema_form_data_entries linked to PLANNING activities
SELECT 
    'PLANNING data entries' as check_description,
    COUNT(*) as data_entries
FROM schema_form_data_entries sfd
JOIN dynamic_activities da ON sfd.entity_id = da.id
JOIN projects p ON da.project_id = p.id
WHERE da.entity_type = 'PLANNING'
  AND da.reporting_period_id = 2
  AND da.facility_id = 17
  AND p.project_type = 'Malaria';

-- 5. Check if there are any schema_form_data_entries linked to EXECUTION activities
SELECT 
    'EXECUTION data entries' as check_description,
    COUNT(*) as data_entries
FROM schema_form_data_entries sfd
JOIN dynamic_activities da ON sfd.entity_id = da.id
JOIN projects p ON da.project_id = p.id
WHERE da.entity_type = 'EXECUTION'
  AND da.reporting_period_id = 2
  AND da.facility_id = 17
  AND p.project_type = 'Malaria';
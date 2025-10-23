-- Debug script to trace why GOODS_SERVICES_PLANNING data is missing from budget column
-- Run this in your PostgreSQL database to trace the data flow

-- Test parameters (matching the API request)
-- facilityId: 20, reportingPeriodId: 2, projectType: "Malaria", projectId: 1

\echo '🔍 DEBUGGING PLANNING DATA FLOW FOR GOODS_SERVICES_PLANNING'
\echo '================================================================================'

-- Step 1: Verify GOODS_SERVICES_PLANNING event exists
\echo ''
\echo '📋 STEP 1: Verify GOODS_SERVICES_PLANNING event exists'
SELECT 
    id,
    code,
    name,
    description
FROM events 
WHERE code = 'GOODS_SERVICES_PLANNING';

-- Step 2: Check planning activities mapped to GOODS_SERVICES_PLANNING
\echo ''
\echo '📋 STEP 2: Check planning activities mapped to GOODS_SERVICES_PLANNING'
SELECT 
    cem.activity_id,
    cem.event_id,
    e.code as event_code,
    da.name as activity_name,
    da.code as activity_code,
    da.project_type,
    da.module_type,
    cem.is_active
FROM configurable_event_mappings cem
INNER JOIN events e ON cem.event_id = e.id
INNER JOIN dynamic_activities da ON cem.activity_id = da.id
WHERE e.code = 'GOODS_SERVICES_PLANNING'
    AND cem.is_active = true
    AND da.project_type = 'Malaria'
    AND da.module_type = 'planning'
ORDER BY da.display_order;

-- Step 3: Check planning data in schema_form_data_entries for these activities
\echo ''
\echo '📋 STEP 3: Check planning data in schema_form_data_entries'
WITH planning_activities AS (
    SELECT cem.activity_id
    FROM configurable_event_mappings cem
    INNER JOIN events e ON cem.event_id = e.id
    INNER JOIN dynamic_activities da ON cem.activity_id = da.id
    WHERE e.code = 'GOODS_SERVICES_PLANNING'
        AND cem.is_active = true
        AND da.project_type = 'Malaria'
        AND da.module_type = 'planning'
)
SELECT 
    sfde.id,
    sfde.entity_id,
    sfde.facility_id,
    sfde.project_id,
    sfde.reporting_period_id,
    sfde.entity_type,
    COALESCE(CAST(sfde.form_data->>'amount' AS NUMERIC), 0) as amount,
    da.name as activity_name,
    da.code as activity_code
FROM schema_form_data_entries sfde
INNER JOIN planning_activities pa ON sfde.entity_id = pa.activity_id
INNER JOIN dynamic_activities da ON sfde.entity_id = da.id
WHERE sfde.facility_id = 20
    AND sfde.reporting_period_id = 2
    AND sfde.project_id = 1
    AND sfde.entity_type = 'planning'
ORDER BY sfde.id;

-- Step 3b: Summary of planning data amounts
\echo ''
\echo '📊 STEP 3b: Summary of planning data amounts'
WITH planning_activities AS (
    SELECT cem.activity_id
    FROM configurable_event_mappings cem
    INNER JOIN events e ON cem.event_id = e.id
    INNER JOIN dynamic_activities da ON cem.activity_id = da.id
    WHERE e.code = 'GOODS_SERVICES_PLANNING'
        AND cem.is_active = true
        AND da.project_type = 'Malaria'
        AND da.module_type = 'planning'
)
SELECT 
    COUNT(*) as total_entries,
    SUM(COALESCE(CAST(sfde.form_data->>'amount' AS NUMERIC), 0)) as total_amount
FROM schema_form_data_entries sfde
INNER JOIN planning_activities pa ON sfde.entity_id = pa.activity_id
WHERE sfde.facility_id = 20
    AND sfde.reporting_period_id = 2
    AND sfde.project_id = 1
    AND sfde.entity_type = 'planning';

-- Step 4: Simulate the data aggregation engine query (collectTraditionalData)
\echo ''
\echo '📋 STEP 4: Simulate data aggregation engine query (collectTraditionalData)'
SELECT 
    e.code as event_code,
    sfde.facility_id,
    COALESCE(CAST(sfde.form_data->>'amount' AS NUMERIC), 0) as amount,
    sfde.entity_type,
    sfde.reporting_period_id,
    sfde.entity_id,
    cem.activity_id,
    cem.event_id
FROM schema_form_data_entries sfde
INNER JOIN configurable_event_mappings cem ON sfde.entity_id = cem.activity_id
INNER JOIN events e ON cem.event_id = e.id
WHERE sfde.project_id = 1
    AND sfde.facility_id = 20
    AND sfde.reporting_period_id = 2
    AND sfde.entity_type = 'planning'
    AND e.code = 'GOODS_SERVICES_PLANNING'
    AND sfde.entity_id IS NOT NULL  -- Only traditional data
ORDER BY sfde.id;

-- Step 4b: Aggregated results (what should be passed to the processor)
\echo ''
\echo '📊 STEP 4b: Aggregated results for GOODS_SERVICES_PLANNING'
SELECT 
    e.code as event_code,
    COUNT(*) as entry_count,
    SUM(COALESCE(CAST(sfde.form_data->>'amount' AS NUMERIC), 0)) as total_amount
FROM schema_form_data_entries sfde
INNER JOIN configurable_event_mappings cem ON sfde.entity_id = cem.activity_id
INNER JOIN events e ON cem.event_id = e.id
WHERE sfde.project_id = 1
    AND sfde.facility_id = 20
    AND sfde.reporting_period_id = 2
    AND sfde.entity_type = 'planning'
    AND e.code = 'GOODS_SERVICES_PLANNING'
    AND sfde.entity_id IS NOT NULL
GROUP BY e.code;

-- Step 5: Debug - Check if the issue is in the joins
\echo ''
\echo '🔍 DEBUG: Breaking down the aggregation query step by step'

-- Step 5a: Check schema_form_data_entries alone
\echo ''
\echo 'Step 5a - schema_form_data_entries entries for facility 20, period 2, planning:'
SELECT 
    COUNT(*) as total_entries,
    entity_type,
    project_id
FROM schema_form_data_entries
WHERE project_id = 1
    AND facility_id = 20
    AND reporting_period_id = 2
    AND entity_type = 'planning'
GROUP BY entity_type, project_id;

-- Step 5b: Check the join with configurable_event_mappings
\echo ''
\echo 'Step 5b - After configurable_event_mappings join:'
SELECT 
    COUNT(*) as entries_after_join,
    COUNT(DISTINCT sfde.entity_id) as unique_activities,
    COUNT(DISTINCT cem.event_id) as unique_events
FROM schema_form_data_entries sfde
INNER JOIN configurable_event_mappings cem ON sfde.entity_id = cem.activity_id
WHERE sfde.project_id = 1
    AND sfde.facility_id = 20
    AND sfde.reporting_period_id = 2
    AND sfde.entity_type = 'planning';

-- Step 5c: Check the final join with events
\echo ''
\echo 'Step 5c - After events join:'
SELECT 
    COUNT(*) as entries_after_events_join,
    COUNT(DISTINCT e.code) as unique_event_codes,
    string_agg(DISTINCT e.code, ', ') as event_codes_found
FROM schema_form_data_entries sfde
INNER JOIN configurable_event_mappings cem ON sfde.entity_id = cem.activity_id
INNER JOIN events e ON cem.event_id = e.id
WHERE sfde.project_id = 1
    AND sfde.facility_id = 20
    AND sfde.reporting_period_id = 2
    AND sfde.entity_type = 'planning';

-- Step 5d: Check specifically for GOODS_SERVICES_PLANNING
\echo ''
\echo 'Step 5d - Specifically filtering for GOODS_SERVICES_PLANNING:'
SELECT 
    COUNT(*) as goods_services_planning_entries,
    SUM(COALESCE(CAST(sfde.form_data->>'amount' AS NUMERIC), 0)) as total_amount
FROM schema_form_data_entries sfde
INNER JOIN configurable_event_mappings cem ON sfde.entity_id = cem.activity_id
INNER JOIN events e ON cem.event_id = e.id
WHERE sfde.project_id = 1
    AND sfde.facility_id = 20
    AND sfde.reporting_period_id = 2
    AND sfde.entity_type = 'planning'
    AND e.code = 'GOODS_SERVICES_PLANNING';

-- Step 6: Check if there are any NULL entity_id entries (JSON data)
\echo ''
\echo '📋 STEP 6: Check for JSON-based planning data (entity_id IS NULL)'
SELECT 
    COUNT(*) as json_entries,
    entity_type,
    form_data->>'activities' IS NOT NULL as has_activities
FROM schema_form_data_entries
WHERE project_id = 1
    AND facility_id = 20
    AND reporting_period_id = 2
    AND entity_type = 'planning'
    AND entity_id IS NULL
GROUP BY entity_type, (form_data->>'activities' IS NOT NULL);

-- Step 7: Final diagnostic - Show all planning data for this facility/period
\echo ''
\echo '📋 STEP 7: All planning data for facility 20, period 2'
SELECT 
    id,
    entity_id,
    entity_type,
    COALESCE(CAST(form_data->>'amount' AS NUMERIC), 0) as amount,
    CASE 
        WHEN entity_id IS NULL THEN 'JSON_DATA'
        ELSE 'TRADITIONAL_DATA'
    END as data_type,
    form_data->>'activities' IS NOT NULL as has_activities_json
FROM schema_form_data_entries
WHERE project_id = 1
    AND facility_id = 20
    AND reporting_period_id = 2
    AND entity_type = 'planning'
ORDER BY id;

\echo ''
\echo '================================================================================'
\echo '🎯 DEBUGGING COMPLETE - Check the results above to identify where data is lost'
-- Test Data Aggregation Engine Simulation
-- This simulates exactly what the DataAggregationEngine.collectEventData() and aggregateByEvent() should do

-- 1. Simulate collectEventData for planning data
WITH planning_event_data AS (
    SELECT 
        sfde.facility_id,
        sfde.project_id,
        sfde.reporting_period_id,
        activity_id::integer as activity_id,
        da.name as activity_name,
        cem.event_id,
        e.code as event_code,
        (sfde.form_data->'activities'->activity_id->>'total_budget')::numeric as amount,
        'planning' as entity_type
    FROM schema_form_data_entries sfde
    JOIN projects p ON sfde.project_id = p.id
    CROSS JOIN LATERAL jsonb_object_keys(sfde.form_data->'activities') as activity_id
    JOIN dynamic_activities da ON da.id = activity_id::integer
    JOIN configurable_event_mappings cem ON cem.activity_id = da.id AND cem.is_active = true
    JOIN events e ON cem.event_id = e.id
    WHERE sfde.facility_id = 20 
        AND p.project_type = 'Malaria'
        AND sfde.entity_type = 'planning'
        AND sfde.reporting_period_id = 2
),

-- 2. Simulate aggregateByEvent for planning data
planning_aggregated AS (
    SELECT 
        event_code,
        SUM(amount) as total_amount,
        COUNT(*) as activity_count
    FROM planning_event_data
    GROUP BY event_code
),

-- 3. Simulate collectEventData for execution data (should be empty for this test)
execution_event_data AS (
    SELECT 
        sfde.facility_id,
        sfde.project_id,
        sfde.reporting_period_id,
        activity_id::integer as activity_id,
        da.name as activity_name,
        cem.event_id,
        e.code as event_code,
        (sfde.form_data->'activities'->activity_id->>'amount')::numeric as amount,
        'execution' as entity_type
    FROM schema_form_data_entries sfde
    JOIN projects p ON sfde.project_id = p.id
    CROSS JOIN LATERAL jsonb_object_keys(sfde.form_data->'activities') as activity_id
    JOIN dynamic_activities da ON da.id = activity_id::integer
    JOIN configurable_event_mappings cem ON cem.activity_id = da.id AND cem.is_active = true
    JOIN events e ON cem.event_id = e.id
    WHERE sfde.facility_id = 20 
        AND p.project_type = 'Malaria'
        AND sfde.entity_type = 'execution'
        AND sfde.reporting_period_id = 2
),

-- 4. Simulate aggregateByEvent for execution data
execution_aggregated AS (
    SELECT 
        event_code,
        SUM(amount) as total_amount,
        COUNT(*) as activity_count
    FROM execution_event_data
    GROUP BY event_code
)

-- 5. Show what the Budget vs Actual processor should receive
SELECT 
    'PLANNING_DATA' as data_type,
    event_code,
    total_amount,
    activity_count
FROM planning_aggregated

UNION ALL

SELECT 
    'EXECUTION_DATA' as data_type,
    event_code,
    total_amount,
    activity_count
FROM execution_aggregated

ORDER BY data_type, event_code;

-- 6. Test the specific custom mapping for GOODS_SERVICES line
-- This simulates what the CustomEventMapper.applyMappingWithErrorHandling should do
SELECT 
    'GOODS_SERVICES_MAPPING_TEST' as test_name,
    'GOODS_SERVICES_PLANNING' as budget_event,
    COALESCE(pa.total_amount, 0) as budget_amount,
    'GOODS_SERVICES' as actual_event,
    COALESCE(ea.total_amount, 0) as actual_amount,
    COALESCE(ea.total_amount, 0) - COALESCE(pa.total_amount, 0) as variance
FROM (SELECT total_amount FROM planning_aggregated WHERE event_code = 'GOODS_SERVICES_PLANNING') pa
FULL OUTER JOIN (SELECT total_amount FROM execution_aggregated WHERE event_code = 'GOODS_SERVICES') ea ON true;

-- 7. Test the specific custom mapping for TRANSFERS_PUBLIC line
SELECT 
    'TRANSFERS_PUBLIC_MAPPING_TEST' as test_name,
    'GOODS_SERVICES_PLANNING' as budget_event,
    COALESCE(pa.total_amount, 0) as budget_amount,
    'TRANSFERS_PUBLIC_ENTITIES' as actual_event,
    COALESCE(ea.total_amount, 0) as actual_amount,
    COALESCE(ea.total_amount, 0) - COALESCE(pa.total_amount, 0) as variance
FROM (SELECT total_amount FROM planning_aggregated WHERE event_code = 'GOODS_SERVICES_PLANNING') pa
FULL OUTER JOIN (SELECT total_amount FROM execution_aggregated WHERE event_code = 'TRANSFERS_PUBLIC_ENTITIES') ea ON true;
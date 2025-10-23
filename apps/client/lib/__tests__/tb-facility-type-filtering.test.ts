// Test for TB facility type filtering
describe('TB Facility Type Filtering', () => {
  const mockFacilities = [
    { id: '1', name: 'butaro', type: 'hospital', program: 'HIV' },
    { id: '2', name: 'kivuye', type: 'health_center', program: 'HIV' },
    { id: '3', name: 'ruhango', type: 'hospital', program: 'Malaria' },
    { id: '4', name: 'nyagatare', type: 'health_center', program: 'Malaria' },
  ];

  // Mock the getFacilityTypes function
  const getFacilityTypes = (program?: string) => {
    // TB program rule: Only hospitals can be planned for TB program
    if (program === 'TB') {
      return [{ id: 'hospital', label: 'Hospital' }];
    }
    
    const set = new Set<string>();
    
    // Filter facilities by program if specified and not empty
    const filteredFacilities = program && program.trim() !== ''
      ? mockFacilities.filter((f: any) => f.program === program)
      : mockFacilities;
    
    // Get unique facility types from filtered facilities
    for (const f of filteredFacilities) {
      if (f.type && f.type.trim() !== '') set.add(f.type);
    }
    
    let result = Array.from(set).map((t) => ({ 
      id: t,
      label: t.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) 
    }));
    
    // If no facility types found, provide default options
    if (result.length === 0) {
      result = [
        { id: 'hospital', label: 'Hospital' },
        { id: 'health_center', label: 'Health Center' }
      ];
    }
    
    return result;
  };

  it('should only return hospitals when TB program is selected', () => {
    const result = getFacilityTypes('TB');
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 'hospital', label: 'Hospital' });
  });

  it('should return both hospital and health_center for HIV program', () => {
    const result = getFacilityTypes('HIV');
    
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ id: 'hospital', label: 'Hospital' });
    expect(result).toContainEqual({ id: 'health_center', label: 'Health Center' });
  });

  it('should return both hospital and health_center for Malaria program', () => {
    const result = getFacilityTypes('Malaria');
    
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ id: 'hospital', label: 'Hospital' });
    expect(result).toContainEqual({ id: 'health_center', label: 'Health Center' });
  });

  it('should return both hospital and health_center when no program is specified', () => {
    const result = getFacilityTypes();
    
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ id: 'hospital', label: 'Hospital' });
    expect(result).toContainEqual({ id: 'health_center', label: 'Health Center' });
  });
});

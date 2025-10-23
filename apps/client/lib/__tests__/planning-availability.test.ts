import { isAvailableForPlanning, createAvailabilityChecker } from '../planning-availability';
import type { PlannedFacility, Facility } from '../planning-availability';

describe('planning-availability', () => {
  const mockFacilities: Facility[] = [
    { id: '1', name: 'butaro', type: 'hospital' },
    { id: '2', name: 'kivuye', type: 'health_center' },
    { id: '3', name: 'ruhango', type: 'hospital' },
    { id: '4', name: 'nyagatare', type: 'health_center' },
  ];

  const mockPlannedFacilities: PlannedFacility[] = [
    {
      facilityId: 1,
      facilityName: 'butaro',
      facilityType: 'hospital',
      districtId: 11,
      projectId: 2,
      projectType: 'Malaria',
      plannedCount: 1
    },
    {
      facilityId: 2,
      facilityName: 'kivuye',
      facilityType: 'health_center',
      districtId: 11,
      projectId: 1,
      projectType: 'HIV',
      plannedCount: 1
    }
  ];

  describe('isAvailableForPlanning', () => {
    it('should prevent duplicate program-facility type combinations', () => {
      // Malaria + hospital combination already exists (butaro)
      expect(isAvailableForPlanning('ruhango', 'Malaria', mockFacilities, mockPlannedFacilities)).toBe(false);
      
      // HIV + health_center combination already exists (kivuye)
      expect(isAvailableForPlanning('nyagatare', 'HIV', mockFacilities, mockPlannedFacilities)).toBe(false);
    });

    it('should allow new program-facility type combinations', () => {
      // HIV + hospital combination doesn't exist yet
      expect(isAvailableForPlanning('ruhango', 'HIV', mockFacilities, mockPlannedFacilities)).toBe(true);
      
      // Malaria + health_center combination doesn't exist yet
      expect(isAvailableForPlanning('nyagatare', 'Malaria', mockFacilities, mockPlannedFacilities)).toBe(true);
    });

    it('should prevent duplicate facility-program combinations', () => {
      // butaro is already planned for Malaria
      expect(isAvailableForPlanning('butaro', 'Malaria', mockFacilities, mockPlannedFacilities)).toBe(false);
      
      // kivuye is already planned for HIV
      expect(isAvailableForPlanning('kivuye', 'HIV', mockFacilities, mockPlannedFacilities)).toBe(false);
    });

    it('should enforce TB program hospital-only rule', () => {
      // TB can only be planned for hospitals
      expect(isAvailableForPlanning('butaro', 'TB', mockFacilities, mockPlannedFacilities)).toBe(true);
      expect(isAvailableForPlanning('kivuye', 'TB', mockFacilities, mockPlannedFacilities)).toBe(false);
    });

    it('should return false for non-existent facilities', () => {
      expect(isAvailableForPlanning('nonexistent', 'HIV', mockFacilities, mockPlannedFacilities)).toBe(false);
    });
  });

  describe('createAvailabilityChecker', () => {
    it('should create a curried function that works correctly', () => {
      const checker = createAvailabilityChecker(mockFacilities, mockPlannedFacilities);
      
      // Should prevent duplicate program-facility type combinations
      expect(checker('ruhango', 'Malaria')).toBe(false);
      expect(checker('nyagatare', 'HIV')).toBe(false);
      
      // Should allow new combinations
      expect(checker('ruhango', 'HIV')).toBe(true);
      expect(checker('nyagatare', 'Malaria')).toBe(true);
    });
  });
});

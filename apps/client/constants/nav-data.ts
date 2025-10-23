import { AuthUser } from '@/server/lib/auth';
import type { NavItem } from '@/types/nav-types';

// types/nav-types.ts
type RoleNavItem = Omit<NavItem, 'items'> & {
  items?: RoleNavItem[];
  roles: string[];
};

const ALL_NAV_ITEMS: RoleNavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: 'dashboard',
    shortcut: ['d', 'd'],
    roles: ['accountant', 'admin', 'program_manager', 'superadmin'],
    items: []
  },

  // SCHEMA-DRIVEN PLANNING MODULE
  {
    title: 'Budget Planning',
    url: '/dashboard/planning',
    icon: 'clipboardList',
    shortcut: ['p', 'p'],
    roles: ['accountant', 'program_manager'],
    // items: [
    //   {
    //     title: 'Planning Forms',
    //     url: '/dashboard/planning/forms',
    //     icon: 'fileText',
    //     roles: ['accountant', 'program_manager']
    //   },
    //   {
    //     title: 'Planning Analysis',
    //     url: '/dashboard/planning/analysis',
    //     icon: 'barChart',
    //     roles: ['program_manager']
    //   },
    //   {
    //     title: 'Budget Templates',
    //     url: '/dashboard/planning/templates',
    //     icon: 'layout',
    //     roles: ['program_manager']
    //   }
    // ]
  },

  // SCHEMA-DRIVEN EXECUTION MODULE
  {
    title: 'Budget Execution',
    url: '/dashboard/execution',
    icon: 'checkList',
    shortcut: ['e', 'e'],
    roles: ['accountant', 'program_manager'],
    // items: [
    //   {
    //     title: 'Execution Forms',
    //     url: '/dashboard/execution/forms',
    //     icon: 'fileText',
    //     roles: ['accountant', 'program_manager']
    //   },
    //   {
    //     title: 'Balance Calculations',
    //     url: '/dashboard/execution/balances',
    //     icon: 'calculator',
    //     roles: ['accountant']
    //   },
    //   {
    //     title: 'Quarterly Submissions',
    //     url: '/dashboard/execution/quarterly',
    //     icon: 'calendar',
    //     roles: ['accountant']
    //   },
    //   {
    //     title: 'Variance Analysis',
    //     url: '/dashboard/execution/variance',
    //     icon: 'trendingUp',
    //     roles: ['program_manager']
    //   }
    // ]
  },
  {
    title: 'Budget Compilation',
    url: '/dashboard/compiled',
    icon: 'layers',
    shortcut: ['e', 'e'],
    roles: ['accountant', 'program_manager'],
    // items: [
    //   {
    //     title: 'Execution Forms',
    //     url: '/dashboard/execution/forms',
    //     icon: 'fileText',
    //     roles: ['accountant', 'program_manager']
    //   },
    //   {
    //     title: 'Balance Calculations',
    //     url: '/dashboard/execution/balances',
    //     icon: 'calculator',
    //     roles: ['accountant']
    //   },
    //   {
    //     title: 'Quarterly Submissions',
    //     url: '/dashboard/execution/quarterly',
    //     icon: 'calendar',
    //     roles: ['accountant']
    //   },
    //   {
    //     title: 'Variance Analysis',
    //     url: '/dashboard/execution/variance',
    //     icon: 'trendingUp',
    //     roles: ['program_manager']
    //   }
    // ]
  },

  // PROJECT MANAGEMENT (Enhanced for Program Managers)
  // {
  //   title: 'Projects',
  //   url: '/dashboard/projects',
  //   icon: 'briefcase',
  //   shortcut: ['p', 'j'],
  //   roles: ['program_manager', 'admin'],
  //   items: [
  //     {
  //       title: 'My Projects',
  //       url: '/dashboard/projects/my-projects',
  //       icon: 'folder',
  //       roles: ['program_manager']
  //     },
  //     {
  //       title: 'Project Monitoring',
  //       url: '/dashboard/projects/monitoring',
  //       icon: 'activity',
  //       roles: ['program_manager']
  //     },
  //     {
  //       title: 'All Projects',
  //       url: '/dashboard/projects/all',
  //       icon: 'folderOpen',
  //       roles: ['admin']
  //     }
  //   ]
  // },

  // FACILITY MANAGEMENT (For Accountants)
  // {
  //   title: 'My Facility',
  //   url: '/dashboard/facility',
  //   icon: 'building',
  //   shortcut: ['f', 'f'],
  //   roles: ['accountant'],
  //   isActive: true,
  //   items: [
  //     {
  //       title: 'Facility Overview',
  //       url: '/dashboard/facility/overview',
  //       icon: 'eye',
  //       roles: ['accountant']
  //     },
  //     {
  //       title: 'Current Projects',
  //       url: '/dashboard/facility/projects',
  //       icon: 'folder',
  //       roles: ['accountant']
  //     },
  //     {
  //       title: 'Data Validation',
  //       url: '/dashboard/facility/validation',
  //       icon: 'checkCircle',
  //       roles: ['accountant']
  //     }
  //   ]
  // },

  // ENHANCED REPORTING MODULE
  {
    title: 'Financial Reports',
    url: '/dashboard/reports',
    icon: 'notebookTabs',
    shortcut: ['r', 'r'],
    isActive: true,
    roles: ['accountant', 'program_manager'],
    items: [
      {
        title: 'Revenue & Expenditure',
        url: '/dashboard/reports/revenue-expenditure',
        icon: 'dollarSign',
        shortcut: ['r', 'e'],
        roles: ['accountant', 'program_manager']
      },
      {
        title: 'Balance Sheet',
        url: '/dashboard/reports/balance-sheet',
        icon: 'scale',
        shortcut: ['b', 's'],
        roles: ['accountant', 'program_manager']
      },
      {
        title: 'Cash Flow',
        url: '/dashboard/reports/cash-flow',
        icon: 'arrowUpDown',
        shortcut: ['c', 'f'],
        roles: ['accountant', 'program_manager']
      },
      {
        title: 'Net Assets Changes',
        url: '/dashboard/reports/net-assets-changes',
        icon: 'trendingUp',
        shortcut: ['n', 'a'],
        roles: ['accountant', 'program_manager']
      },
      {
        title: 'Budget vs Actual',
        url: '/dashboard/reports/budget-vs-actual',
        icon: 'barChart3',
        shortcut: ['b', 'a'],
        roles: ['accountant', 'program_manager']
      },
      // {
      //   title: 'Report Generation',
      //   url: '/dashboard/reports/generate',
      //   icon: 'fileDown',
      //   roles: ['accountant', 'program_manager']
      // }
    ]
  },

  // ANALYTICS & INSIGHTS
  // {
  //   title: 'Analytics',
  //   url: '/dashboard/analytics',
  //   icon: 'barChart',
  //   shortcut: ['a', 'n'],
  //   roles: ['program_manager', 'admin'],
  //   items: [
  //     {
  //       title: 'Budget Execution Rates',
  //       url: '/dashboard/analytics/execution-rates',
  //       icon: 'percent',
  //       roles: ['program_manager', 'admin']
  //     },
  //     {
  //       title: 'Trend Analysis',
  //       url: '/dashboard/analytics/trends',
  //       icon: 'trendingUp',
  //       roles: ['program_manager', 'admin']
  //     },
  //     {
  //       title: 'Facility Performance',
  //       url: '/dashboard/analytics/facility-performance',
  //       icon: 'target',
  //       roles: ['program_manager', 'admin']
  //     },
  //     {
  //       title: 'Compliance Status',
  //       url: '/dashboard/analytics/compliance',
  //       icon: 'shield',
  //       roles: ['admin']
  //     }
  //   ]
  // },

  // SCHEMA MANAGEMENT (New section for dynamic system)
  // {
  //   title: 'Schema Management',
  //   url: '/dashboard/schema',
  //   icon: 'code',
  //   shortcut: ['s', 'm'],
  //   roles: ['admin', 'superadmin'],
  //   items: [
  //     {
  //       title: 'Form Schemas',
  //       url: '/dashboard/schema/forms',
  //       icon: 'fileText',
  //       roles: ['admin', 'superadmin']
  //     },
  //     {
  //       title: 'Activity Categories',
  //       url: '/dashboard/schema/categories',
  //       icon: 'tags',
  //       roles: ['admin', 'superadmin']
  //     },
  //     {
  //       title: 'Dynamic Activities',
  //       url: '/dashboard/schema/activities',
  //       icon: 'list',
  //       roles: ['admin', 'superadmin']
  //     },
  //     {
  //       title: 'Event Mappings',
  //       url: '/dashboard/schema/event-mappings',
  //       icon: 'gitBranch',
  //       roles: ['admin', 'superadmin']
  //     },
  //     {
  //       title: 'Statement Templates',
  //       url: '/dashboard/schema/statement-templates',
  //       icon: 'layout',
  //       roles: ['admin', 'superadmin']
  //     }
  //   ]
  // },

  // ENHANCED ADMINISTRATION
  {
    title: 'Administration',
    url: '/dashboard/admin',
    icon: 'settings',
    shortcut: ['a', 'd'],
    roles: ['admin', 'superadmin'],
    isActive: true,
    items: [
      {
        title: 'User Management',
        url: '/dashboard/admin/users',
        icon: 'users',
        roles: ['admin', 'superadmin']
      },
      // {
      //   title: 'Master Data',
      //   url: '/dashboard/admin/master-data',
      //   icon: 'database',
      //   roles: ['admin', 'superadmin'],
      //   items: [
      //     {
      //       title: 'Facilities',
      //       url: '/dashboard/admin/master-data/facilities',
      //       icon: 'building',
      //       roles: ['admin', 'superadmin']
      //     },
      //     {
      //       title: 'Projects',
      //       url: '/dashboard/admin/master-data/projects',
      //       icon: 'briefcase',
      //       roles: ['admin', 'superadmin']
      //     },
      //     {
      //       title: 'Reporting Periods',
      //       url: '/dashboard/admin/master-data/reporting-periods',
      //       icon: 'calendar',
      //       roles: ['admin', 'superadmin']
      //     },
      //     {
      //       title: 'Events',
      //       url: '/dashboard/admin/master-data/events',
      //       icon: 'zap',
      //       roles: ['admin', 'superadmin']
      //     }
      //   ]
      // },
      {
        title: 'System Configuration',
        url: '/dashboard/admin/system-config',
        icon: 'cog',
        roles: ['superadmin'],
        items: [
          {
            title: 'Global Settings',
            url: '/dashboard/admin/system-config/global',
            icon: 'globe',
            roles: ['superadmin']
          },
          {
            title: 'Configuration Audit',
            url: '/dashboard/admin/system-config/audit',
            icon: 'history',
            roles: ['superadmin']
          }
        ]
      },
      // {
      //   title: 'Data Management',
      //   url: '/dashboard/admin/data-management',
      //   icon: 'hardDrive',
      //   roles: ['admin', 'superadmin'],
      //   items: [
      //     {
      //       title: 'Bulk Operations',
      //       url: '/dashboard/admin/data-management/bulk',
      //       icon: 'layers',
      //       roles: ['admin', 'superladmin']
      //     },
      //     {
      //       title: 'Data Migration',
      //       url: '/dashboard/admin/data-management/migration',
      //       icon: 'arrowRight',
      //       roles: ['superadmin']
      //     },
      //     {
      //       title: 'System Reports',
      //       url: '/dashboard/admin/data-management/reports',
      //       icon: 'fileBarChart',
      //       roles: ['admin', 'superadmin']
      //     }
      //   ]
      // }
    ]
  }
];

export function getNavigationForUser(user: AuthUser): NavItem[] {
  const role = user.role ?? "accountant";
  return filterNavItemsByRole(ALL_NAV_ITEMS, role) as NavItem[];
}

function filterNavItemsByRole(items: RoleNavItem[], userRole: string): RoleNavItem[] {
  return items
    .filter(item => item.roles.includes(userRole))
    .map(item => ({
      ...item,
      items: item.items ? filterNavItemsByRole(item.items, userRole) : []
    })) as RoleNavItem[];
}

// Enhanced permission-based filtering with facility and project scoping
export function getNavigationWithPermissions(
  user: AuthUser,
  permissions: string[],
  userFacility?: { id: number; facilityType: string },
  userProjects?: number[]
): NavItem[] {
  const roleBasedNav = getNavigationForUser(user);

  // Apply additional permission and scope-based filtering
  return roleBasedNav.map(item => {
    // Apply facility-specific filtering for accountants
    if (user.role === 'accountant' && userFacility) {
      // Customize navigation based on facility type
      if (userFacility.facilityType === 'health_center') {
        // Health centers might have different form schemas/activities
        // This could filter out hospital-specific items
      }
    }

    // Apply project-specific filtering for program managers
    if (user.role === 'program_manager' && userProjects) {
      // Filter project-related items based on assigned projects
    }

    return item;
  });
}

// Utility function to get navigation with dynamic schema awareness
export function getSchemaAwareNavigation(
  user: AuthUser,
  availableSchemas: string[] = [], // Form schema types available to user
  userConfig: {
    facilityType?: 'hospital' | 'health_center';
    projectTypes?: ('HIV' | 'Malaria' | 'TB')[];
    permissions?: string[];
  } = {}
): NavItem[] {
  const baseNav = getNavigationForUser(user);

  // Customize navigation based on available schemas and user context
  return baseNav.map(item => {
    // Add dynamic badges or modify items based on schema availability
    if (item.title === 'Budget Planning' && availableSchemas.includes('planning')) {
      // Could add a badge showing number of available planning schemas
    }

    if (item.title === 'Budget Execution' && availableSchemas.includes('execution')) {
      // Could add status indicators for pending executions
    }

    return item;
  });
}
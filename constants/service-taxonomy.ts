export type ServiceCategoryGroup = {
  name: string;
  icon_name: string;
  subcategories: string[];
};

export const SERVICE_TAXONOMY: ServiceCategoryGroup[] = [
  {
    name: 'Home Maintenance & Repair',
    icon_name: 'construct-outline',
    subcategories: ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Other'],
  },
  {
    name: 'Beauty, Wellness & Personal Care',
    icon_name: 'sparkles-outline',
    subcategories: ['Hair Styling', 'Makeup Artist', 'Massage Therapy', 'Nails', 'Other'],
  },
  {
    name: 'Education & Professional Services',
    icon_name: 'school-outline',
    subcategories: ['Academic Tutor', 'Language Teacher', 'Music Lessons', 'Other'],
  },
  {
    name: 'Domestic & Cleaning Services',
    icon_name: 'home-outline',
    subcategories: ['House Cleaning', 'Laundry', 'Ironing', 'Deep Cleaning', 'Other'],
  },
  {
    name: 'Pet Services',
    icon_name: 'paw-outline',
    subcategories: ['Grooming', 'Walking', 'Training', 'Sitting'],
  },
  {
    name: 'Events & Entertainment',
    icon_name: 'camera-outline',
    subcategories: ['Photography', 'DJ', 'Host', 'Catering'],
  },
  {
    name: 'Automotive & Tech Support',
    icon_name: 'car-outline',
    subcategories: ['Car Wash', 'Mechanic', 'Computer Repair', 'Mobile Repair'],
  },
];

export const TOP_LEVEL_CATEGORY_ITEMS = SERVICE_TAXONOMY.map((group, index) => ({
  id: `top-${index + 1}`,
  name: group.name,
  icon_name: group.icon_name,
}));

export function findCategoryGroup(name: string) {
  return SERVICE_TAXONOMY.find((group) => group.name.toLowerCase() === name.trim().toLowerCase()) || null;
}

export function findParentCategoryForSubcategory(name: string) {
  const normalized = name.trim().toLowerCase();
  return (
    SERVICE_TAXONOMY.find((group) =>
      group.subcategories.some((sub) => sub.toLowerCase() === normalized)
    ) || null
  );
}

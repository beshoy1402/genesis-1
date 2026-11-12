export const roles = ['student', 'parent', 'teacher', 'admin', 'developer'] as const;
export type Role = (typeof roles)[number];

export const roleLabels: Record<Role, string> = {
  student: 'Student', parent: 'Parent', teacher: 'Teacher', admin: 'Administrator', developer: 'Developer',
};

export const roleRoutes: Record<Role, string> = {
  student: '/student', parent: '/parent', teacher: '/teacher', admin: '/admin', developer: '/developer',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && roles.includes(value as Role);
}

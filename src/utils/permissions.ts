import type { UserRole } from '../types/auth';

export function canApproveAttendees(role: UserRole): boolean {
  return role === 'admin' || role === 'manager';
}

export function canSendEmails(role: UserRole): boolean {
  return role === 'admin' || role === 'manager';
}

export function canEditAttendees(role: UserRole): boolean {
  return true;
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin';
}

export function canManageForumSettings(role: UserRole): boolean {
  return role === 'admin' || role === 'manager';
}

export function canDeleteAttendees(role: UserRole): boolean {
  return role === 'admin';
}

export function canManageForums(role: UserRole): boolean {
  return role === 'admin';
}

export function getRoleBadgeColor(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-800';
    case 'manager':
      return 'bg-blue-100 text-blue-800';
    case 'EADM':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

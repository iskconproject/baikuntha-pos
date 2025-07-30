import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { UserList } from '@/components/users/UserList';
import { authService } from '@/services/auth/authService';

export default async function UsersPage() {
  // Get current user from session
  const currentUser = await getSessionUser();
  
  if (!currentUser) {
    redirect('/login');
  }
  
  // Check if user has permission to view users
  if (!authService.hasPermission(currentUser.role, 'users:read')) {
    redirect('/dashboard');
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <UserList currentUserRole={currentUser.role} />
    </div>
  );
}
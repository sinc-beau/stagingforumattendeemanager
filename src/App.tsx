import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppHeader } from './components/AppHeader';
import { Login } from './pages/Login';
import { ForumList } from './components/ForumList';
import { ForumManagement } from './pages/ForumManagement';
import { UserManagement } from './pages/UserManagement';
import { Users } from 'lucide-react';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forum/:forumId"
          element={
            <ProtectedRoute>
              <ForumManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRoles={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

function HomePage() {
  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-600 p-3 rounded-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">
                Forum Management
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              View and manage forum events and attendees
            </p>
          </div>

          <ForumList />
        </div>
      </div>
    </>
  );
}

export default App;

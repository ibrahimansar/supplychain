import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const UnauthorizedPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div>
          <div className="mx-auto h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="heading-2 mb-1">Access Denied</h1>
          <p className="text-muted">You don't have permission to access this page.</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link to="/trees"><Button>Go to Family Tree</Button></Link>
          <Link to="/login"><Button variant="outline">Sign In</Button></Link>
        </div>
      </Card>
    </div>
  );
};

export default UnauthorizedPage;

import React from 'react';
import { Link } from 'react-router-dom';

const RegisterPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-2xl">N</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Registration Temporarily Unavailable
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Authentication is being reimplemented. Please check back later.
          </p>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> All features are currently accessible without authentication for development purposes.
          </p>
        </div>

        <div className="text-center">
          <Link
            to="/trees"
            className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            Go to Family Tree
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

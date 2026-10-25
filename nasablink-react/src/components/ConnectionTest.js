import React, { useState } from 'react';
import { API_BASE_URL } from '../config/env';

const ConnectionTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test, status, message) => {
    setTestResults(prev => [...prev, { test, status, message, timestamp: Date.now() }]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    // Test 1: Health endpoint
    try {
      addResult('Health Check', 'running', 'Testing backend health...');
      const response = await fetch(`${API_BASE_URL}/health`, { credentials: 'include' });
      const data = await response.json();
      addResult('Health Check', 'success', `Backend is healthy: ${data.message}`);
    } catch (error) {
      addResult('Health Check', 'error', `Health check failed: ${error.message}`);
    }

    // Test 2: Basic request from current origin (CORS)
    try {
      addResult('CORS Check', 'running', 'Testing CORS configuration...');
      const response = await fetch(`${API_BASE_URL}/health`, { credentials: 'include' });
      if (response.ok) {
        addResult('CORS Check', 'success', 'CORS is properly configured');
      } else {
        addResult('CORS Check', 'warning', `CORS response: ${response.status}`);
      }
    } catch (error) {
      addResult('CORS Check', 'error', `CORS error: ${error.message}`);
    }

    // Test 3: Auth endpoint
    try {
      addResult('Auth Endpoint', 'running', 'Testing auth endpoint...');
      console.log('🔍 Making auth request to:', `${API_BASE_URL}/auth/login`);
      console.log('🔍 Request body:', JSON.stringify({ email: 'test@nasablink.com', password: 'test123' }));
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'test@nasablink.com', password: 'test123' }),
        credentials: 'include',
      });
      
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response headers:', [...response.headers.entries()]);
      
      const responseText = await response.text();
      console.log('🔍 Response body (raw):', responseText);
      
      if (response.status === 200) {
        try {
          const authData = JSON.parse(responseText);
          addResult('Auth Endpoint', 'success', `Login successful! Token received: ${authData.token ? 'Yes' : 'No'}`);
        } catch (parseError) {
          addResult('Auth Endpoint', 'warning', `Status 200 but invalid JSON: ${responseText.substring(0, 100)}`);
        }
      } else if (response.status === 401) {
        addResult('Auth Endpoint', 'warning', `Authentication failed (401): ${responseText}`);
      } else if (response.status === 400) {
        addResult('Auth Endpoint', 'warning', `Bad request (400): ${responseText}`);
      } else if (response.status === 0) {
        addResult('Auth Endpoint', 'error', 'Network error - request may be blocked by CORS or backend not reachable');
      } else {
        addResult('Auth Endpoint', 'warning', `Unexpected status ${response.status}: ${responseText}`);
      }
    } catch (error) {
      console.error('🔍 Auth endpoint error details:', error);
      addResult('Auth Endpoint', 'error', `Network error: ${error.message}`);
    }

    setIsRunning(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'running': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'running': return '🔄';
      default: return '📋';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Backend Connection Test</h2>
      
      <button
        onClick={runTests}
        disabled={isRunning}
        className={`px-4 py-2 rounded font-medium ${
          isRunning 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isRunning ? 'Running Tests...' : 'Run Connection Tests'}
      </button>

      {testResults.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Test Results:</h3>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div key={index} className="border-s-4 border-gray-200 ps-4 py-2">
                <div className={`font-medium ${getStatusColor(result.status)}`}>
                  {getStatusIcon(result.status)} {result.test}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {result.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500">
        <p><strong>Backend URL:</strong> {API_BASE_URL}</p>
        <p><strong>Frontend URL:</strong> {typeof window !== 'undefined' ? window.location.origin : ''}</p>
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="font-semibold text-blue-800">Test Account Available:</p>
          <p className="text-blue-700">Email: test@nasablink.com</p>
          <p className="text-blue-700">Password: test123</p>
          <p className="text-blue-700">Role: Admin</p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionTest;

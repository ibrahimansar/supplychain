import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Lock, Zap } from 'lucide-react';

/**
 * API Documentation Page
 * 
 * Comprehensive documentation for the NasabLink public API.
 */
export default function APIDocumentation() {
  const [copiedEndpoint, setCopiedEndpoint] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    authentication: true,
    search: false,
    citations: false,
    webhooks: false,
    trees: false,
    persons: false,
  });
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(id);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };
  
  const baseUrl = window.location.origin;
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-emerald-600 dark:bg-emerald-700 text-white py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">NasabLink API Documentation</h1>
          <p className="mt-2 text-emerald-100">
            Build integrations with the NasabLink family tree platform
          </p>
          <div className="mt-4 flex gap-4">
            <span className="inline-flex items-center gap-1 text-sm bg-emerald-500 px-3 py-1 rounded-full">
              <Zap className="h-3 w-3" /> REST API
            </span>
            <span className="inline-flex items-center gap-1 text-sm bg-emerald-500 px-3 py-1 rounded-full">
              <Lock className="h-3 w-3" /> OAuth2 / JWT
            </span>
          </div>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <nav className="lg:col-span-1 space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
            <a href="#authentication" className="block text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400">
              Authentication
            </a>
            <a href="#search" className="block text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400">
              Search API
            </a>
            <a href="#webhooks" className="block text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400">
              Webhooks
            </a>
            <a href="#trees" className="block text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400">
              Trees API
            </a>
            <a href="#persons" className="block text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400">
              Persons API
            </a>
            <a href="#rate-limits" className="block text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400">
              Rate Limits
            </a>
            <a href="#errors" className="block text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400">
              Error Handling
            </a>
          </nav>
          
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Base URL */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Base URL</h2>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                <code className="flex-1 text-sm text-emerald-600 dark:text-emerald-400">
                  {baseUrl}/api
                </code>
                <button
                  onClick={() => copyToClipboard(`${baseUrl}/api`, 'base-url')}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                >
                  {copiedEndpoint === 'base-url' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Authentication Section */}
            <section id="authentication" className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <button
                onClick={() => toggleSection('authentication')}
                className="w-full flex items-center justify-between p-6 text-start"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Lock className="h-5 w-5 text-emerald-500" />
                    Authentication
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    JWT Bearer token authentication
                  </p>
                </div>
                {expandedSections.authentication ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {expandedSections.authentication && (
                <div className="px-6 pb-6 space-y-4">
                  <p className="text-gray-600 dark:text-gray-300">
                    All API requests require a valid JWT token in the Authorization header.
                  </p>
                  
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-100">
{`Authorization: Bearer <your-jwt-token>

# Example request
curl -X GET "${baseUrl}/api/trees" \\
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \\
  -H "Content-Type: application/json"`}
                    </pre>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Getting a Token</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Tokens are obtained through Firebase Authentication. Use the Firebase SDK to authenticate 
                      and retrieve an ID token for API requests.
                    </p>
                  </div>
                </div>
              )}
            </section>
            
            {/* Search API Section */}
            <section id="search" className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <button
                onClick={() => toggleSection('search')}
                className="w-full flex items-center justify-between p-6 text-start"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Search API</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Advanced search and filtering endpoints
                  </p>
                </div>
                {expandedSections.search ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {expandedSections.search && (
                <div className="px-6 pb-6 space-y-6">
                  <EndpointDoc
                    method="GET"
                    endpoint="/search/tree/{treeId}/advanced"
                    description="Advanced search with filters"
                    params={[
                      { name: 'query', type: 'string', required: false, description: 'Search query text' },
                      { name: 'generation', type: 'integer', required: false, description: 'Filter by generation number' },
                      { name: 'gender', type: 'string', required: false, description: 'Filter by gender (male/female)' },
                      { name: 'location', type: 'string', required: false, description: 'Filter by location' },
                      { name: 'dateFrom', type: 'date', required: false, description: 'Born after date' },
                      { name: 'dateTo', type: 'date', required: false, description: 'Born before date' },
                      { name: 'alive', type: 'string', required: false, description: 'living/deceased/all' },
                      { name: 'page', type: 'integer', required: false, description: 'Page number (0-based)' },
                      { name: 'size', type: 'integer', required: false, description: 'Results per page (max 100)' },
                    ]}
                    response={`{
  "results": [...],
  "totalCount": 150,
  "page": 0,
  "totalPages": 8,
  "query": "search term",
  "appliedFilters": {...}
}`}
                    onCopy={copyToClipboard}
                    copiedEndpoint={copiedEndpoint}
                  />
                  
                  <EndpointDoc
                    method="GET"
                    endpoint="/search/tree/{treeId}/timeline"
                    description="Get family timeline of events"
                    params={[
                      { name: 'startYear', type: 'integer', required: false, description: 'Start year filter' },
                      { name: 'endYear', type: 'integer', required: false, description: 'End year filter' },
                    ]}
                    response={`[
  {
    "type": "birth",
    "date": "1980-05-15",
    "year": 1980,
    "personId": "...",
    "personName": "John Doe",
    "description": "John was born"
  },
  ...
]`}
                    onCopy={copyToClipboard}
                    copiedEndpoint={copiedEndpoint}
                  />
                  
                  <EndpointDoc
                    method="GET"
                    endpoint="/search/tree/{treeId}/statistics"
                    description="Get tree statistics"
                    response={`{
  "totalMembers": 250,
  "genderDistribution": { "male": 120, "female": 130 },
  "livingCount": 180,
  "deceasedCount": 70,
  "generationDistribution": { "0": 1, "1": 4, "2": 15 },
  "topLocations": { "Cairo": 50, "Alexandria": 30 }
}`}
                    onCopy={copyToClipboard}
                    copiedEndpoint={copiedEndpoint}
                  />
                </div>
              )}
            </section>
            
            {/* Citations API Section */}
            <section id="citations" className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <button
                onClick={() => toggleSection('citations')}
                className="w-full flex items-center justify-between p-6 text-start"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Citations API</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Link documents as evidence to person facts and life events
                  </p>
                </div>
                {expandedSections.citations ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {expandedSections.citations && (
                <div className="px-6 pb-6 space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Citation Model</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                      Citations link a document to a person with optional event and field-level detail. Each citation has a confidence level.
                    </p>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• <strong>Event types:</strong> BIRTH, DEATH, MARRIAGE, IMMIGRATION, RESIDENCE, OCCUPATION, EDUCATION, MILITARY, RELIGION, OTHER</li>
                      <li>• <strong>Confidence:</strong> PRIMARY (original source), SECONDARY (derivative), UNVERIFIED</li>
                      <li>• <strong>Field names:</strong> name, arabicName, birthYear, deathYear, gender, title, description, notes</li>
                    </ul>
                  </div>

                  <EndpointDoc
                    method="GET"
                    endpoint="/trees/{treeId}/citations/person/{personId}"
                    description="Get all citations for a person"
                    response={`[
  {
    "id": "uuid",
    "documentId": "uuid",
    "documentName": "Birth Certificate",
    "personId": "uuid",
    "personName": "John Doe",
    "citationType": "BIRTH",
    "fieldName": "birthYear",
    "referenceDetail": "Page 1",
    "confidence": "PRIMARY",
    "notes": "Official government record"
  }
]`}
                    onCopy={copyToClipboard}
                    copiedEndpoint={copiedEndpoint}
                  />

                  <EndpointDoc
                    method="POST"
                    endpoint="/trees/{treeId}/citations"
                    description="Create a new citation"
                    body={`{
  "documentId": "uuid",
  "personId": "uuid",
  "citationType": "BIRTH",
  "fieldName": "birthYear",
  "referenceDetail": "Page 1, entry 5",
  "confidence": "PRIMARY",
  "notes": "Original birth certificate"
}`}
                    response={`{
  "id": "uuid",
  "documentId": "uuid",
  "documentName": "Birth Certificate",
  ...
}`}
                    onCopy={copyToClipboard}
                    copiedEndpoint={copiedEndpoint}
                  />

                  <EndpointDoc
                    method="DELETE"
                    endpoint="/trees/{treeId}/citations/{citationId}"
                    description="Remove a citation"
                    response={`204 No Content`}
                    onCopy={copyToClipboard}
                    copiedEndpoint={copiedEndpoint}
                  />
                </div>
              )}
            </section>

            {/* Webhooks Section */}
            <section id="webhooks" className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <button
                onClick={() => toggleSection('webhooks')}
                className="w-full flex items-center justify-between p-6 text-start"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Webhooks</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Real-time event notifications
                  </p>
                </div>
                {expandedSections.webhooks ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {expandedSections.webhooks && (
                <div className="px-6 pb-6 space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Webhook Events</h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• <code>PERSON_CREATED</code> - New person added</li>
                      <li>• <code>PERSON_UPDATED</code> - Person info updated</li>
                      <li>• <code>PERSON_DELETED</code> - Person removed</li>
                      <li>• <code>TREE_SHARED</code> - Tree shared with someone</li>
                      <li>• <code>MEMBER_INVITED</code> - New member invited</li>
                      <li>• <code>DOCUMENT_UPLOADED</code> - Document added</li>
                      <li>• <code>CITATION_CREATED</code> - Citation linking document to person</li>
                    </ul>
                  </div>
                  
                  <EndpointDoc
                    method="POST"
                    endpoint="/api/webhooks/tree/{treeId}"
                    description="Register a new webhook"
                    body={`{
  "url": "https://your-server.com/webhook",
  "events": ["PERSON_CREATED", "PERSON_UPDATED"]
}`}
                    response={`{
  "success": true,
  "webhook": {
    "id": "webhook-id",
    "secret": "webhook-secret-save-this",
    ...
  }
}`}
                    onCopy={copyToClipboard}
                    copiedEndpoint={copiedEndpoint}
                  />
                  
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Webhook Payload</h4>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-sm text-gray-100">
{`{
  "id": "event-uuid",
  "type": "PERSON_UPDATED",
  "treeId": "tree-uuid",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "personId": "person-uuid",
    "personName": "John Doe",
    "changes": { "birthPlace": "Cairo" }
  }
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Signature Verification</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      All webhook requests include an <code>X-Webhook-Signature</code> header with an HMAC-SHA256 signature.
                    </p>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-sm text-gray-100">
{`const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </section>
            
            {/* Rate Limits Section */}
            <section id="rate-limits" className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rate Limits</h2>
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  API requests are rate limited to ensure fair usage:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-24 font-medium">Standard:</span>
                    100 requests per minute
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-24 font-medium">Search:</span>
                    30 requests per minute
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-24 font-medium">Webhooks:</span>
                    10 registrations per hour
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Rate limit headers are included in all responses:
                    <code className="ms-2">X-RateLimit-Remaining</code>,
                    <code className="ms-2">X-RateLimit-Reset</code>
                  </p>
                </div>
              </div>
            </section>
            
            {/* Error Handling Section */}
            <section id="errors" className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Error Handling</h2>
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  All errors follow a consistent format:
                </p>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-gray-100">
{`{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z"
}`}
                  </pre>
                </div>
                
                <h4 className="font-medium text-gray-900 dark:text-white mt-4">HTTP Status Codes</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-start border-b border-gray-200 dark:border-gray-700">
                        <th className="py-2 pe-4 font-medium text-gray-900 dark:text-white">Code</th>
                        <th className="py-2 font-medium text-gray-900 dark:text-white">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600 dark:text-gray-300">
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 pe-4 font-mono">200</td>
                        <td>Success</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 pe-4 font-mono">400</td>
                        <td>Bad Request - Invalid parameters</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 pe-4 font-mono">401</td>
                        <td>Unauthorized - Invalid or missing token</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 pe-4 font-mono">403</td>
                        <td>Forbidden - Insufficient permissions</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 pe-4 font-mono">404</td>
                        <td>Not Found - Resource doesn't exist</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 pe-4 font-mono">429</td>
                        <td>Too Many Requests - Rate limit exceeded</td>
                      </tr>
                      <tr>
                        <td className="py-2 pe-4 font-mono">500</td>
                        <td>Internal Server Error</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Endpoint Documentation Component
 */
function EndpointDoc({ method, endpoint, description, params, body, response, onCopy, copiedEndpoint }) {
  const methodColors = {
    GET: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    POST: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    PUT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  
  const endpointId = `${method}-${endpoint}`;
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900">
        <span className={`px-2 py-1 text-xs font-bold rounded ${methodColors[method]}`}>
          {method}
        </span>
        <code className="flex-1 text-sm text-gray-700 dark:text-gray-300">{endpoint}</code>
        <button
          onClick={() => onCopy(endpoint, endpointId)}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        >
          {copiedEndpoint === endpointId ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
        
        {params && params.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Parameters</h5>
            <div className="space-y-2">
              {params.map((param, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <code className="text-emerald-600 dark:text-emerald-400">{param.name}</code>
                  <span className="text-gray-400">({param.type})</span>
                  {param.required && <span className="text-red-500 text-xs">required</span>}
                  <span className="text-gray-500 dark:text-gray-400">- {param.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {body && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Request Body</h5>
            <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
              <pre className="text-xs text-gray-100">{body}</pre>
            </div>
          </div>
        )}
        
        {response && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Response</h5>
            <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
              <pre className="text-xs text-gray-100">{response}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

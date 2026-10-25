import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, ChevronDown, ChevronRight, Zap, Globe, Lock, Terminal, BookOpen, Cpu } from 'lucide-react';
import Logo from '../components/Logo';

const BASE_URL = 'https://nasablinkapi.misbahi.in/api';
const SSE_URL = `${BASE_URL}/mcp/sse`;

// ─── Tool definitions mirroring the server ───────────────────────────────────
const PUBLIC_TOOLS = [
  {
    name: 'explore_family_trees',
    description: 'Search public family trees on NasabLink by name, description, or region.',
    params: [
      { name: 'query', type: 'string', required: false, desc: 'Search query — matches tree name, description, or region' },
      { name: 'region', type: 'string', required: false, desc: 'Filter by region (e.g. "Arabia", "South Asia", "Europe")' },
    ],
    example: `Ask Claude: "Search NasabLink for family trees from Arabia"`,
  },
  {
    name: 'get_featured_trees',
    description: 'Get a list of featured public family trees on NasabLink.',
    params: [],
    example: `Ask Claude: "Show me featured family trees on NasabLink"`,
  },
  {
    name: 'get_public_tree_details',
    description: 'Get details of a specific public family tree including people count, region, and description.',
    params: [
      { name: 'treeId', type: 'string', required: true, desc: 'Numeric ID of the family tree' },
    ],
    example: `Ask Claude: "Get details for NasabLink tree ID 15"`,
  },
];

const AUTH_TOOLS = [
  {
    name: 'list_my_trees',
    description: "List all family trees belonging to the authenticated user.",
    params: [
      { name: 'firebaseToken', type: 'string', required: true, desc: 'Firebase ID token (get from your NasabLink session)' },
    ],
    example: `Ask Claude: "List my NasabLink family trees" (after providing your token)`,
  },
  {
    name: 'get_tree_content',
    description: 'Get the full content of a family tree — all people and relationships.',
    params: [
      { name: 'firebaseToken', type: 'string', required: true, desc: 'Firebase ID token' },
      { name: 'treeId', type: 'string', required: true, desc: 'Numeric ID of the family tree' },
    ],
    example: `Ask Claude: "Show me everyone in my tree with ID 3"`,
  },
  {
    name: 'search_people',
    description: 'Search for people by name within a family tree.',
    params: [
      { name: 'firebaseToken', type: 'string', required: true, desc: 'Firebase ID token' },
      { name: 'treeId', type: 'string', required: true, desc: 'Numeric ID of the family tree' },
      { name: 'query', type: 'string', required: true, desc: 'Name to search for (partial match, case-insensitive)' },
    ],
    example: `Ask Claude: "Search for people named Ahmad in tree 3"`,
  },
  {
    name: 'get_person_details',
    description: 'Get full details of a person including their parents, children, and spouses.',
    params: [
      { name: 'firebaseToken', type: 'string', required: true, desc: 'Firebase ID token' },
      { name: 'treeId', type: 'string', required: true, desc: 'Numeric ID of the family tree' },
      { name: 'personId', type: 'string', required: true, desc: 'UUID of the person' },
    ],
    example: `Ask Claude: "Tell me about person <uuid> in tree 3"`,
  },
  {
    name: 'add_person_to_tree',
    description: 'Add a new person to a family tree. Requires Admin role or tree ownership.',
    params: [
      { name: 'firebaseToken', type: 'string', required: true, desc: 'Firebase ID token' },
      { name: 'treeId', type: 'string', required: true, desc: 'Numeric ID of the family tree' },
      { name: 'name', type: 'string', required: true, desc: 'Full name of the person' },
      { name: 'gender', type: 'string', required: true, desc: '"MALE" or "FEMALE"' },
      { name: 'arabicName', type: 'string', required: false, desc: 'Arabic name (optional)' },
      { name: 'birthYear', type: 'integer', required: false, desc: 'Birth year (optional)' },
      { name: 'deathYear', type: 'integer', required: false, desc: 'Death year, omit if alive' },
      { name: 'description', type: 'string', required: false, desc: 'Short biography (optional)' },
    ],
    example: `Ask Claude: "Add Ali ibn Abi Talib, born 599, to tree 3"`,
  },
  {
    name: 'add_relationship',
    description: 'Add a PARENT_CHILD or SPOUSE relationship between two people. Requires Admin role.',
    params: [
      { name: 'firebaseToken', type: 'string', required: true, desc: 'Firebase ID token' },
      { name: 'treeId', type: 'string', required: true, desc: 'Numeric ID of the family tree' },
      { name: 'person1Id', type: 'string', required: true, desc: 'UUID of the first person (parent if PARENT_CHILD)' },
      { name: 'person2Id', type: 'string', required: true, desc: 'UUID of the second person (child if PARENT_CHILD)' },
      { name: 'type', type: 'string', required: true, desc: '"PARENT_CHILD" or "SPOUSE"' },
    ],
    example: `Ask Claude: "Make person <uuid-a> the parent of person <uuid-b> in tree 3"`,
  },
];

const CLAUDE_DESKTOP_CONFIG = `{
  "mcpServers": {
    "nasablink": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "${SSE_URL}"
      ]
    }
  }
}`;

// ─── Components ───────────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ParamRow({ param }) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <td className="py-2 pe-4 align-top">
        <code className="text-xs font-mono text-violet-700 dark:text-violet-300">{param.name}</code>
        {param.required && (
          <span className="ms-1 text-xs text-red-500">*</span>
        )}
      </td>
      <td className="py-2 pe-4 align-top">
        <span className="text-xs text-gray-400 font-mono">{param.type}</span>
      </td>
      <td className="py-2 align-top text-sm text-gray-600 dark:text-gray-400">{param.desc}</td>
    </tr>
  );
}

function ToolCard({ tool, isAuth }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-start"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`flex-none w-2 h-2 rounded-full ${isAuth ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          <code className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{tool.name}</code>
          <span className="hidden sm:block text-sm text-gray-500 dark:text-gray-400 truncate">{tool.description}</span>
        </div>
        <div className="flex items-center gap-2 flex-none ms-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isAuth ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'}`}>
            {isAuth ? 'Auth required' : 'Public'}
          </span>
          {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 bg-gray-50/50 dark:bg-gray-900/60 border-t border-gray-100 dark:border-gray-800">
          <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">{tool.description}</p>

          {tool.params.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Parameters</p>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {tool.params.map(p => <ParamRow key={p.name} param={p} />)}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-1">* required</p>
            </div>
          )}

          <div className="mt-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-start justify-between gap-3">
            <p className="text-xs text-gray-600 dark:text-gray-300 font-mono">{tool.example}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MCPPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-violet-200 hover:text-white mb-6 group">
            <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <Logo size={36} className="rounded-xl opacity-90" />
            <span className="text-sm font-medium text-violet-200">NasabLink</span>
            <span className="text-violet-400">/</span>
            <span className="text-sm font-medium text-violet-200">MCP Integration</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Model Context Protocol</h1>
          <p className="mt-3 text-lg text-violet-100 max-w-2xl">
            Connect AI assistants like Claude directly to your family tree data. Ask questions, explore lineages, and manage records using natural language.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Cpu className="h-3.5 w-3.5" /> 9 tools available
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Globe className="h-3.5 w-3.5" /> SSE transport (HTTP)
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Lock className="h-3.5 w-3.5" /> Per-tool Firebase auth
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">

          {/* Sidebar */}
          <nav className="lg:col-span-1">
            <div className="sticky top-6 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">On this page</p>
              {[
                ['#what-is-mcp', 'What is MCP?'],
                ['#connect', 'Connecting Claude'],
                ['#public-tools', 'Public Tools'],
                ['#auth-tools', 'Authenticated Tools'],
                ['#auth-guide', 'Getting a Token'],
                ['#examples', 'Example Prompts'],
              ].map(([href, label]) => (
                <a key={href} href={href} className="block text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 py-0.5 transition-colors">
                  {label}
                </a>
              ))}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4 space-y-1">
                <Link to="/api-docs" className="block text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400">
                  REST API Docs →
                </Link>
                <Link to="/explore" className="block text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400">
                  Explore Trees →
                </Link>
              </div>
            </div>
          </nav>

          {/* Content */}
          <div className="lg:col-span-3 space-y-14">

            {/* What is MCP */}
            <section id="what-is-mcp">
              <h2 className="text-2xl font-bold mb-4">What is MCP?</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                The <strong className="text-gray-900 dark:text-white">Model Context Protocol (MCP)</strong> is an open standard by Anthropic that lets AI assistants like Claude securely call external tools and read data from applications. With NasabLink's MCP server, you can ask Claude to browse public family trees, search for people, or even build new trees — all through natural conversation.
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: Globe, title: 'Explore Trees', desc: 'Browse public family trees without any login' },
                  { icon: BookOpen, title: 'Manage Records', desc: 'Add people and relationships through conversation' },
                  { icon: Zap, title: 'Ask Questions', desc: 'Get AI-powered insights about lineage and ancestry' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <Icon className="h-5 w-5 text-violet-500 mb-2" />
                    <p className="font-semibold text-sm mb-1">{title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Connecting */}
            <section id="connect">
              <h2 className="text-2xl font-bold mb-4">Connecting Claude Desktop</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Add the following to your <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">claude_desktop_config.json</code> file. On macOS it lives at <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">~/Library/Application Support/Claude/claude_desktop_config.json</code>.
              </p>
              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-mono text-gray-500">claude_desktop_config.json</span>
                  </div>
                  <CopyButton text={CLAUDE_DESKTOP_CONFIG} />
                </div>
                <pre className="p-4 bg-gray-900 text-gray-100 text-sm font-mono overflow-x-auto whitespace-pre leading-relaxed">
                  {CLAUDE_DESKTOP_CONFIG}
                </pre>
              </div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                This uses <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">mcp-remote</code> to bridge Claude Desktop to the SSE endpoint. Restart Claude Desktop after saving.
              </p>

              <div className="mt-6 p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                <p className="text-sm font-semibold text-violet-900 dark:text-violet-200 mb-1">SSE Endpoint</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-violet-700 dark:text-violet-300 break-all">{SSE_URL}</code>
                  <CopyButton text={SSE_URL} />
                </div>
              </div>
            </section>

            {/* Public Tools */}
            <section id="public-tools">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold">Public Tools</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">No auth required</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-5">
                These tools work without any login. Anyone can explore public family trees on NasabLink.
              </p>
              <div className="space-y-3">
                {PUBLIC_TOOLS.map(tool => <ToolCard key={tool.name} tool={tool} isAuth={false} />)}
              </div>
            </section>

            {/* Authenticated Tools */}
            <section id="auth-tools">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold">Authenticated Tools</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium">Firebase token required</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-5">
                These tools operate on your private trees. Pass your Firebase ID token as the <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">firebaseToken</code> parameter (see below on how to get it).
              </p>
              <div className="space-y-3">
                {AUTH_TOOLS.map(tool => <ToolCard key={tool.name} tool={tool} isAuth={true} />)}
              </div>
            </section>

            {/* Getting a Token */}
            <section id="auth-guide">
              <h2 className="text-2xl font-bold mb-4">Getting Your Firebase Token</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Open your NasabLink session in the browser, then run this in the browser console to get a short-lived ID token:
              </p>
              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-mono text-gray-500">Browser Console</span>
                  <CopyButton text={`import { getAuth } from 'firebase/auth';\nconst token = await getAuth().currentUser.getIdToken();\nconsole.log(token);`} />
                </div>
                <pre className="p-4 bg-gray-900 text-gray-100 text-sm font-mono overflow-x-auto">{`import { getAuth } from 'firebase/auth';
const token = await getAuth().currentUser.getIdToken();
console.log(token);`}</pre>
              </div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Tokens expire after 1 hour. Call <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">getIdToken(true)</code> to force-refresh.
              </p>
            </section>

            {/* Example Prompts */}
            <section id="examples">
              <h2 className="text-2xl font-bold mb-4">Example Prompts</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-5">
                Once connected, try these prompts with Claude:
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Explore public trees', prompt: 'Search NasabLink for family trees from the Arabian Peninsula' },
                  { label: 'Browse a specific tree', prompt: 'Get details for NasabLink tree ID 15 and tell me how many people are in it' },
                  { label: 'List your trees', prompt: 'List my NasabLink trees and tell me which ones have the most people [firebaseToken: <your-token>]' },
                  { label: 'Search within a tree', prompt: 'Search for people named Fatima in my NasabLink tree 3 [firebaseToken: <your-token>]' },
                  { label: 'Get person details', prompt: 'Tell me about person <uuid> in tree 3 including their parents and children [firebaseToken: <your-token>]' },
                  { label: 'Add a person', prompt: 'Add Zaynab bint Ali, female, born 625 CE, to my tree 3 [firebaseToken: <your-token>]' },
                  { label: 'Add a relationship', prompt: 'Make person <uuid-a> the parent of person <uuid-b> in tree 3 [firebaseToken: <your-token>]' },
                ].map(({ label, prompt }) => (
                  <div key={label} className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
                      <CopyButton text={prompt} />
                    </div>
                    <p className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">{prompt}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Footer links */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
              <Link to="/" className="hover:text-violet-600 dark:hover:text-violet-400">← Home</Link>
              <Link to="/api-docs" className="hover:text-violet-600 dark:hover:text-violet-400">REST API Docs</Link>
              <Link to="/explore" className="hover:text-violet-600 dark:hover:text-violet-400">Explore Trees</Link>
              <Link to="/help" className="hover:text-violet-600 dark:hover:text-violet-400">Help & FAQ</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Users,
  TreePine,
  Settings,
  ChevronRight,
  CheckCircle,
  ArrowLeft,
  Home,
  UserPlus,
  Share,
  Shield
} from 'lucide-react';

const TutorialPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = [
    {
      title: "Welcome to NasabLink!",
      description: "Learn how to create, manage, and share your family tree in just a few simple steps.",
      icon: BookOpen,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            NasabLink helps you build and maintain your family tree digitally. This tutorial will guide you through:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ms-4">
            <li>Creating your first family tree</li>
            <li>Adding and editing family members</li>
            <li>Managing tree permissions</li>
            <li>Sharing your tree with others</li>
          </ul>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-blue-800 dark:text-blue-300 text-sm">
              <strong>Tip:</strong> You can always return to this tutorial from the help menu in any tree.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Step 1: Create Your First Tree",
      description: "Start by creating a new family tree for your family.",
      icon: Plus,
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2 dark:text-white">How to create a tree:</h4>
            <ol className="list-decimal list-inside space-y-1 text-gray-700 text-sm dark:text-gray-300">
              <li>Go to your dashboard (after logging in)</li>
              <li>Click the "Create New Tree" button</li>
              <li>Give your tree a meaningful name (e.g., "Smith Family Tree")</li>
              <li>Click "Create" to initialize your tree</li>
            </ol>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
              <h5 className="font-medium text-gray-900 mb-2 dark:text-white">What happens next?</h5>
              <p className="text-sm text-gray-600">
                A default root node will be created with the name "Click Edit Icon - Family Head".
                This is your starting point for building the family tree.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
              <h5 className="font-medium text-gray-900 mb-2 dark:text-white">Tree Ownership</h5>
              <p className="text-sm text-gray-600">
                As the creator, you automatically become the tree owner with full admin privileges.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Step 2: Edit the Root Node",
      description: "Customize the root node with your family head's information.",
      icon: Edit3,
      content: (
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start">
              <Edit3 className="h-5 w-5 text-yellow-600 mt-0.5 me-3 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">Important First Step</h4>
                <p className="text-yellow-800 text-sm">
                  The root node starts with "Click Edit Icon - Family Head". Click the edit icon to edit and enter your family head's actual name.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
              <h5 className="font-medium text-gray-900 mb-2 dark:text-white">What to edit:</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Full name</li>
                <li>• Arabic name (if applicable)</li>
                <li>• Birth/death years</li>
                <li>• Title or nickname</li>
                <li>• Description and notes</li>
              </ul>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
              <h5 className="font-medium text-gray-900 mb-2 dark:text-white">How to edit:</h5>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Click the edit icon</li>
                <li>Fill in the information</li>
                <li>Click "Save" or press Enter</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Step 3: Add Family Members",
      description: "Build your family tree by adding descendants and spouses.",
      icon: UserPlus,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-4">
              <div className="flex items-center mb-3">
                <Plus className="h-5 w-5 text-green-600 me-2" />
                <h5 className="font-medium text-gray-900 dark:text-white">Add Descendants</h5>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Add children, grandchildren, and other descendants to any person in your tree.
              </p>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Hover over any person node</li>
                <li>Click the "+" button (Add Descendant)</li>
                <li>Fill in the child's information</li>
                <li>Click "Add Person"</li>
              </ol>
            </Card>

            <Card className="p-4">
              <div className="flex items-center mb-3">
                <Users className="h-5 w-5 text-blue-600 me-2" />
                <h5 className="font-medium text-gray-900 dark:text-white">Add Spouses</h5>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Connect spouses and partners to create complete family relationships.
              </p>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Hover over any person node</li>
                <li>Click the heart icon (Add Spouse)</li>
                <li>Enter spouse's information</li>
                <li>Click "Add Spouse"</li>
              </ol>
            </Card>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h5 className="font-medium text-green-900 mb-2">Pro Tips:</h5>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Start with immediate family members you know well</li>
              <li>• Add birth/death dates when available for historical accuracy</li>
              <li>• Use Arabic names for bilingual family trees</li>
              <li>• Add notes for important family stories or details</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "Step 4: Manage Tree Permissions",
      description: "Control who can view and edit your family tree.",
      icon: Shield,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 me-3 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Access the Admin Panel</h4>
                <p className="text-blue-800 text-sm">
                  As the tree owner, you'll see an "Admin Control" link in the navigation bar when viewing your tree.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h6 className="font-medium text-gray-900 mb-1 dark:text-white">Invite Members</h6>
              <p className="text-xs text-gray-600">
                Add family members or researchers with different permission levels
              </p>
            </Card>

            <Card className="p-4 text-center">
              <Share className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h6 className="font-medium text-gray-900 mb-1 dark:text-white">Create Viewer Links</h6>
              <p className="text-xs text-gray-600">
                Generate shareable links for people to view your tree without editing
              </p>
            </Card>

            <Card className="p-4 text-center">
              <Settings className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h6 className="font-medium text-gray-900 mb-1 dark:text-white">Manage Roles</h6>
              <p className="text-xs text-gray-600">
                Assign roles like Admin, Verifier, or Viewer to control permissions
              </p>
            </Card>
          </div>
        </div>
      )
    },
    {
      title: "Step 5: Share Your Tree",
      description: "Share your family tree with relatives and researchers.",
      icon: Share,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-4">
              <h5 className="font-medium text-gray-900 mb-3 dark:text-white">Public Sharing Options</h5>
              <div className="space-y-3">
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 me-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Viewer Links</p>
                    <p className="text-xs text-gray-600">Create time-limited links for specific people</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 me-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Direct Invitations</p>
                    <p className="text-xs text-gray-600">Invite specific people by email</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 me-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Role-Based Access</p>
                    <p className="text-xs text-gray-600">Give different permissions to different people</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h5 className="font-medium text-gray-900 mb-3 dark:text-white">Privacy Controls</h5>
              <div className="space-y-3">
                <div className="flex items-start">
                  <Shield className="h-4 w-4 text-blue-600 mt-0.5 me-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Granular Permissions</p>
                    <p className="text-xs text-gray-600">Control who can view, edit, or manage</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Shield className="h-4 w-4 text-blue-600 mt-0.5 me-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Link Expiration</p>
                    <p className="text-xs text-gray-600">Set expiration dates on shared links</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Shield className="h-4 w-4 text-blue-600 mt-0.5 me-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Activity Monitoring</p>
                    <p className="text-xs text-gray-600">Track who views and edits your tree</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )
    },
    {
      title: "Advanced Features",
      description: "Explore additional tools and features.",
      icon: Settings,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h5 className="font-medium text-gray-900 mb-2 dark:text-white">Tree Management</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Edit tree name and settings</li>
                <li>• View statistics and activity</li>
                <li>• Export or backup your data</li>
                <li>• Connect trees between families</li>
              </ul>
            </Card>

            <Card className="p-4">
              <h5 className="font-medium text-gray-900 mb-2 dark:text-white">Data Tools</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Search and filter family members</li>
                <li>• Generate reports and charts</li>
                <li>• Import data from other sources</li>
                <li>• Validate and clean data</li>
              </ul>
            </Card>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h5 className="font-medium text-purple-900 mb-2">Need Help?</h5>
            <p className="text-purple-800 text-sm">
              If you have questions or need assistance, contact our support team at{' '}
              <a href="mailto:nasablink@misbahi.zohodesk.com" className="underline hover:text-purple-900">
                nasablink@misbahi.zohodesk.com
              </a>
            </p>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex) => {
    setCurrentStep(stepIndex);
  };

  const finishTutorial = () => {
    navigate('/trees');
  };

  const currentTutorialStep = tutorialSteps[currentStep];
  const CurrentIcon = currentTutorialStep.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/trees"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors hover:dark:text-white"
              >
                <ArrowLeft className="h-5 w-5 me-2" />
                Back to Trees
              </Link>
            </div>
            <div className="text-end">
              <p className="text-sm text-gray-500">
                Step {currentStep + 1} of {tutorialSteps.length}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center space-x-2">
            {tutorialSteps.map((step, index) => (
              <React.Fragment key={index}>
                <button
                  onClick={() => goToStep(index)}
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    index <= currentStep
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </button>
                {index < tutorialSteps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      index < currentStep ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <Card className="p-8">
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
                <CurrentIcon className="h-8 w-8 text-primary-600" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 dark:text-white">
                {currentTutorialStep.title}
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                {currentTutorialStep.description}
              </p>
              <div className="prose prose-gray max-w-none">
                {currentTutorialStep.content}
              </div>
            </div>
          </div>
        </Card>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 me-2" />
            Previous
          </Button>

          <div className="flex items-center space-x-4">
            {currentStep === tutorialSteps.length - 1 ? (
              <Button
                onClick={finishTutorial}
                className="flex items-center"
              >
                <Home className="h-4 w-4 me-2" />
                Get Started
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                className="flex items-center"
              >
                Next
                <ChevronRight className="h-4 w-4 ms-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 dark:text-white">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/trees"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <TreePine className="h-6 w-6 text-green-600 me-3" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">View My Trees</p>
                <p className="text-sm text-gray-600">See all your family trees</p>
              </div>
            </Link>

            <Link
              to="/onboarding"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus className="h-6 w-6 text-blue-600 me-3" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Create New Tree</p>
                <p className="text-sm text-gray-600">Start a new family tree</p>
              </div>
            </Link>

            <a
              href="mailto:nasablink@misbahi.zohodesk.com"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <BookOpen className="h-6 w-6 text-purple-600 me-3" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Get Help</p>
                <p className="text-sm text-gray-600">Contact support</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialPage;
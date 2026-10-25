import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Logo from '../components/Logo';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <Logo size={48} className="rounded-xl shadow-lg" />
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Terms of Service
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Last updated: {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <Card className="p-8 mb-8">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              Welcome to NasabLink. These Terms of Service ("Terms") govern your access to and use of our family tree 
              management platform and services. By accessing or using NasabLink, you agree to be bound by these Terms.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                By creating an account or using NasabLink, you acknowledge that you have read, understood, and agree to be 
                bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not use our services.
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You must be at least 13 years of age to use NasabLink. If you are under 18, you represent that you have 
                your parent or guardian's permission to use the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Description of Service</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                NasabLink provides a platform for creating, managing, and sharing family trees. Our services include:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
                <li>Creating and editing family tree structures</li>
                <li>Storing family member information and records</li>
                <li>Collaborating with family members on shared trees</li>
                <li>Document storage and management (Plus plan)</li>
                <li>Sharing trees via viewer links</li>
                <li>Role-based access control</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. User Accounts</h2>
              
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">3.1 Account Creation</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                To use NasabLink, you must create an account using Google OAuth. You are responsible for maintaining 
                the confidentiality of your account and for all activities that occur under your account.
              </p>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">3.2 Account Responsibilities</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Acceptable Use</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You agree not to use NasabLink to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others, including privacy and intellectual property rights</li>
                <li>Upload or share content that is harmful, offensive, or inappropriate</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Interfere with or disrupt the service or servers</li>
                <li>Use the service for any commercial purpose without authorization</li>
                <li>Create false or misleading family relationships</li>
                <li>Harass, abuse, or harm other users</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. User Content</h2>
              
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">5.1 Ownership</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You retain ownership of all content you create or upload to NasabLink, including family tree data, 
                documents, and images. By using our service, you grant NasabLink a limited license to store, 
                display, and process your content as necessary to provide the service.
              </p>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">5.2 Responsibility</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You are solely responsible for the content you upload and share. You represent that you have the 
                necessary rights and permissions to share any content, especially when sharing information about 
                other family members.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Subscription Plans & Payments</h2>
              
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">6.1 Free Plan</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The Free plan provides basic family tree functionality with limitations on the number of trees, 
                family members, and collaborators.
              </p>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">6.2 Plus Plan</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The Plus plan offers enhanced features including document storage, advanced tree capabilities, 
                and higher limits. Subscription fees are billed on a recurring basis and are non-refundable 
                except as required by law.
              </p>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">6.3 Cancellation</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You may cancel your subscription at any time. Upon cancellation, you will retain access to 
                Plus features until the end of your current billing period, after which your account will 
                revert to the Free plan.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Privacy</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your privacy is important to us. Please review our <Link to="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">Privacy Policy</Link> to 
                understand how we collect, use, and protect your personal information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Intellectual Property</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                NasabLink and its original content, features, and functionality are owned by NasabLink and are 
                protected by international copyright, trademark, and other intellectual property laws. You may 
                not copy, modify, distribute, or create derivative works based on our platform without our 
                express written permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Termination</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We may terminate or suspend your account and access to the service immediately, without prior 
                notice, for conduct that we believe violates these Terms or is harmful to other users, us, 
                or third parties, or for any other reason at our sole discretion.
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You may delete your account at any time through the account settings. Upon deletion, your 
                personal data will be removed in accordance with our Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Disclaimer of Warranties</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                NasabLink is provided "as is" and "as available" without warranties of any kind, either express 
                or implied. We do not guarantee that the service will be uninterrupted, secure, or error-free. 
                We are not responsible for the accuracy or reliability of any information stored or shared 
                through the platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Limitation of Liability</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                To the maximum extent permitted by law, NasabLink shall not be liable for any indirect, incidental, 
                special, consequential, or punitive damages, including loss of data, profits, or goodwill, 
                arising from your use of the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">12. Changes to Terms</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We reserve the right to modify these Terms at any time. We will notify you of any material 
                changes by posting the new Terms on this page and updating the "Last updated" date. Your 
                continued use of the service after such modifications constitutes your acceptance of the 
                updated Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">13. Governing Law</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction 
                in which NasabLink operates, without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">14. Contact Us</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                If you have any questions about these Terms, please contact us at:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
                <li>Email: <a href="mailto:nasablink@misbahi.zohodesk.com" className="text-primary-600 dark:text-primary-400 hover:underline">nasablink@misbahi.zohodesk.com</a></li>
              </ul>
            </section>
          </div>
        </Card>

        {/* Back to Home */}
        <div className="text-center">
          <Link to="/">
            <Button variant="outline">
              ← Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;

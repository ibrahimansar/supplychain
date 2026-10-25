import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Logo from '../components/Logo';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <Logo size={48} className="rounded-xl shadow-lg" />
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Privacy Policy
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
              At NasabLink, we are committed to protecting your privacy and ensuring the security of your personal information.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our family tree
              management platform.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Information We Collect</h2>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">1.1 Personal Information</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We collect information you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
                <li>Name and email address (obtained through Google OAuth)</li>
                <li>Family tree data you create and manage</li>
                <li>Profile information and preferences</li>
                <li>Communication preferences</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">1.2 Usage Information</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We automatically collect certain information when you use our platform:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage patterns and feature interactions</li>
                <li>Log data and performance metrics</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
                <li><strong>Service Provision:</strong> To provide, maintain, and improve our family tree platform</li>
                <li><strong>Account Management:</strong> To create and manage your account and subscription</li>
                <li><strong>Communication:</strong> To send you important updates, notifications, and support messages</li>
                <li><strong>Security:</strong> To protect against fraud, abuse, and unauthorized access</li>
                <li><strong>Analytics:</strong> To understand usage patterns and improve our services</li>
                <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. Information Sharing and Disclosure</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties, except in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
                <li><strong>Service Providers:</strong> With trusted third-party service providers who assist in operating our platform</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> When you explicitly agree to the sharing of your information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Data Security</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access,
                alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication mechanisms</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and monitoring</li>
                <li>Secure data backup procedures</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Data Retention</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this
                Privacy Policy, unless a longer retention period is required by law. When we no longer need your information, we will securely
                delete or anonymize it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Your Rights and Choices</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Restriction:</strong> Request limitation of how we process your information</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-400 mt-4">
                To exercise these rights, please contact us using the information provided below.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Cookies and Tracking Technologies</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We use cookies and similar technologies to enhance your experience on our platform. You can control cookie settings
                through your browser preferences, though disabling certain cookies may affect platform functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Third-Party Services</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Our platform integrates with third-party services, including Google OAuth for authentication. These services have their own
                privacy policies, and we encourage you to review them. We are not responsible for the privacy practices of these third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. International Data Transfers</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your information may be transferred to and processed in countries other than your own. We ensure that such transfers
                comply with applicable data protection laws and implement appropriate safeguards.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Children's Privacy</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from
                children under 13. If we become aware that we have collected such information, we will take steps to delete it promptly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Changes to This Privacy Policy</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new
                Privacy Policy on this page and updating the "Last updated" date. Your continued use of our services after such changes
                constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">12. Contact Us</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Email:</strong> nasablink@misbahi.zohodesk.com
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  <strong>Subject:</strong> Privacy Policy Inquiry
                </p>
              </div>
            </section>
          </div>
        </Card>

        {/* Footer Actions */}
        <div className="text-center">
          <Link to="/login">
            <Button>
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
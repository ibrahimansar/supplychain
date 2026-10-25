import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="mt-auto border-t border-gray-100 dark:border-gray-800/60 bg-white dark:bg-gray-950 print-hide">
      <div className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-5 xl:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <p className="text-gray-400 dark:text-gray-500">
          © {new Date().getFullYear()} NasabLink. All rights reserved.
        </p>
        <div className="flex items-center gap-4 flex-wrap justify-center text-gray-500 dark:text-gray-400">
          <Link to="/help" className="hover:text-gray-900 dark:hover:text-white transition-colors">
            Help
          </Link>
          <Link to="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">
            Terms
          </Link>
          <a href="mailto:nasablink@misbahi.zohodesk.com" className="hover:text-gray-900 dark:hover:text-white transition-colors">
            Support
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


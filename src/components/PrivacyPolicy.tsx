import React from 'react';
import { X, Shield, Lock, Eye, Database, Trash2, Mail } from 'lucide-react';

interface PrivacyPolicyProps {
  onClose: () => void;
}

const sections = [
  {
    icon: <Database size={18} className="text-indigo-400" />,
    title: 'Data we collect',
    content: [
      'Account information: name and email address via Google Sign-In.',
      'Notes: title, content, attachments, and code editor content.',
      'Community data: posts you share, likes, follow/follower relationships, and profile picture.',
      'Technical data: timestamps for creating and updating notes.',
    ],
  },
  {
    icon: <Eye size={18} className="text-blue-400" />,
    title: 'How we use your data',
    content: [
      'Your notes are used exclusively to provide the service to you.',
      'Community posts you choose to share are visible to all logged-in users.',
      'We never sell, rent, or share your data with third parties for marketing purposes.',
      'Data is not used for profiling, advertising, or automated decision-making.',
    ],
  },
  {
    icon: <Lock size={18} className="text-green-400" />,
    title: 'Storage and security',
    content: [
      'All data is securely stored in Google Firebase (Firestore and Storage). Storage region depends on the Firebase project configuration.',
      'Communication always occurs via an encrypted HTTPS connection.',
      'Access to your data is protected by Firebase Security Rules — only you can read and write your own notes.',
      'Profile pictures and attachments are stored in Firebase Storage with per-user access control.',
    ],
  },
  {
    icon: <Shield size={18} className="text-purple-400" />,
    title: 'Your rights',
    content: [
      'Right to access: you can see all your data in the app at any time.',
      'Right to erasure: you can delete individual notes directly in the app. Contact us to delete your entire account.',
      'Right to portability: your notes can be manually copied and exported.',
      'Right to object: you can stop using the service at any time and request that your data be deleted.',
    ],
  },
  {
    icon: <Trash2 size={18} className="text-red-400" />,
    title: 'Data retention and deletion',
    content: [
      'Your notes are stored as long as your account is active.',
      'Community posts you share cannot be deleted by yourself — contact admin for removal.',
      'Upon account deletion, all your notes, files, and personal data are deleted within 30 days.',
    ],
  },
  {
    icon: <Mail size={18} className="text-amber-400" />,
    title: 'Contact',
    content: [
      'Have questions about your data or want to exercise your rights? Contact us at: bynrnworld@gmail.com',
      'We respond within 5 business days.',
    ],
  },
];

export default function PrivacyPolicy({ onClose }: PrivacyPolicyProps) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Shield size={16} className="text-indigo-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Privacy Policy</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">NexNote · Last updated: April 2026</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Intro */}
        <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-500/5 border-b border-indigo-100 dark:border-indigo-500/10">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            NexNote cares about your privacy. This policy explains what data we collect, how we use it, and what rights you have. We comply with GDPR and EU data protection legislation.
          </p>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {sections.map((section, i) => (
            <div key={i}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  {section.icon}
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{section.title}</h3>
              </div>
              <ul className="space-y-2 pl-9">
                {section.content.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-600 mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <p className="text-xs text-zinc-400">© 2026 NexNote. All rights reserved.</p>
          <button onClick={onClose} className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

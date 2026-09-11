import React from 'react';

function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-stone-500 dark:text-stone-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span className="font-semibold text-stone-900 dark:text-stone-100">eTakhzeen</span>
        <span>Thoughtful essentials, delivered simply.</span>
      </div>
    </footer>
  );
}

export default Footer;
import React from 'react'

function Hero() {
  return (
    <section className="border-b border-brand-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-24">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-500">Welcome to eTakhzeen</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">A calmer way to shop for what you need.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-gray-500 dark:text-gray-400 sm:text-lg">Discover dependable essentials, organized clearly and ready for your next order.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 dark:bg-brand-500 dark:hover:bg-brand-600 dark:focus:ring-brand-500 dark:focus:ring-offset-gray-950" href="/products">Browse products</a>
            <a className="rounded-md border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition-colors hover:border-brand-600 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-brand-500 dark:hover:text-brand-500 dark:focus:ring-brand-500 dark:focus:ring-offset-gray-950" href="/products/categories">Explore categories</a>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold text-brand-600 dark:text-brand-500">Shopping, simplified</p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-100">Find useful products without the noise.</p>
          <div className="mt-8 space-y-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-brand-600 dark:bg-brand-500" />Organized product collections</div>
            <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-500" />Reliable everyday value</div>
            <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-amber-600 dark:bg-amber-500" />A checkout built for clarity</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
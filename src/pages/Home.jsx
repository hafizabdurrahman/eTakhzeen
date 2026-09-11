import React from 'react'
import { Hero } from '../components'

function Home() {
  return (
    <div className="bg-white dark:bg-stone-950">
      <Hero />
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:px-8">
        {[
          ['Curated selection', 'Everyday products chosen for quality and value.'],
          ['Clear pricing', 'Straightforward prices with no unnecessary surprises.'],
          ['Helpful service', 'A dependable shopping experience from start to finish.'],
        ].map(([title, description]) => (
          <div key={title} className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">{description}</p>
          </div>
        ))}
      </section>
    </div>
  )
}

export default Home;
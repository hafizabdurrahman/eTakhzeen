import React from 'react'

function Input(props, ref) {
    const { className, name, type, label, ...rest } = props;
    return (
        <>
            <label className="mb-1.5 block text-sm font-medium capitalize text-stone-900 dark:text-stone-100" htmlFor={name}>
                {label || name}
            </label>
            <input
                type={type}
                id={name}
                name={name}
                ref={ref}
                className={`min-h-10 w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20 ${className || ''}`}
                {...rest}
            />
        </>
    )
}

export default React.forwardRef(Input)
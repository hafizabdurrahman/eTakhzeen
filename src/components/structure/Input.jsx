import React from 'react'

function Input(props, ref) {
    const {className, name, type} = props;
    return (
        <>
            <label htmlFor={name}>{name}:</label>
            <input type={type} id={name} ref={ref} className={`${className}`} {...props} />
        </>
    )
}

export default React.forwardRef(Input)
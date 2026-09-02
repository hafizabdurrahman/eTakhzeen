import React from 'react'

function Button(props){
  const { className, children } = props;
  return (
    <button className={`cursor-pointer bg-white text-black m-2 p-2 rounded-2xl ${className}`} {...props}>{children}</button>
  )
}

export default Button
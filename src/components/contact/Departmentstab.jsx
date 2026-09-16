// import React from 'react';

// // Must match the `department` enum values on your Conversations table.
// const DEPARTMENTS = [
//     { value: 'admin', label: 'Admin' },
//     { value: 'manager', label: 'Manager' },
//     { value: 'support', label: 'Support' },
//     { value: 'other', label: 'Other' },
// ];

// export default function DepartmentTabs({ value, onChange, includeAllOption = false }) {
//     return (
//         <div className="department-tabs">
//             {includeAllOption && (
//                 <button
//                     type="button"
//                     className={`department-tabs__item ${value === 'all' ? 'department-tabs__item--active' : ''}`}
//                     onClick={() => onChange('all')}
//                 >
//                     All
//                 </button>
//             )}
//             {DEPARTMENTS.map((dept) => (
//                 <button
//                     key={dept.value}
//                     type="button"
//                     className={`department-tabs__item ${value === dept.value ? 'department-tabs__item--active' : ''}`}
//                     onClick={() => onChange(dept.value)}
//                 >
//                     {dept.label}
//                 </button>
//             ))}
//         </div>
//     );
// }

import React from 'react'

function Departmentstab() {
  return (
    <div>Departmentstab</div>
  )
}

export default Departmentstab
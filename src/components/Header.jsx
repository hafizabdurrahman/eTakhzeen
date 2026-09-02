import React from 'react';
import { Link } from 'react-router';
import { useSelector } from 'react-redux';
import { Logout, NotificationBell } from '.'; // ⚠️ adjust path if Logout.jsx isn't a sibling of Header.jsx

function Header() {
    const status = useSelector((s) => s.user.status);
    const userData = useSelector((s) => s.user.userData);
    const isAdmin = userData?.labels?.includes('admin');

    return (
        <div>
            <ul className='text-blue-300'>
                <li>
                    <Link to="/">Home</Link>
                </li>
                <li>
                    <Link to="/contact">Contact</Link>
                </li>

                {!status ? (
                    <>
                        <li>
                            <Link to="/welcome-back">Login</Link>
                        </li>
                        <li>
                            <Link to="/create-account">Signup</Link>
                        </li>
                    </>
                ) : (
                    <li>
                        <Logout />
                    </li>
                )}

                {status && userData?.['$id'] && (
                    <>
                        <li>
                            <Link to={isAdmin ? '/admin' : `/user/${userData['$id']}`}>
                                {isAdmin ? 'Admin Dashboard' : 'My Profile'}
                            </Link>
                        </li>
                        <li>
                            <NotificationBell />
                        </li>
                    </>
                )}

                <li>
                    <Link to="/cart">Cart</Link>
                </li>
            </ul>
        </div>
    );
}

export default Header;
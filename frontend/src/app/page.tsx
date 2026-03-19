import { redirect } from 'next/navigation';

/**
 * Root route — redirects to /login.
 * Middleware will forward authenticated users to /operator automatically.
 */
export default function RootPage() {
    redirect('/login');
}
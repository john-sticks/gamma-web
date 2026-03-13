import { redirect } from 'next/navigation';

export default function Home() {
  // The middleware will handle redirecting to login if not authenticated
  // or to the appropriate dashboard if authenticated
  redirect('/login');
}

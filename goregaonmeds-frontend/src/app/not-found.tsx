//src/app/not-found.tsx
import Link from 'next/link';
export default function NotFound(){return <div className="container page"><div className="empty"><h1>We couldn’t find that page.</h1><p>Let’s get you back to familiar ground.</p><Link href="/" className="btn">Back to home</Link></div></div>}

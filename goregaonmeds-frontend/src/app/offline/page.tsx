import Link from 'next/link';
export default function Page(){return <div className="container page"><div className="empty"><h1>A little pause in the connection.</h1><p>You’re offline. Reconnect to see current availability, view your orders, or place a new order.</p><Link href="/" className="btn">Try again</Link></div></div>}

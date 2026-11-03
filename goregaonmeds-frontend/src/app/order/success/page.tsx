//src/app/order/success/page.tsx
import Link from 'next/link';
export default function Page(){return <div className="container page"><div className="empty"><h1>Check your order confirmation.</h1><p>Open your orders to see whether your request was received by the pharmacy.</p><Link href="/orders/" className="btn">View my orders</Link></div></div>}

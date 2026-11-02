import CartPage from '@/features/cart';
import {Suspense} from 'react';
import {Loading} from '@/components/ui';
export default function Page(){return <Suspense fallback={<Loading/>}><CartPage/></Suspense>}

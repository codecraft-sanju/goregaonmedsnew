import Checkout from '@/features/checkout';
import {Suspense} from 'react';
import {Loading} from '@/components/ui';
export default function Page(){return <Suspense fallback={<Loading/>}><Checkout/></Suspense>}

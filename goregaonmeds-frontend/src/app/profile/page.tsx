import { Profile } from '@/features/orders';
import {Suspense} from 'react';
import {Loading} from '@/components/ui';
export default function Page(){return <Suspense fallback={<Loading/>}><Profile/></Suspense>}

//src/app/login/page.tsx
import Login from '@/features/auth';
import {Suspense} from 'react';
import {Loading} from '@/components/ui';
export default function Page(){return <Suspense fallback={<Loading/>}><Login/></Suspense>}

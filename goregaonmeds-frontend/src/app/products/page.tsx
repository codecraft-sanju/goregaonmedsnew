import Catalog from '@/features/catalog';
import {Suspense} from 'react';
import {Loading} from '@/components/ui';
export default function Page(){return <Suspense fallback={<Loading/>}><Catalog/></Suspense>}

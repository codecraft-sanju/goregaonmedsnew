//goregaonmeds-frontend/src/app/admin//logs/page.tsx
import Admin from '@/features/admin';
import {Suspense} from 'react';
import {Loading} from '@/components/ui';
export default function Page(){return <Suspense fallback={<Loading/>}><Admin view="logs"/></Suspense>}

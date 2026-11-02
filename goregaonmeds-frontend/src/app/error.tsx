'use client';
import {ErrorState} from '@/components/ui';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="container page"><ErrorState error={new Error('This page could not be displayed. Please reload and try again.')} retry={reset}/></div>}

'use client';
import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {api,send,session,Cart,Settings} from './api';
export const useSession=(admin=false)=>useQuery({queryKey:[admin?'admin':'customer','session'],queryFn:()=>session(admin),retry:false,staleTime:30000});
export const useCart=()=>useQuery({queryKey:['customer','cart'],queryFn:({signal})=>api<{cart:Cart}>('/cart',{signal}),retry:false});
export const useSettings=()=>useQuery({queryKey:['public','settings'],queryFn:({signal})=>api<{settings:Settings}>('/settings/public',{signal}),retry:false});
export function useCartUpdate(){const qc=useQueryClient();return useMutation({scope:{id:'cart'},mutationFn:(body:{productId:string;quantity:number})=>send<{cart:Cart}>('/cart/update',body),onSuccess:data=>qc.setQueryData(['customer','cart'],data),onSettled:()=>qc.invalidateQueries({queryKey:['customer','cart']})});}

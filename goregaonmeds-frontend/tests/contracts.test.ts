import {describe,it,expect} from 'vitest';
import {checkoutSchema,uploadPrescription} from '../src/lib/checkout';
import {errorMessage,money,productSchema,session,ApiError} from '../src/lib/api';
const good={customerName:'Asha Patel',mobileNumber:'9876543210',flat:'12, Lotus',area:'Goregaon East',landmark:'',terms:true};
describe('API and checkout boundaries',()=>{
 it('accepts valid Indian checkout details',()=>expect(checkoutSchema.safeParse(good).success).toBe(true));
 it('rejects invalid mobile numbers',()=>expect(checkoutSchema.safeParse({...good,mobileNumber:'1234567890'}).success).toBe(false));
 it('requires explicit terms acceptance',()=>expect(checkoutSchema.safeParse({...good,terms:false}).success).toBe(false));
 it('keeps an unbilled amount distinct from zero',()=>{expect(money(null)).toBe('Bill pending');expect(money(0)).not.toBe('Bill pending');});
 it('reads both backend error formats',()=>{expect(errorMessage({error:'Unavailable'},409)).toBe('Unavailable');expect(errorMessage({error:{message:'Conflict'}},409)).toBe('Conflict');});
 it('rejects invalid product prices',()=>expect(productSchema.safeParse({name:'Item',category:'Care',price:-1,inStock:true}).success).toBe(false));
 it('does not misrepresent an unconfigured session as a guest',async()=>{await expect(session()).rejects.toBeInstanceOf(ApiError);});
 it('rejects unsupported prescription files before upload',async()=>{await expect(uploadPrescription({type:'application/pdf',size:12} as File,'test')).rejects.toThrow('JPG');});
});

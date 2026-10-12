import { revalidateTag } from 'next/cache';
import { NextRequest,NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
export async function POST(req:NextRequest){
 const secret=process.env.REVALIDATE_SECRET;
 const supplied=req.headers.get('x-revalidate-secret')??'';
 if(!secret||!supplied||Buffer.byteLength(secret)!==Buffer.byteLength(supplied)||!timingSafeEqual(Buffer.from(secret),Buffer.from(supplied)))return NextResponse.json({error:'Unauthorized'},{status:401});
 revalidateTag('school-content','max');
 return NextResponse.json({ok:true,revalidated:true});
}

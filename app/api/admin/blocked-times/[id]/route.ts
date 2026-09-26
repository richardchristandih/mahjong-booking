import { NextRequest, NextResponse } from "next/server";
import { adminUser } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase";
export async function DELETE(_request: NextRequest,{params}:{params:Promise<{id:string}>}){if(!await adminUser())return NextResponse.json({error:'Unauthorized'},{status:401});const {error}=await serviceClient().from('blocked_times').delete().eq('id',(await params).id);return error?NextResponse.json({error:'Could not remove block'},{status:500}):NextResponse.json({ok:true});}

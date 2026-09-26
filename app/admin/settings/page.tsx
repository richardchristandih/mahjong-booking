import { redirect } from "next/navigation";
import { adminUser } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase";
import SettingsForm from "./settings-form";

export default async function SettingsPage(){if(!await adminUser())redirect('/admin/login');const {data}=await serviceClient().from('settings').select('*').eq('id',1).single();return <><div className="page-heading"><div className="eyebrow">Venue setup</div><h1>Settings</h1></div><SettingsForm settings={data}/></>}

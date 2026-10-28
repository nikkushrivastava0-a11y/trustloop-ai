'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
const Context=createContext<{user:User|null;loading:boolean;error:string;refresh:()=>Promise<void>}>({user:null,loading:true,error:'',refresh:async()=>{}});
export function Provider({children}:{children:React.ReactNode}){const [user,setUser]=useState<User|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const refresh=useCallback(async()=>{try{setUser(await api.session());setError('');}catch(e){setError(e instanceof Error?e.message:'Could not load session.');}finally{setLoading(false);}},[]);useEffect(()=>{let active=true;api.session().then(value=>{if(active){setUser(value);setLoading(false);}}).catch(e=>{if(active){setError(e.message);setLoading(false);}});return()=>{active=false;};},[]);return <Context.Provider value={{user,loading,error,refresh}}>{children}</Context.Provider>}
export const useSession=()=>useContext(Context);

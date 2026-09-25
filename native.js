import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Dialog } from '@capacitor/dialog';
import * as XLSX from 'xlsx';
window.XLSX=XLSX;
window.FerliNative={
 isNative:()=>Capacitor.isNativePlatform(),
 confirm:async message=>Capacitor.isNativePlatform()?(await Dialog.confirm({title:'Ferli Finanzas',message})).value:window.confirm(message),
 exportFile:async(name,data)=>{
 const result=await Filesystem.writeFile({path:name,data,directory:Directory.Cache,encoding:Encoding.UTF8});
 await Share.share({title:'Respaldo de Ferli Finanzas',files:[result.uri],dialogTitle:'Guardar o compartir archivo'});
 }
};

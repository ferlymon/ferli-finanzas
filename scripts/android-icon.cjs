const fs = require('node:fs');
const path = require('node:path');
const res = 'android/app/src/main/res';
if (fs.existsSync(res)) {
  const source = 'www/assets/dobby.png';
  fs.mkdirSync(path.join(res, 'drawable-nodpi'), {recursive:true});
  fs.copyFileSync(source, path.join(res, 'drawable-nodpi/dobby.png'));
  for (const dir of fs.readdirSync(res).filter(n => n.startsWith('mipmap-'))) {
    for (const file of fs.readdirSync(path.join(res, dir))) {
      if (/^ic_launcher(?:_round|_foreground)?\.(png|webp|xml)$/.test(file)) fs.unlinkSync(path.join(res,dir,file));
    }
  }
  fs.mkdirSync(path.join(res,'mipmap-anydpi'),{recursive:true});
  fs.mkdirSync(path.join(res,'mipmap-anydpi-v26'),{recursive:true});
  const legacy = '<?xml version="1.0" encoding="utf-8"?><bitmap xmlns:android="http://schemas.android.com/apk/res/android" android:src="@drawable/dobby" android:gravity="fill" />';
  const adaptive = '<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@android:color/white"/><foreground><inset android:inset="14%"><bitmap android:src="@drawable/dobby" android:gravity="fill"/></inset></foreground></adaptive-icon>';
  for (const name of ['ic_launcher','ic_launcher_round']) {
    fs.writeFileSync(path.join(res,'mipmap-anydpi',name+'.xml'),legacy);
    fs.writeFileSync(path.join(res,'mipmap-anydpi-v26',name+'.xml'),adaptive);
  }
  console.log('Icono Dobby instalado. Identificador y firma sin cambios.');
}

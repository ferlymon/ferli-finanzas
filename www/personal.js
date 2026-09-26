/* Ferli Finanzas · Dobby edition. Extends the existing app without changing its storage key. */
'use strict';
const F=window.FerliFinance;
const $=s=>document.querySelector(s);
const oldRenderAll=renderAll,oldRenderDashboard=renderDashboard;
let currentRaw=localStorage.getItem('ferli-finanzas');
let storageBlocked=false;
try{
 if(currentRaw){state=F.validate(JSON.parse(currentRaw));if(!JSON.parse(currentRaw).schemaVersion)localStorage.setItem('ferli-finanzas-antes-v2',currentRaw)}
 else state=F.normalize(state);
}catch(error){storageBlocked=true;state=F.normalize(state);setTimeout(()=>showBackupText(currentRaw||'','Tus datos originales siguen guardados. No se sobrescribirán: '+error.message),50)}
function persist(next,message){
 if(storageBlocked){toast('Primero exporta tus datos originales y revisa el aviso de respaldo.');return false}
 try{const valid=F.validate(next);localStorage.setItem('ferli-finanzas',JSON.stringify(valid));state=valid;renderAll();if(message)toast(message);return true}catch(error){toast(error.message);return false}
}
save=()=>persist(state);
function ask(message){return window.FerliNative?.confirm(message)??Promise.resolve(window.confirm(message))}
function heading(title){return `<div class="dialog-head"><h2>${esc(title)}</h2><button type="button" class="close" aria-label="Cerrar">×</button></div>`}
function addDialog(id,html){const d=document.createElement('dialog');d.id=id;d.innerHTML=html;document.body.append(d);d.querySelectorAll('.close').forEach(b=>b.onclick=()=>d.close());return d}
function options(kind,selected=''){return '<option value="">Sin agrupar</option>'+state.accounts.filter(a=>a.kind===kind).map(a=>`<option value="${esc(a.id)}" ${String(a.id)===String(selected)?'selected':''}>${esc(a.name)}</option>`).join('')}
function accountName(id){return state.accounts.find(a=>String(a.id)===String(id))?.name||''}
function debtLabel(d){return (d.accountId?accountName(d.accountId)+' · ':'')+d.name}
const uid=F.uid;

// Interface scaffolding
$('.topbar>div').insertAdjacentHTML('afterbegin','<img class="brand-dobby" src="assets/dobby.png" alt="Dobby, tu compañero financiero">');
$('#dashboard').insertAdjacentHTML('afterbegin','<article id="dobbyHome" class="dobby-home"></article>');
$('#summaryCards').insertAdjacentHTML('afterend','<article id="healthCard" class="panel health-card"></article>');
$('#deudas .section-title').insertAdjacentHTML('afterend','<div class="button-stack section-actions"><button class="secondary" id="addAccount">+ Tarjeta o cuenta</button><span class="hint">Agrupa tus compras o conserva deudas individuales.</span></div><div id="debtSummary" class="debt-summary"></div>');
$('#movimientos .filters').insertAdjacentHTML('beforebegin','<details class="panel income-panel"><summary>Cuentas de ingresos · opcional</summary><p class="hint">Ejemplo: Trabajo → sueldo, bonos. También puedes registrar ingresos sin agrupar.</p><button id="addIncomeAccount" class="secondary">+ Cuenta de ingresos</button><div id="incomeGroups"></div></details>');
$('#ajustes').insertAdjacentHTML('afterbegin',`<article class="panel personalization"><span class="eyebrow">Tu espacio</span><h2>Personaliza Ferli</h2><label>¿Cómo te llama Dobby?<input id="ownerName" maxlength="30"></label><label>Paleta<select id="themeSelect"><option value="bosque">Bosque · petróleo y salvia</option><option value="tierra">Tierra · terracota y crema</option><option value="noche">Noche · azul y lavanda</option></select></label><label class="check-label"><input id="petEnabled" type="checkbox"> Mostrar a Dobby en Inicio</label><button id="savePreferences" class="primary">Guardar estilo</button><p class="hint">Edición Dobby 2.0 · Datos guardados en este dispositivo.</p></article>`);
$('#ajustes .section-title h2').textContent='Tu información';
$('#exportBackup').textContent='Guardar respaldo completo';
$('#exportExcel').textContent='Exportar a Excel (.xlsx)';
$('#ajustes .action-panel:last-of-type p').textContent='El respaldo JSON conserva todo. Excel incluye movimientos, cuentas, compras y presupuestos para revisarlos o volver a importarlos.';
$('#ajustes').insertAdjacentHTML('beforeend','<article class="panel"><h3>Copias de seguridad</h3><p id="backupStatus" class="hint"></p><p class="hint">Guarda el archivo fuera de la app (Archivos, Drive o tu computadora). Las copias locales también se pierden al desinstalar.</p><button class="secondary" id="exportPrevious">Exportar copia anterior disponible</button></article>');
$('#clearDemo').textContent='Borrar todos los registros';

// Enrich existing forms, keep old field names and payment identifiers.
debtForm.querySelector('[name="name"]').closest('label').insertAdjacentHTML('afterend',`<label>Tarjeta o cuenta principal<select name="accountId"></select></label><label>Tipo de deuda<select name="plan"><option value="simple">Deuda individual / saldo general</option><option value="msi">Compra a meses sin intereses</option></select></label><div class="msi-fields hidden"><label>Número total de mensualidades<input name="installments" type="number" min="1" max="120" step="1"></label><label>Primer vencimiento<input name="firstDue" type="date"></label><p class="hint">Se calcula el calendario completo desde la primera mensualidad. Lo pagado antes de la app se aplica a las primeras cuotas.</p></div>`);
transactionForm.querySelector('[name="notes"]').closest('label').insertAdjacentHTML('beforebegin','<div class="income-fields hidden"><label>Cuenta de ingreso (opcional)<select name="incomeAccountId"></select></label><label>Subcuenta o concepto (opcional)<input name="incomeSubaccount" maxlength="80" placeholder="Sueldo, bono, asesorías…"></label></div>');
const previousTypeChange=typeSelect.onchange;
typeSelect.onchange=()=>{previousTypeChange();$('.income-fields').classList.toggle('hidden',typeSelect.value!=='Ingreso');transactionForm.elements.debtId.required=typeSelect.value==='Pago de deuda'};
function planFields(){const m=debtForm.elements.plan.value==='msi';$('.msi-fields').classList.toggle('hidden',!m);debtForm.elements.installments.required=m;debtForm.elements.firstDue.required=m;debtForm.elements.installments.disabled=!m;debtForm.elements.firstDue.disabled=!m;debtForm.elements.minimum.closest('label').classList.toggle('hidden',m);debtForm.elements.dueDate.closest('label').classList.toggle('hidden',m)}
debtForm.elements.plan.onchange=planFields;
fillDebtOptions=()=>{const select=transactionForm.elements.debtId,old=select.value;select.innerHTML='<option value="">Selecciona una deuda</option>'+state.debts.map(d=>`<option value="${esc(d.id)}">${esc(debtLabel(d))} · ${money(F.balance(state,d))}</option>`).join('');select.value=old};
openDebt=(id=null,accountId='')=>{
 editingDebt=id;debtForm.reset();const d=state.debts.find(d=>String(d.id)===String(id));debtForm.querySelector('h2').textContent=d?'Editar deuda':'Agregar deuda o compra';debtForm.elements.accountId.innerHTML=options('debt',d?.accountId||accountId);
 if(d)for(const [k,v]of Object.entries(d)){const field=debtForm.elements.namedItem(k);if(field)field.value=v}
 planFields();$('#debtDialog').showModal();
};
const baseOpenMovement=openMovement;
openMovement=(id=null,debtId=null)=>{transactionForm.elements.incomeAccountId.innerHTML=options('income');baseOpenMovement(id,debtId);typeSelect.onchange()};
debtForm.onsubmit=e=>{
 e.preventDefault();const obj=Object.fromEntries(new FormData(debtForm));obj.name=obj.name.trim();for(const k of ['initial','minimum','previousPaid','installments'])obj[k]=Number(obj[k]||0);
 if(obj.plan==='msi'){obj.minimum=0;obj.dueDate=''}else{obj.installments=0;obj.firstDue=''}
 const next=structuredClone(state),i=next.debts.findIndex(d=>String(d.id)===String(editingDebt));obj.id=i>=0?next.debts[i].id:uid();if(i>=0)next.debts[i]={...next.debts[i],...obj};else next.debts.push(obj);next.demo=false;
 if(persist(next,'Deuda guardada'))$('#debtDialog').close();
};
transactionForm.onsubmit=e=>{
 e.preventDefault();const obj=Object.fromEntries(new FormData(transactionForm));obj.description=obj.description.trim();obj.amount=Number(obj.amount);
 if(obj.type!=='Pago de deuda')obj.debtId='';if(obj.type!=='Ingreso'){obj.incomeAccountId='';obj.incomeSubaccount=''}
 const next=structuredClone(state),i=next.transactions.findIndex(t=>String(t.id)===String(editingMovement));obj.id=i>=0?next.transactions[i].id:uid();if(i>=0)next.transactions[i]={...next.transactions[i],...obj};else next.transactions.push(obj);next.demo=false;
 if(persist(next,'Movimiento guardado'))$('#transactionDialog').close();
};
$('#budgetList').onchange=e=>{if(e.target.dataset.budget){const next=structuredClone(state);next.budgets[e.target.dataset.budget]=Number(e.target.value);next.demo=false;persist(next)}};

const accountDialog=addDialog('accountDialog',`<form id="accountForm">${heading('Tarjeta o cuenta')}<label>Nombre<input name="name" maxlength="80" required placeholder="Ej. Tarjeta Nu"></label><label>Color<select name="color"><option value="teal">Petróleo</option><option value="sage">Salvia</option><option value="clay">Terracota</option><option value="violet">Lavanda</option></select></label><p class="hint">El saldo será la suma de sus subdeudas. La cuenta no añade otra deuda.</p><button class="primary" type="submit">Guardar cuenta</button></form>`);
let editingAccount=null,accountKind='debt';
function openAccount(kind='debt',id=null){accountKind=kind;editingAccount=id;const form=$('#accountForm');form.reset();const a=state.accounts.find(a=>String(a.id)===String(id));form.querySelector('h2').textContent=kind==='debt'?'Tarjeta o cuenta de deudas':'Cuenta de ingresos';form.querySelector('p').textContent=kind==='debt'?'El saldo será la suma de sus subdeudas. La cuenta no añade otra deuda.':'Agrupador opcional para sueldo, bonos u otros conceptos.';if(a){form.elements.name.value=a.name;form.elements.color.value=a.color||'teal'}accountDialog.showModal()}
$('#addAccount').onclick=()=>openAccount();$('#addIncomeAccount').onclick=()=>openAccount('income');
$('#accountForm').onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));data.name=data.name.trim();const next=structuredClone(state);const i=next.accounts.findIndex(a=>String(a.id)===String(editingAccount));data.id=i>=0?next.accounts[i].id:uid();data.kind=accountKind;if(i>=0)next.accounts[i]={...next.accounts[i],...data};else next.accounts.push(data);if(persist(next,'Cuenta guardada'))accountDialog.close()};

// Combined payment is split into ordinary linked transactions, never counted twice.
const paymentDialog=addDialog('accountPaymentDialog',`<form id="accountPaymentForm">${heading('Pago de tarjeta')}<p id="paymentAccountName"></p><label>Fecha<input type="date" name="date" required></label><label>Total a distribuir<input type="number" min="0.01" step="0.01" name="total" required></label><button id="suggestAllocation" class="secondary" type="button">Proponer reparto por vencimiento</button><p class="hint">Revisa o cambia cada importe. Solo se guardarán los abonos de este desglose.</p><div id="allocations"></div><p id="allocationSum" aria-live="polite"></p><button class="primary" type="submit">Confirmar pago y desglose</button></form>`);
let paymentAccount=null;
function openAccountPayment(id){paymentAccount=id;const form=$('#accountPaymentForm');form.reset();form.elements.date.value=F.localDate();$('#paymentAccountName').textContent=accountName(id);const ds=state.debts.filter(d=>String(d.accountId)===String(id)&&F.balance(state,d)>0);$('#allocations').innerHTML=ds.map(d=>`<label>${esc(d.name)} · saldo ${money(F.balance(state,d))}<input data-allocation="${esc(d.id)}" type="number" min="0" max="${F.balance(state,d)}" step="0.01" value="0"></label>`).join('');allocationSum();paymentDialog.showModal()}
function allocationSum(){const sum=[...document.querySelectorAll('[data-allocation]')].reduce((a,x)=>a+F.cents(x.value),0);$('#allocationSum').textContent='Distribuido: '+money(F.amount(sum));return sum}
$('#allocations').oninput=allocationSum;
$('#suggestAllocation').onclick=()=>{let remaining=F.cents($('#accountPaymentForm').elements.total.value);const ds=state.debts.filter(d=>String(d.accountId)===String(paymentAccount)).sort((a,b)=>(F.due(state,a).date||'9999').localeCompare(F.due(state,b).date||'9999'));for(const d of ds){const field=[...document.querySelectorAll('[data-allocation]')].find(x=>String(x.dataset.allocation)===String(d.id));if(field){const p=Math.max(0,Math.min(remaining,F.cents(F.balance(state,d))));field.value=F.amount(p);remaining-=p}}allocationSum()};
$('#accountPaymentForm').onsubmit=e=>{e.preventDefault();const total=F.cents(e.target.elements.total.value);if(total<=0||allocationSum()!==total){toast('El desglose debe sumar exactamente el total del pago.');return}const next=structuredClone(state),batch=uid();for(const field of document.querySelectorAll('[data-allocation]'))if(F.cents(field.value)>0){const d=next.debts.find(d=>String(d.id)===field.dataset.allocation);next.transactions.push({id:uid(),date:e.target.elements.date.value,type:'Pago de deuda',category:'Deudas',description:'Pago '+d.name,amount:F.amount(F.cents(field.value)),debtId:d.id,notes:'Pago distribuido de '+accountName(paymentAccount),paymentBatch:batch})}next.demo=false;if(persist(next,'Pago distribuido guardado'))paymentDialog.close()};

function debtCard(d){const paid=F.paid(state,d.id),left=F.balance(state,d),pct=Math.min(100,paid/d.initial*100),due=F.due(state,d);return `<article class="panel debt-card"><div class="debt-top"><div><span class="eyebrow">${d.plan==='msi'?`${d.installments} meses sin intereses`:'Deuda individual'}</span><h3>${esc(d.name)}</h3></div><strong>${money(left)}</strong></div><div class="progress"><i style="width:${pct}%"></i></div><div class="debt-meta"><span>Original ${money(d.initial)}</span><span>Pagado ${money(paid)}</span></div><p class="hint">${pct.toFixed(0)}% liquidado · Histórico previo ${money(d.previousPaid)}</p><p class="due-label ${due.overdue?'danger':''}">${left===0?'✓ Liquidada':due.date?`${due.overdue?'Pendiente desde':'Próximo vencimiento'} ${esc(due.date)} · ${money(due.nextAmount)}`:'Sin fecha de vencimiento'}</p><div class="button-stack"><button class="secondary" data-edit-debt="${esc(d.id)}">Editar deuda</button><button class="primary" data-pay-debt="${esc(d.id)}" ${left===0?'disabled':''}>Aplicar pago</button></div><details><summary>Historial de pagos</summary>${transactionRows(state.transactions.filter(t=>t.type==='Pago de deuda'&&String(t.debtId)===String(d.id)))}</details>${d.plan==='msi'?`<details><summary>Calendario de mensualidades</summary><div class="schedule">${due.schedule.map((r,i)=>`<div class="schedule-row"><span>${i+1}/${d.installments} · ${r.date}</span><span>${money(r.amount)}<small>${r.remaining===0?'Pagada':'Pendiente '+money(r.remaining)}</small></span></div>`).join('')}</div></details>`:''}</article>`}
renderDebts=()=>{
 const initial=state.debts.reduce((a,d)=>a+F.cents(d.initial),0),paid=state.debts.reduce((a,d)=>a+F.cents(F.paid(state,d.id)),0);$('#debtSummary').innerHTML=`<div><small>Total pendiente</small><strong>${money(F.amount(initial-paid))}</strong></div><div><small>Ya pagado</small><strong>${money(F.amount(paid))}</strong></div>`;
 const groups=state.accounts.filter(a=>a.kind==='debt').map(a=>{const totals=F.accountTotal(state,a.id),ds=state.debts.filter(d=>String(d.accountId)===String(a.id));return `<section class="account-group accent-${['teal','sage','clay','violet'].includes(a.color)?a.color:'teal'}"><div class="account-head"><span class="eyebrow">Tarjeta / cuenta principal · ${totals.count} compras</span><div class="debt-top"><h3>${esc(a.name)}</h3><strong>${money(totals.balance)}</strong></div><div class="debt-meta"><span>Original ${money(totals.initial)}</span><span>Pagado ${money(totals.paid)}</span></div><div class="button-stack"><button class="secondary" data-add-child="${esc(a.id)}">+ Compra</button><button class="secondary" data-account-pay="${esc(a.id)}" ${totals.balance===0?'disabled':''}>Pagar tarjeta</button><button class="secondary" data-account-edit="${esc(a.id)}">Editar</button></div></div><div class="account-children">${ds.map(debtCard).join('')||'<p class="empty">Agrega una compra o asigna una deuda existente desde «Editar deuda».</p>'}</div></section>`}).join('');const solo=state.debts.filter(d=>!d.accountId);$('#debtCards').innerHTML=groups+(solo.length?'<h3 class="standalone-title">Sin agrupar</h3>'+solo.map(debtCard).join(''):'')||'<div class="panel empty">Agrega una deuda individual o crea tu primera tarjeta.</div>';
};
debtPaid=id=>F.paid(state,id);
transactionRows=items=>items.map(t=>`<div class="row"><div class="badge">${t.type==='Ingreso'?'＋':t.type==='Pago de deuda'?'✓':'−'}</div><div><div class="row-title">${esc(t.description)}</div><div class="row-sub">${esc(t.category)} · ${esc(t.date)}${t.incomeAccountId?' · '+esc(accountName(t.incomeAccountId)):''}${t.incomeSubaccount?' / '+esc(t.incomeSubaccount):''}</div><button class="text-button" data-edit-movement="${esc(t.id)}">Editar</button></div><div class="amount ${t.type==='Ingreso'?'income':'expense'}">${t.type==='Ingreso'?'+':'−'}${money(t.amount)}</div></div>`).join('')||'<div class="empty">No hay movimientos.</div>';
function renderIncome(){const ts=state.transactions.filter(t=>t.type==='Ingreso'&&inPeriod(t));$('#incomeGroups').innerHTML=state.accounts.filter(a=>a.kind==='income').map(a=>{const rows=ts.filter(t=>String(t.incomeAccountId)===String(a.id)),by={};rows.forEach(t=>{const k=t.incomeSubaccount||'Sin subcuenta';by[k]=(by[k]||0)+F.cents(t.amount)});return `<div class="income-account"><h3>${esc(a.name)} <button class="text-button" data-account-edit="${esc(a.id)}">Editar</button></h3><strong>${money(F.amount(rows.reduce((s,t)=>s+F.cents(t.amount),0)))}</strong>${Object.entries(by).map(([k,v])=>`<div class="debt-meta"><span>${esc(k)}</span><span>${money(F.amount(v))}</span></div>`).join('')}</div>`}).join('')||'<p class="hint">Aún no hay cuentas agrupadas.</p>'}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.addChild)openDebt(null,b.dataset.addChild);if(b.dataset.accountPay)openAccountPayment(b.dataset.accountPay);if(b.dataset.accountEdit){const a=state.accounts.find(a=>String(a.id)===b.dataset.accountEdit);openAccount(a.kind,a.id)}});

// Dobby is supportive: no hunger penalties, no financial punishment.
function renderPersonal(){
 document.body.dataset.theme=['bosque','tierra','noche'].includes(state.preferences.theme)?state.preferences.theme:'bosque';
 $('#ownerName').value=state.preferences.name;$('#themeSelect').value=state.preferences.theme;$('#petEnabled').checked=state.preferences.pet;
 $('#dobbyHome').classList.toggle('hidden',!state.preferences.pet);
 const month=$('#periodPicker').value,health=F.health(state,month),visited=state.pet.visits.includes(F.localDate());
 const message=health.late.length?'Revisemos juntos los próximos pagos. Un paso a la vez.':health.score===null?'Vamos a conocer tu dinero. Cada registro nos ayuda.':health.flow<0?'Este mes merece una revisión. Estoy contigo.':'Vamos avanzando. ¿Revisamos tus movimientos de hoy?';
 $('#dobbyHome').innerHTML=`<div class="dobby-portrait"><img src="assets/dobby.png" alt="Dobby"><span id="petHeart" aria-hidden="true">♥</span></div><div class="dobby-copy"><span class="eyebrow">Dobby · tu compañero</span><h2>Hola, ${esc(state.preferences.name||'Ferli')}</h2><p>${message}</p><div class="pet-actions"><button id="petDobby" class="pet-button">Acariciar</button><button id="checkIn" class="pet-button">${visited?'✓ Revisión de hoy':'Ya revisé mis cuentas'}</button></div><small>${state.pet.visits.length} días de revisión · sin prisas, sin regaños</small></div>`;
 $('#petDobby').onclick=()=>{const portrait=$('.dobby-portrait');portrait.classList.remove('happy');void portrait.offsetWidth;portrait.classList.add('happy');toast('Dobby mueve la cola. ¡Aquí estoy contigo!')};
 $('#checkIn').onclick=()=>{if(visited){toast('Hoy ya registraste tu revisión.');return}const next=structuredClone(state);next.pet.visits.push(F.localDate());persist(next,'¡Una huellita más en tu camino!')};
 const over=health.budgets.filter(b=>b.spent>b.limit),under=health.budgets.filter(b=>b.spent<b.limit*0.5);
 $('#healthCard').innerHTML=`<div class="panel-head"><div><span class="eyebrow">Pulso Ferli · ${esc(month)}</span><h2>Tu bienestar financiero</h2></div><div class="score">${health.score===null?'—':health.score}<small>${health.score===null?'Sin datos suficientes':'de 100'}</small></div></div><p class="hint">Orientación basada solo en lo que registras. No es un score crediticio ni verifica tus bancos. Esta revisión siempre es mensual.</p><div class="health-parts">${health.parts.map(p=>`<div><strong>${esc(p.name)}</strong><span>${Math.round(p.points)}/100</span><p>${esc(p.detail)}</p></div>`).join('')}</div><ul class="insights">${health.income<=0?'<li>Agrega tus ingresos para evaluar el flujo del mes.</li>':''}${over.map(b=>`<li>Revisa ${esc(b.category)}: llevas ${money(b.spent-b.limit)} sobre tu presupuesto.</li>`).join('')}${under.slice(0,2).map(b=>`<li>En ${esc(b.category)} llevas ${money(b.spent)} de ${money(b.limit)}. Comprueba que no falten registros; gastar menos no implica que debas gastar más.</li>`).join('')}${health.late.map(d=>`<li>Revisa ${esc(d.name)}: hay saldo con vencimiento anterior a hoy.${d.plan!=='msi'?' En deudas generales, actualiza la fecha después de revisar tu estado de cuenta.':''}</li>`).join('')}</ul><details><summary>Cómo se calcula</summary><p class="hint">Promedio de las dimensiones disponibles: flujo (100 si el disponible es positivo; baja proporcionalmente al déficit), presupuesto (porcentaje de categorías dentro del límite) y vencimientos (100 sin pendientes vencidos, 0 si hay alguno). No evalúa ahorro suficiente ni historial de buró. Los pagos históricos cubren las primeras cuotas de MSI.</p></details>`;
 $('#backupStatus').textContent=state.preferences.lastBackup?'Última solicitud de exportación: '+new Date(state.preferences.lastBackup).toLocaleString('es-MX')+'. Comprueba que guardaste el archivo.':'Todavía no se ha solicitado un respaldo en esta versión.';
}
$('#savePreferences').onclick=()=>{const next=structuredClone(state);next.preferences={...next.preferences,name:$('#ownerName').value.trim()||'Ferli',theme:$('#themeSelect').value,pet:$('#petEnabled').checked};persist(next,'Estilo guardado')};
renderDashboard=()=>{oldRenderDashboard();renderPersonal()};
renderAll=()=>{oldRenderAll();renderIncome()};
$('#clearDemo').onclick=async()=>{if(await ask('Se borrarán todos tus movimientos, deudas y cuentas. Guarda un respaldo externo antes. ¿Borrar?'))persist({...state,transactions:[],debts:[],accounts:[],budgets:{},demo:false},'Registros borrados')};

excelDate=v=>{if(v instanceof Date){if(isNaN(v))throw Error('Fecha inválida en Excel.');return F.localDate(v)}if(typeof v==='number'){const d=XLSX.SSF.parse_date_code(v);if(!d)throw Error('Fecha inválida en Excel.');return [d.y,String(d.m).padStart(2,'0'),String(d.d).padStart(2,'0')].join('-')}if(F.dateOK(String(v)))return String(v);throw Error('Usa fechas AAAA-MM-DD o fechas de Excel válidas.');};

// An export request is recorded only when the save/share operation completes.
download=async(name,text,type)=>{try{if(window.FerliNative?.isNative()){await window.FerliNative.exportFile(name,text);return true}const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);return true}catch(error){showBackupText(text,'No se completó el guardado. Puedes copiar el contenido. '+error.message);return false}};

// JSON is complete; workbook keeps all IDs, groups, schedules and preferences.
validateBackup=F.validate;
function workbook(){
 const wb=XLSX.utils.book_new(),add=(name,rows,header)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows,{header}),name);
 add('Movimientos',state.transactions.map(t=>({'ID movimiento':t.id,Fecha:t.date,Tipo:t.type,Categoría:t.category,Descripción:t.description,Monto:Number(t.amount),Notas:t.notes||'','Deuda asociada':t.debtId||'','Cuenta ingreso':t.incomeAccountId||'',Subcuenta:t.incomeSubaccount||'','Grupo pago':t.paymentBatch||''})),['ID movimiento','Fecha','Tipo','Categoría','Descripción','Monto','Notas','Deuda asociada','Cuenta ingreso','Subcuenta','Grupo pago']);
 add('Deudas',state.debts.map(d=>({'ID deuda':d.id,Deuda:d.name,'Saldo inicial':Number(d.initial),'Pago mínimo':Number(d.minimum),'Pagado antes de la app':Number(d.previousPaid),'Pagado acumulado':F.paid(state,d.id),'Saldo por pagar':F.balance(state,d),'Fecha límite':d.dueDate||'','ID cuenta':d.accountId||'',Plan:d.plan,Mensualidades:d.installments,'Primer vencimiento':d.firstDue||''})),['ID deuda','Deuda','Saldo inicial','Pago mínimo','Pagado antes de la app','Pagado acumulado','Saldo por pagar','Fecha límite','ID cuenta','Plan','Mensualidades','Primer vencimiento']);
 add('Cuentas',state.accounts.map(a=>({'ID cuenta':a.id,Nombre:a.name,Tipo:a.kind,Color:a.color||'teal'})),['ID cuenta','Nombre','Tipo','Color']);
 add('Presupuesto',Object.entries(state.budgets).map(([k,v])=>({Categoría:k,'Presupuesto mensual':Number(v)})),['Categoría','Presupuesto mensual']);
 add('Personalizacion',[{Configuración:JSON.stringify(state.preferences),Dobby:JSON.stringify(state.pet)}],['Configuración','Dobby']);
 add('Leer primero',[{Indicaciones:'Ferli 2.0. Conserva los ID para mantener vínculos. Pagado acumulado y Saldo por pagar son informativos: se recalculan. Los padres no suman una segunda deuda. Para respaldo completo usa también JSON.'}],['Indicaciones']);
 return wb;
}
function importWorkbook(wb){
 const next=structuredClone(state),names=wb.SheetNames;const find=term=>names.find(n=>n.toLowerCase().includes(term));const rows=n=>XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:''});let found=0;
 const cs=find('cuentas');if(cs){found++;next.accounts=rows(cs).map(r=>({id:r['ID cuenta'],name:r.Nombre,kind:r.Tipo,color:r.Color||'teal'}))}
 const ds=find('deuda');if(ds){found++;next.debts=rows(ds).map(r=>({id:r['ID deuda']||uid(),name:r.Deuda||r.Nombre,initial:Number(r['Saldo inicial']||r['Saldo histórico (inicial)']||r['Saldo histórico']||0),minimum:Number(r['Pago mínimo']||0),previousPaid:Number(r['Pagado antes de la app']||0),dueDate:r['Fecha límite']?excelDate(r['Fecha límite']):'',accountId:r['ID cuenta']||'',plan:r.Plan||'simple',installments:Number(r.Mensualidades||0),firstDue:r['Primer vencimiento']?excelDate(r['Primer vencimiento']):''}))}
 const ms=find('movimiento');if(ms){found++;next.transactions=rows(ms).map(r=>({id:r['ID movimiento']||uid(),date:r.Fecha?excelDate(r.Fecha):'',type:r.Tipo||'',category:r.Categoría||r.Categoria||'Otros gastos',description:r.Descripción||r.Descripcion||'',amount:Number(r.Monto),notes:r.Notas||'',debtId:r['Deuda asociada']||'',incomeAccountId:r['Cuenta ingreso']||'',incomeSubaccount:r.Subcuenta||'',paymentBatch:r['Grupo pago']||''}))}
 const bs=find('presupuesto');if(bs){found++;next.budgets=Object.fromEntries(rows(bs).map(r=>[r.Categoría||r.Categoria,Number(r['Presupuesto mensual'])]))}
 const ps=find('personalizacion');if(ps){const r=rows(ps)[0];if(r){next.preferences=JSON.parse(r.Configuración);next.pet=JSON.parse(r.Dobby)}}
 if(!found)throw Error('No se encontraron hojas de Ferli: Movimientos, Deudas, Cuentas o Presupuesto.');next.demo=false;return F.validate(next);
}
async function exportData(kind){
 try{
 const name='Ferli_Finanzas_'+F.localDate()+'_'+Date.now();
 if(kind==='json'){if(!await download(name+'.json',storageBlocked?currentRaw:JSON.stringify(state,null,2),'application/json'))return;}
 else{const wb=workbook();if(window.FerliNative?.isNative())await window.FerliNative.exportFile(name+'.xlsx',XLSX.write(wb,{bookType:'xlsx',type:'base64'}),true);else{const blob=new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000)}}
 if(!storageBlocked){const next=structuredClone(state);next.preferences.lastBackup=new Date().toISOString();persist(next)}
 }catch(error){toast('No se completó la exportación: '+error.message)}
}
$('#exportBackup').onclick=()=>exportData('json');$('#exportExcel').onclick=()=>exportData('excel');
copyBackup.onclick=()=>showBackupText(storageBlocked?currentRaw:JSON.stringify(state,null,2));
$('#exportPrevious').onclick=()=>{const raw=localStorage.getItem('ferli-finanzas-antes-importar')||localStorage.getItem('ferli-finanzas-antes-v2');if(raw)download('Ferli_copia_anterior.json',raw,'application/json');else toast('No hay copia local anterior. Guarda un respaldo actual.')};
$('#importFile').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try{const incoming=file.name.toLowerCase().endsWith('.json')?F.validate(JSON.parse(await file.text())):importWorkbook(XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true}));
 if(!await ask(`Se cargarán ${incoming.debts.length} deudas, ${incoming.transactions.length} movimientos y ${incoming.accounts.length} cuentas. Esto reemplazará los datos correspondientes. ¿Continuar?`))return;
 localStorage.setItem('ferli-finanzas-antes-importar',currentRaw&&storageBlocked?currentRaw:JSON.stringify(state));
 const blocked=storageBlocked;storageBlocked=false;if(!persist(incoming,'Importación completa'))storageBlocked=blocked;
 }catch(error){showBackupText('','No se cambió tu información: '+error.message)}finally{e.target.value=''}
};
// Select a week anchor explicitly; a month picker alone cannot select other weeks.
$('.period-row label').insertAdjacentHTML('afterend','<label id="weekLabel" class="hidden">Día de la semana<input id="weekPicker" type="date"></label>');$('#weekPicker').value=F.localDate();
inPeriod=t=>{const d=t.date;if(periodMode==='month')return d.startsWith($('#periodPicker').value);const anchor=new Date($('#weekPicker').value+'T12:00:00'),day=(anchor.getDay()+6)%7;anchor.setDate(anchor.getDate()-day);const start=F.localDate(anchor);anchor.setDate(anchor.getDate()+7);return d>=start&&d<F.localDate(anchor)};
document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{periodMode=b.dataset.period;document.querySelectorAll('[data-period]').forEach(x=>x.classList.toggle('active',x===b));$('#weekLabel').classList.toggle('hidden',periodMode!=='week');renderAll()});$('#weekPicker').onchange=renderAll;
renderAll();

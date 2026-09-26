/* Pure domain rules. Amounts are calculated in cents; parent accounts never carry a second balance. */
(function(root){
'use strict';
const cents=v=>Math.round(Number(v||0)*100), amount=v=>v/100;
const key=v=>String(v), uid=()=>globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
function localDate(d=new Date()){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function dateOK(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T12:00:00');return !isNaN(d)&&localDate(d)===v}
function normalize(s){
 const n=structuredClone(s);n.schemaVersion=2;n.accounts??=[];n.preferences={theme:'bosque',name:'Ferli',pet:true,...n.preferences};n.pet={visits:[],...n.pet};
 n.debts=n.debts.map(d=>({...d,previousPaid:Number(d.previousPaid||0),accountId:d.accountId||'',plan:d.plan||'simple',installments:Number(d.installments||0),firstDue:d.firstDue||'',minimum:Number(d.minimum||0)}));
 return n;
}
function paid(s,id,omit){const d=s.debts.find(d=>key(d.id)===key(id));return amount(cents(d?.previousPaid)+s.transactions.filter(t=>t.type==='Pago de deuda'&&key(t.debtId)===key(id)&&key(t.id)!==key(omit)).reduce((sum,t)=>sum+cents(t.amount),0))}
function balance(s,d){return amount(Math.max(0,cents(d.initial)-cents(paid(s,d.id))))}
function monthDate(date,offset){const [y,m,day]=date.split('-').map(Number);const base=new Date(y,m-1+offset,1,12);const last=new Date(base.getFullYear(),base.getMonth()+1,0).getDate();base.setDate(Math.min(day,last));return localDate(base)}
function schedule(d){if(d.plan!=='msi'||!dateOK(d.firstDue)||!d.installments)return [];const total=cents(d.initial),monthly=Math.floor(total/d.installments);return Array.from({length:d.installments},(_,i)=>({date:monthDate(d.firstDue,i),amount:amount(i===d.installments-1?total-monthly*i:monthly)}))}
function due(s,d,now=localDate()){
 const p=cents(paid(s,d.id)),left=cents(balance(s,d)),rows=schedule(d);
 if(!rows.length)return {date:d.dueDate||'',overdue:!!d.dueDate&&d.dueDate<now&&left>0,arrears:0,nextAmount:amount(Math.min(left,cents(d.minimum)||left)),schedule:[]};
 let accum=0;const details=rows.map(r=>{const start=accum;accum+=cents(r.amount);return {...r,remaining:amount(Math.max(0,accum-Math.max(p,start)))}});
 const next=details.find(r=>r.remaining>0);const arrears=details.filter(r=>r.date<now).reduce((a,r)=>a+cents(r.remaining),0);
 return {date:next?.date||'',overdue:arrears>0,arrears:amount(arrears),nextAmount:next?.remaining||0,schedule:details};
}
function accountTotal(s,id){const ds=s.debts.filter(d=>key(d.accountId)===key(id));return {initial:amount(ds.reduce((a,d)=>a+cents(d.initial),0)),paid:amount(ds.reduce((a,d)=>a+cents(paid(s,d.id)),0)),balance:amount(ds.reduce((a,d)=>a+cents(balance(s,d)),0)),count:ds.length}}
function validate(s){
 if(!s||!Array.isArray(s.transactions)||!Array.isArray(s.debts)||!s.budgets||typeof s.budgets!=='object'||Array.isArray(s.budgets))throw Error('El archivo no es un respaldo de Ferli Finanzas.');
 if(s.schemaVersion>2)throw Error('Este respaldo necesita una versión más reciente de la app.');
 const n=normalize(s);if(!Array.isArray(n.accounts)||!Array.isArray(n.pet.visits))throw Error('Estructura de cuentas o mascota inválida.');
 const unique=(xs,label)=>{const ids=xs.map(x=>key(x.id));if(xs.some(x=>!x.id)||new Set(ids).size!==ids.length)throw Error('Hay identificadores duplicados o vacíos en '+label)};
 unique(n.accounts,'cuentas');unique(n.debts,'deudas');unique(n.transactions,'movimientos');
 for(const a of n.accounts)if(!['debt','income'].includes(a.kind)||typeof a.name!=='string'||!a.name.trim())throw Error('Cuenta inválida.');
 for(const d of n.debts){
  if(typeof d.name!=='string'||!d.name.trim()||!Number.isFinite(Number(d.initial))||cents(d.initial)<=0||!Number.isFinite(d.previousPaid)||d.previousPaid<0||!Number.isFinite(d.minimum)||d.minimum<0)throw Error('Montos de deuda inválidos.');
  if(d.dueDate&&!dateOK(d.dueDate))throw Error('Fecha límite inválida.');
  if(d.accountId&&!n.accounts.some(a=>a.kind==='debt'&&key(a.id)===key(d.accountId)))throw Error('Una deuda apunta a una tarjeta inexistente.');
  if(!['simple','msi'].includes(d.plan))throw Error('Tipo de deuda inválido.');
  if(d.plan==='msi'&&(!Number.isInteger(d.installments)||d.installments<1||d.installments>120||!dateOK(d.firstDue)))throw Error('Revisa los meses y el primer vencimiento de MSI.');
 }
 for(const t of n.transactions){
  if(!dateOK(t.date)||typeof t.description!=='string'||!t.description.trim()||typeof t.category!=='string'||!['Ingreso','Gasto','Ahorro','Pago de deuda'].includes(t.type)||!Number.isFinite(Number(t.amount))||cents(t.amount)<=0)throw Error('Movimiento inválido: revisa fecha, tipo y monto.');
  if(t.type==='Pago de deuda'&&!n.debts.some(d=>key(d.id)===key(t.debtId)))throw Error('Un pago no tiene una deuda válida.');
  if(t.incomeAccountId&&!n.accounts.some(a=>a.kind==='income'&&key(a.id)===key(t.incomeAccountId)))throw Error('Un ingreso apunta a una cuenta inexistente.');
 }
 for(const d of n.debts)if(cents(paid(n,d.id))>cents(d.initial))throw Error('El total pagado supera la deuda '+d.name+'.');
 for(const v of Object.values(n.budgets))if(!Number.isFinite(Number(v))||Number(v)<0)throw Error('Presupuesto inválido.');
 return n;
}
function health(s,month,now=localDate()){
 const ts=s.transactions.filter(t=>t.date.startsWith(month)&&t.date<=now),sum=type=>amount(ts.filter(t=>t.type===type).reduce((a,t)=>a+cents(t.amount),0));
 const income=sum('Ingreso'),expense=sum('Gasto'),payments=sum('Pago de deuda'),saving=sum('Ahorro'),flow=income-expense-payments-saving;
 const budgets=Object.entries(s.budgets).filter(([,v])=>Number(v)>0).map(([category,limit])=>({category,limit:Number(limit),spent:amount(ts.filter(t=>t.type==='Gasto'&&t.category===category).reduce((a,t)=>a+cents(t.amount),0))}));
 const late=s.debts.filter(d=>due(s,d,now).overdue&&balance(s,d)>0);
 const parts=[];if(income>0)parts.push({name:'Flujo del mes',points:flow>=0?100:Math.max(0,100+flow/income*100),detail:flow>=0?'Tus registros muestran disponible positivo.':'Tus salidas registradas superan tus ingresos.'});
 if(budgets.length)parts.push({name:'Presupuesto',points:budgets.filter(b=>b.spent<=b.limit).length/budgets.length*100,detail:budgets.filter(b=>b.spent>b.limit).length+' categorías por encima del límite.'});
 if(s.debts.some(d=>balance(s,d)>0&&due(s,d,now).date))parts.push({name:'Vencimientos',points:late.length?0:100,detail:late.length?late.length+' deudas con fecha vencida y saldo pendiente.':'Sin vencimientos pendientes según tus registros.'});
 return {score:parts.length&&ts.length?Math.round(parts.reduce((a,p)=>a+p.points,0)/parts.length):null,parts,income,expense,payments,saving,flow,budgets,late};
}
const api={cents,amount,key,uid,localDate,dateOK,normalize,paid,balance,schedule,due,accountTotal,validate,health};
if(typeof module!=='undefined')module.exports=api;root.FerliFinance=api;
})(globalThis);

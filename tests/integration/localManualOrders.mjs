// Own disposable PostgreSQL only. No URLs, existing containers, pulls or real data.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { harness, product, line, request, admin, reason } from '../manual-orders/helpers.mjs';

assert.equal(process.argv.length,2,'No external destination arguments accepted');
const root=fileURLToPath(new URL('../../',import.meta.url));
const image='sha256:c141fd17ac6a76c4323e90b3aee8ff1a23d2e89e547c2b963cfadc309c079cc2';
const label='herbolaria.manual.persistence.qa', nonce=randomUUID(), name=`herb-manual-qa-${nonce}`;
const syntheticKey='11'.repeat(32); // Public synthetic test fixture, never a runtime default.
const read=p=>readFileSync(new URL(`../../${p}`,import.meta.url),'utf8');
const migration=read('supabase/migrations/012_manual_orders.sql');
const historical=spawnSync('git',['show','953996dedd86804e27b6b37afd4388091a3e1035:supabase/migrations/011_order_delivery_confirmation.sql'],{cwd:root,encoding:'utf8'});
assert.equal(historical.status,0,'Pinned 011 must exist locally; no downloads/fallbacks');
const delivery=historical.stdout;
const safeEnv=Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|COMSPEC|PATHEXT)$/i.test(k)));
let container,host,db='manual_qa';
const started=Date.now(); let passes=0;
function command(args,input) {
 const r=spawnSync('docker',host?['--host',host,...args]:['--context','desktop-linux',...args],{cwd:root,env:safeEnv,encoding:'utf8',input,timeout:120000,maxBuffer:8*1024*1024});
 if(r.error||r.status!==0) throw new Error(r.error?.message||r.stderr||'Docker failed'); return r.stdout.trim();
}
const args=()=>['exec','-i',container,'psql','-X','-qAt','-h','/tmp','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1'];
const sql=s=>command(args(),s);
function verify() {
 const s=JSON.parse(command(['inspect',container]))[0];
 assert.equal(s.Id,container);assert.equal(s.Name,`/${name}`);assert.equal(s.Image,image);
 assert.equal(s.Config.Labels[label],nonce);assert.equal(s.HostConfig.NetworkMode,'none');assert.equal(s.HostConfig.ReadonlyRootfs,true);
 assert.equal(s.HostConfig.AutoRemove,true);assert.ok(!s.HostConfig.Binds?.length);assert.equal(Object.keys(s.HostConfig.PortBindings??{}).length,0);
 assert.ok(s.HostConfig.Tmpfs['/tmp']);assert.ok(s.Mounts.every(m=>m.Type==='tmpfs'));assert.ok(new Date(s.Created).getTime()>=started-10000);
}
const pass=name=>{passes++;console.log(`PASS ${passes}: ${name}`);};
const fixture=product('synthetic-manual',10000);
const quote=harness({products:[fixture]}).quote(request([line(fixture)],{standardShippingCourtesy:{requested:true,reason}}),admin);
function data(overrides={}) { return {quote,acceptedPricingFingerprint:quote.pricingFingerprint,channel:'whatsapp',otherChannelDetail:null,
 customer:{name:'Cliente sintético',email:'synthetic@example.invalid',phone:'5500000000'},classification:{relationship:'customer',frequency:'new',segment:'retail'},
 profileId:null,profileVersion:null,shippingAddress:{streetAddress:'Calle sintética 1',colonia:'Colonia sintética',city:'Ciudad sintética',state:'Estado sintético',postalCode:'00000',country:'México'},reason,confirmed:true,...overrides}; }
const rpc={create:'manual_create_order',record_payment:'manual_record_payment',void_payment:'manual_void_payment',cancel:'manual_cancel_order',hold:'manual_set_order_hold',ship:'manual_mark_order_shipped'};
function ticket(operation,data,id=randomUUID(),hash,extra={}) {
 const now=Math.floor(Date.now()/1000);
 const payload=JSON.stringify({version:1,operation,commandId:id,requestHash:hash??createHmac('sha256',Buffer.from(syntheticKey,'hex')).update(JSON.stringify(data)).digest('hex'),actor:'shared_admin',issuedAt:now,expiresAt:now+300,data,...extra});
 return {operation,id,payload,signature:createHmac('sha256',Buffer.from(syntheticKey,'hex')).update(payload).digest('hex')};
}
const literal=s=>`'${s.replaceAll("'","''")}'`;
const statement=t=>`SELECT public.${rpc[t.operation]}(${literal(t.payload)},${literal(t.signature)});`;
const invoke=t=>JSON.parse(sql(`SET SESSION AUTHORIZATION service_role;${statement(t)}`));
const expect=(pattern,fn)=>assert.throws(fn,pattern);
const operation=(order,extra={})=>({orderId:order.orderId,expectedVersion:order.version,reason,confirmed:true,...extra});
const receipt=(order,amount,reference=randomUUID(),method='bank_transfer')=>ticket('record_payment',operation(order,{amountCents:amount,reference,method,occurredAt:'2026-01-01T12:00:00Z'}));
function prepare(database,withDelivery=false,cryptoSchema='public') {
 db=database;
 command(['exec','-i',container,'psql','-X','-q','-h','/tmp','-U','postgres','-v','ON_ERROR_STOP=1'],`CREATE DATABASE ${database};`);
 assert.equal(sql("SELECT current_database()||':'||current_setting('listen_addresses');"),`${database}:`);
 if(cryptoSchema==='extensions') sql('CREATE SCHEMA extensions;CREATE EXTENSION pgcrypto WITH SCHEMA extensions;');
 // Roles are cluster-wide and were created in the first database.
 for(const file of readdirSync(new URL('../../supabase/migrations/',import.meta.url)).filter(f=>/^00[1-9]_|^010_/.test(f)).sort()) sql(read(`supabase/migrations/${file}`));
 if(withDelivery) sql(delivery);
}
function provision() { sql(`UPDATE manual_private.configuration SET enabled=true,signing_key=decode('${syntheticKey}','hex');`); }
async function concurrent(a,b) {
 const child=()=>spawn('docker',['--host',host,...args()],{cwd:root,env:safeEnv,stdio:['pipe','pipe','pipe']});
 const first=child();let outA='',errA='';first.stdout.on('data',b=>outA+=b);first.stderr.on('data',b=>errA+=b);
 const endA=new Promise(resolve=>first.on('close',resolve));
 first.stdin.write(`BEGIN;SET LOCAL ROLE service_role;${statement(a)}\n\\echo LOCK_HELD\n`);
 let second;
 try {
  for(let i=0;!outA.includes('LOCK_HELD');i++){if(i>100||first.exitCode!==null)throw new Error(errA||'No first lock');await new Promise(r=>setTimeout(r,50));}
  second=child();let outB='',errB='';second.stdout.on('data',b=>outB+=b);second.stderr.on('data',b=>errB+=b);
  const endB=new Promise(resolve=>second.on('close',resolve));
  second.stdin.end(`SET application_name='manual_qa_waiter';SET statement_timeout='10s';SET ROLE service_role;${statement(b)}`);
  let waiting=false;
  for(let i=0;i<60;i++){waiting=sql("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='manual_qa_waiter' AND wait_event_type='Lock');")==='t';if(waiting)break;await new Promise(r=>setTimeout(r,50));}
  assert.equal(waiting,true,'Second session must demonstrably wait');
  first.stdin.end('COMMIT;\n');assert.equal(await endA,0,errA);const statusB=await endB;
  return {a:JSON.parse(outA.split('\n').find(v=>v.startsWith('{'))),statusB,outB,errB};
 } finally {if(first.exitCode===null)first.stdin.end('ROLLBACK;\n');if(second&&second.exitCode===null)second.kill();}
}
try {
 host=command(['context','inspect','desktop-linux','--format','{{.Endpoints.docker.Host}}']);assert.match(host,/^npipe:\/\/\/\/\.\/pipe\//);
 assert.equal(command(['image','inspect',image,'--format','{{.Id}}']),image);
 container=command(['run','-d','--rm','--pull=never','--name',name,'--label',`${label}=${nonce}`,'--network=none','--read-only','--tmpfs','/tmp:rw,exec,mode=1777','--user','postgres','--entrypoint','/bin/sh',image,'-c','initdb -D /tmp/manual-pg --auth=trust >/tmp/init.log 2>&1 && exec postgres -D /tmp/manual-pg -h "" -k /tmp']);
 verify();console.log(`Verified NEW ${container}; local named pipe, network=none, no ports/binds, tmpfs, read-only root.`);
 let ready=false;for(let i=0;i<60;i++){const r=spawnSync('docker',['--host',host,'exec',container,'pg_isready','-h','/tmp','-U','postgres'],{env:safeEnv,encoding:'utf8'});if(r.status===0){ready=true;break;}await new Promise(r=>setTimeout(r,200));}assert.ok(ready,'New PostgreSQL readiness');
 // First SQL only after verify(). No pre-existing server is used.
 command(['exec','-i',container,'psql','-X','-q','-h','/tmp','-U','postgres','-v','ON_ERROR_STOP=1'],'CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;');
 prepare('manual_qa');sql('GRANT USAGE ON SCHEMA public TO service_role;');
 sql("INSERT INTO public.orders(checkout_attempt_id,external_reference,subtotal_cents,shipping_cents,total_cents) VALUES(gen_random_uuid(),'online-synthetic-history',100,0,100);CREATE TABLE public.qa_history AS SELECT to_jsonb(o) AS row FROM public.orders o;");
 expect(/division by zero/,()=>sql(migration.replace(/COMMIT;\s*$/i,'SELECT 1/0;COMMIT;')));
 assert.equal(sql("SELECT to_regclass('public.manual_payment_entries') IS NULL;"),'t');pass('migration failure before COMMIT leaves no partial schema');
 sql(migration);
 assert.equal(sql("SELECT count(*) FROM public.orders o,public.qa_history h WHERE (to_jsonb(o)-ARRAY['origin','sales_channel','other_channel_detail','manual_state','manual_version','manual_creation_key','customer_profile_id','customer_classification_snapshot','pricing_snapshot','notification_policy'])=h.row;"),'1');pass('historical online snapshot unchanged');
 const firstTicket=ticket('create',data());expect(/manual_module_disabled/,()=>invoke(firstTicket));provision();
 expect(/permission denied/,()=>sql(`SET ROLE anon;${statement(firstTicket)}`));expect(/permission denied/,()=>sql(`SET ROLE authenticated;${statement(firstTicket)}`));
 assert.equal(sql("SELECT has_table_privilege('service_role','manual_private.configuration','SELECT');"),'f');
 assert.equal(sql("SELECT pg_has_role('service_role','herb_manual_executor','MEMBER');"),'f');
 expect(/permission denied/,()=>sql('SET SESSION AUTHORIZATION service_role;SET ROLE herb_manual_executor;'));
 expect(/permission denied/,()=>sql("SET SESSION AUTHORIZATION service_role;SET session_replication_role='replica';"));pass('default disabled and effective RPC/private-key/role permissions');
 expect(/invalid_manual_attestation/,()=>invoke({...firstTicket,signature:'00'.repeat(32)}));
 expect(/invalid_manual_attestation/,()=>invoke({...firstTicket,payload:firstTicket.payload.replace('10000','99999')}));
 expect(/manual_attestation_expired/,()=>invoke(ticket('create',data(),randomUUID(),undefined,{issuedAt:1,expiresAt:2})));pass('forged, modified and expired attestations rejected');
 const order=invoke(firstTicket);assert.equal(order.status,'pending_payment');assert.equal(order.receivedCents,0);assert.equal(order.totalCents,10000);
 assert.equal(sql(`SELECT count(*) FROM public.order_items WHERE order_id='${order.orderId}';`),'1');
 assert.equal(invoke(firstTicket).replayed,true);assert.equal(sql('SELECT count(*) FROM public.customer_profiles;'),'1');
 expect(/manual_idempotency_conflict/,()=>invoke(ticket('create',data({channel:'phone'}),firstTicket.id)));pass('atomic creation, snapshot and idempotent replay');
 const counts=sql('SELECT (SELECT count(*) FROM public.orders)||\':\'||(SELECT count(*) FROM public.customer_profiles);');
 const bad=data({quote:{...quote,lines:[{...quote.lines[0],packageQuantity:100}]}});bad.quote.snapshot={...quote.snapshot,lines:bad.quote.lines};
 expect(/invalid_manual_line/,()=>invoke(ticket('create',bad)));
 assert.equal(sql('SELECT (SELECT count(*) FROM public.orders)||\':\'||(SELECT count(*) FROM public.customer_profiles);'),counts);pass('failed child insert rolls back order, profile and audit');
 for(const [field,value] of [['acceptedPricingFingerprint','0'.repeat(64)],['quote',{...quote,totalCents:0}],['confirmed',false]]) expect(/invalid_manual_quote|manual_confirmation_required/,()=>invoke(ticket('create',data({[field]:value}))));pass('fingerprint, zero total and explicit acceptance enforced');
 expect(/manual_direct_write_forbidden/,()=>sql(`SET ROLE service_role;UPDATE public.orders SET status='approved',paid_at=now() WHERE id='${order.orderId}';`));
 expect(/manual_direct_write_forbidden/,()=>sql(`SET ROLE service_role;UPDATE public.orders SET total_cents=1 WHERE id='${order.orderId}';`));
 expect(/manual_delete_forbidden/,()=>sql(`SET ROLE service_role;DELETE FROM public.orders WHERE id='${order.orderId}';`));
 expect(/permission denied/,()=>sql('SET ROLE service_role;TRUNCATE public.orders CASCADE;'));
 expect(/manual_items_immutable/,()=>sql(`SET ROLE service_role;UPDATE public.order_items SET quantity=2,line_total_cents=unit_price_cents*2 WHERE order_id='${order.orderId}';`));pass('service_role cannot bypass manual snapshots, approval, deletion or truncation');
 const partialTicket=receipt(order,4000,'SYNTHETIC-BANK-REFERENCE');const partial=invoke(partialTicket);
 assert.equal(partial.status,'pending_payment');assert.equal(partial.outstandingCents,6000);assert.equal(invoke(partialTicket).version,2);
 expect(/manual_dispatch_not_authorized/,()=>invoke(ticket('ship',operation(partial,{shippingCarrier:'Synthetic',trackingNumber:'QA',trackingUrl:'https://tracking.invalid/qa'}))));
 expect(/manual_invalid_payment_amount/,()=>invoke(receipt(partial,6001)));
 expect(/manual_version_conflict/,()=>invoke(receipt(order,1)));pass('partial balance, overpayment, optimistic version and unpaid dispatch protection');
 expect(/manual_receipt_reference_unique/,()=>invoke(receipt(partial,1,' synthetic-bank-reference ')));
 const held=invoke(ticket('hold',operation(partial,{onHold:true})));expect(/manual_order_on_hold/,()=>invoke(receipt(held,1)));
 expect(/manual_cancellation_requires_zero_balance/,()=>invoke(ticket('cancel',operation(held))));
 const active=invoke(ticket('hold',operation(held,{onHold:false})));const paid=invoke(receipt(active,6000,'SYNTHETIC-CASH-RECEIPT','cash'));
 assert.equal(paid.status,'approved');assert.ok(paid.paidAt);assert.equal(paid.outstandingCents,0);
 expect(/manual_provider_event_forbidden/,()=>sql(`SET ROLE service_role;INSERT INTO public.payment_events(order_id,provider,event_type,dedupe_key) VALUES('${order.orderId}','mercadopago','fake','synthetic-fake');`));
 assert.equal(sql(`SELECT count(*) FROM public.order_notifications WHERE order_id='${order.orderId}';`),'0');
 for(const fn of ['claim_admin_order_approved_notification','claim_customer_order_approved_notification','claim_customer_order_shipped_email_notification']) assert.equal(sql(`SET SESSION AUTHORIZATION service_role;SELECT count(*) FROM public.${fn}('${order.orderId}');`),'0');
 expect(/manual_notifications_disabled/,()=>sql(`SET SESSION AUTHORIZATION service_role;INSERT INTO public.order_notifications(order_id,notification_type) VALUES('${order.orderId}','customer_order_shipped_email');`));pass('references, hold/release, full approval and no provider/notification side effects');
 const voided=invoke(ticket('void_payment',operation(paid,{receiptId:partial.entryId,confirmedErroneousCapture:true})));
 assert.equal(voided.status,'pending_payment');assert.equal(voided.paidAt,null);assert.equal(voided.receivedCents,6000);
 expect(/manual_payment_adjustment_conflict/,()=>invoke(ticket('void_payment',operation(voided,{receiptId:partial.entryId,confirmedErroneousCapture:true}))));
 const zero=invoke(ticket('void_payment',operation(voided,{receiptId:paid.entryId,confirmedErroneousCapture:true})));const cancelled=invoke(ticket('cancel',operation(zero)));
 assert.equal(cancelled.manualState,'cancelled');expect(/manual_order_cancelled/,()=>invoke(receipt(cancelled,1)));pass('immutable correction ledger, no duplicate void, cancellation only at zero');
 expect(/permission denied/,()=>sql(`SET ROLE service_role;UPDATE public.manual_payment_entries SET amount_cents=1 WHERE order_id='${order.orderId}';`));
 expect(/manual_history_immutable/,()=>sql(`UPDATE public.order_activity_events SET reason='Changed synthetic reason' WHERE order_id='${order.orderId}';`));pass('effective ledger and audit immutability');
 const concurrentTicket=ticket('create',data());const same=await concurrent(concurrentTicket,concurrentTicket);
 assert.equal(same.statusB,0,same.errB);assert.equal(JSON.parse(same.outB.trim()).orderId,same.a.orderId);pass('two actual sessions wait on same key and create one order');
 const paymentOrder=invoke(ticket('create',data()));const race=await concurrent(receipt(paymentOrder,7000),receipt(paymentOrder,7000));
 assert.notEqual(race.statusB,0);assert.match(race.errB,/manual_version_conflict/);assert.equal(sql(`SELECT sum(amount_cents) FROM public.manual_payment_entries WHERE order_id='${paymentOrder.orderId}';`),'7000');pass('concurrent payments serialize; no overpayment or duplicate approval');
 sql(delivery);const dispatchOrder=invoke(ticket('create',data()));const covered=invoke(receipt(dispatchOrder,10000));
 const shipped=invoke(ticket('ship',operation(covered,{shippingCarrier:'Synthetic Courier',trackingNumber:'SYNTHETIC-QA',trackingUrl:'https://tracking.invalid/qa'})));
 assert.equal(shipped.fulfillmentStatus,'shipped');assert.equal(sql(`SELECT count(*) FROM public.order_notifications WHERE order_id='${shipped.orderId}';`),'0');
 expect(/manual_direct_write_forbidden/,()=>sql(`SET ROLE service_role;SELECT public.mark_order_delivered('${shipped.orderId}');`));
 expect(/manual_order_already_shipped/,()=>invoke(ticket('void_payment',operation(shipped,{receiptId:covered.entryId,confirmedErroneousCapture:true}))));pass('011 after 012 preserves controls; signed dispatch works and delivery remains disabled');
 const online=JSON.parse(sql("SELECT row_to_json(o) FROM public.orders o WHERE external_reference='online-synthetic-history';"));
 sql(`SET ROLE service_role;SELECT count(*) FROM public.record_verified_payment('online-synthetic-history','synthetic-mp','approved','approved',100,'synthetic_webhook','synthetic-online-dedupe');`);
 assert.equal(sql(`SELECT status FROM public.orders WHERE id='${online.id}';`),'approved');assert.equal(sql(`SELECT count(*) FROM public.order_notifications WHERE order_id='${online.id}';`),'2');
 sql(`SET ROLE service_role;SELECT count(*) FROM public.mark_order_shipped('${online.id}','Synthetic Courier','SYNTHETIC-ONLINE','https://tracking.invalid/online');SELECT count(*) FROM public.mark_order_delivered('${online.id}');`);
 assert.equal(sql(`SELECT fulfillment_status FROM public.orders WHERE id='${online.id}';`),'delivered');pass('online verified-payment, notification queue, shipping and 011 delivery remain compatible');
 // Same cluster, second NEW database. Role is cluster-wide; remove only the own
 // role after dropping the first disposable database, then test the inverse order.
 db='postgres';sql('DROP DATABASE manual_qa;DROP ROLE herb_manual_executor;');prepare('manual_inverse',true,'extensions');sql('GRANT USAGE ON SCHEMA public TO service_role;');sql(migration);provision();
 const inverse=invoke(ticket('create',data()));assert.equal(inverse.status,'pending_payment');assert.equal(sql("SELECT position('invalid_fulfillment_transition' in pg_get_functiondef('public.prevent_order_fulfillment_reversal()'::regprocedure))>0;"),'t');pass('011 before 012 preserves delivery trigger and manual contract, including pgcrypto in extensions');
 console.log(`ALL ${passes} ISOLATED POSTGRESQL CHECKS PASSED`);
} catch(error) {
 console.error('ISOLATED QA FAILURE:',error.message); throw error;
} finally {
 if(container){
  verify();command(['stop','-t','2',container]);
  let removed=false;
  for(let i=0;i<50;i++){
   if(command(['ps','-aq','--filter',`label=${label}=${nonce}`])===''){removed=true;break;}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.equal(removed,true,'Own auto-removal must complete');
  console.log('Own disposable container removed; both databases and synthetic tmpfs discarded.');
 }
}

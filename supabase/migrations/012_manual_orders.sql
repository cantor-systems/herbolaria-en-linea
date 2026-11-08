-- Proposed only. 011 is reserved in PR #21; this migration never applies it.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.orders IN ACCESS EXCLUSIVE MODE;
CREATE ROLE herb_manual_executor NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname IN ('anon','authenticated','service_role') AND (rolsuper OR rolcreaterole))
  OR pg_catalog.pg_has_role('anon','service_role','MEMBER') OR pg_catalog.pg_has_role('authenticated','service_role','MEMBER') THEN
  RAISE EXCEPTION 'manual_unsafe_api_role_configuration';
 END IF;
END; $$;
CREATE SCHEMA manual_private;
REVOKE ALL ON SCHEMA manual_private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA manual_private, public TO herb_manual_executor;
CREATE TABLE manual_private.configuration (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), enabled boolean NOT NULL DEFAULT false,
 signing_key bytea CHECK(octet_length(signing_key)>=32)
);
INSERT INTO manual_private.configuration(singleton) VALUES(true);
REVOKE ALL ON manual_private.configuration FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON manual_private.configuration TO herb_manual_executor;
CREATE TABLE public.customer_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(char_length(btrim(name)) BETWEEN 2 AND 120 AND name !~ '[[:cntrl:]<>]'),
 email text CHECK(email IS NULL OR (char_length(email) BETWEEN 5 AND 150 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')), phone text NOT NULL CHECK(phone ~ '^[0-9]{10,15}$'),
 classification jsonb NOT NULL CHECK(
  jsonb_typeof(classification)='object' AND classification-ARRAY['relationship','frequency','segment']='{}'::jsonb AND classification ?& ARRAY['relationship','frequency','segment'] AND classification->>'relationship' IS NOT NULL AND classification->>'segment' IS NOT NULL
  AND classification->>'relationship' IN ('prospect','customer') AND classification->>'segment' IN ('retail','wholesale')
  AND ((classification->>'relationship'='prospect' AND classification->'frequency'='null'::jsonb)
   OR (classification->>'relationship'='customer' AND classification->>'frequency' IS NOT NULL AND classification->>'frequency' IN ('new','frequent')))),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ALTER COLUMN checkout_attempt_id DROP NOT NULL,
 ADD COLUMN origin text NOT NULL DEFAULT 'online_checkout', ADD COLUMN sales_channel text, ADD COLUMN other_channel_detail text,
 ADD COLUMN manual_state text, ADD COLUMN manual_version integer, ADD COLUMN manual_creation_key uuid UNIQUE,
 ADD COLUMN customer_profile_id uuid REFERENCES public.customer_profiles(id), ADD COLUMN customer_classification_snapshot jsonb,
 ADD COLUMN pricing_snapshot jsonb, ADD COLUMN notification_policy text NOT NULL DEFAULT 'existing_online';
ALTER TABLE public.orders ADD CONSTRAINT orders_origin_contract CHECK(
 (origin='online_checkout' AND checkout_attempt_id IS NOT NULL AND sales_channel IS NULL AND manual_state IS NULL
  AND manual_creation_key IS NULL AND manual_version IS NULL AND notification_policy='existing_online') OR
 (origin='manual' AND checkout_attempt_id IS NULL AND sales_channel IS NOT NULL AND sales_channel IN ('whatsapp','phone','other')
  AND manual_state IS NOT NULL AND manual_state IN ('active','on_hold','cancelled') AND manual_creation_key IS NOT NULL
  AND manual_version IS NOT NULL AND manual_version>0 AND notification_policy='disabled' AND customer_profile_id IS NOT NULL
  AND customer_classification_snapshot IS NOT NULL AND pricing_snapshot IS NOT NULL AND external_reference='manual_'||id::text
  AND status IN ('pending_payment','approved','cancelled') AND (manual_state='cancelled')=(status='cancelled')
  AND ((sales_channel='other' AND other_channel_detail IS NOT NULL AND char_length(btrim(other_channel_detail)) BETWEEN 2 AND 100)
   OR (sales_channel<>'other' AND other_channel_detail IS NULL))
  AND mercadopago_preference_id IS NULL AND mercadopago_payment_id IS NULL AND mercadopago_preference_expires_at IS NULL
  AND mercadopago_offline_expires_at IS NULL AND provider_status IS NULL AND order_purpose IS NULL
  AND preference_error_code IS NULL AND preference_attempted_at IS NULL AND whatsapp_notifications_opt_in=false
  AND whatsapp_opt_in_at IS NULL AND whatsapp_shipping_notified_at IS NULL));
ALTER TABLE public.order_items ADD COLUMN manual_line_snapshot jsonb;
CREATE TABLE public.manual_order_commands (
 command_id uuid PRIMARY KEY, operation text NOT NULL CHECK(operation IN ('create','record_payment','void_payment','cancel','hold','ship')),
 request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'), order_id uuid NOT NULL REFERENCES public.orders(id),
 result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.manual_payment_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES public.orders(id),
 entry_kind text NOT NULL CHECK(entry_kind IN ('receipt','void_receipt')),
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 9007199254740991),currency text NOT NULL DEFAULT 'MXN' CHECK(currency='MXN'),
 method text NOT NULL CHECK(method IN ('bank_transfer','deposit','cash')),reference text NOT NULL CHECK(char_length(reference) BETWEEN 1 AND 120),
 related_receipt_id uuid REFERENCES public.manual_payment_entries(id),occurred_at timestamptz NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 actor text NOT NULL CHECK(actor='shared_admin'),reason text NOT NULL CHECK(char_length(btrim(reason)) BETWEEN 10 AND 500),command_id uuid NOT NULL UNIQUE,
 CHECK((entry_kind='receipt' AND related_receipt_id IS NULL) OR (entry_kind='void_receipt' AND related_receipt_id IS NOT NULL)));
CREATE UNIQUE INDEX manual_receipt_reference_unique ON public.manual_payment_entries(reference) WHERE entry_kind='receipt';
CREATE UNIQUE INDEX manual_receipt_void_unique ON public.manual_payment_entries(related_receipt_id) WHERE entry_kind='void_receipt';
CREATE INDEX manual_payment_order_idx ON public.manual_payment_entries(order_id);
CREATE TABLE public.manual_order_adjustments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES public.orders(id),
 kind text NOT NULL CHECK(kind IN ('special_percentage','standard_shipping_courtesy')),amount_cents bigint NOT NULL CHECK(amount_cents>0),
 percentage_bps integer CHECK(percentage_bps BETWEEN 0 AND 10000),reason text NOT NULL CHECK(char_length(btrim(reason)) BETWEEN 10 AND 500),
 actor text NOT NULL CHECK(actor='shared_admin'),command_id uuid NOT NULL,UNIQUE(order_id,kind));
CREATE TABLE public.order_activity_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES public.orders(id),command_id uuid NOT NULL UNIQUE,
 event_kind text NOT NULL,actor text NOT NULL CHECK(actor='shared_admin'),reason text NOT NULL CHECK(char_length(btrim(reason)) BETWEEN 10 AND 500),
 previous_state jsonb,next_state jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE FUNCTION manual_private.balance(p_order_id uuid) RETURNS bigint LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(sum(CASE WHEN entry_kind='receipt' THEN amount_cents ELSE -amount_cents END),0)::bigint FROM public.manual_payment_entries WHERE order_id=p_order_id;
$$;
CREATE FUNCTION manual_private.guard_order() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_balance bigint;
BEGIN
 IF TG_OP='DELETE' THEN IF old.origin='manual' THEN RAISE EXCEPTION 'manual_delete_forbidden'; END IF; RETURN old; END IF;
 IF TG_OP='UPDATE' AND old.origin IS DISTINCT FROM new.origin THEN RAISE EXCEPTION 'order_origin_immutable'; END IF;
 IF new.origin<>'manual' THEN RETURN new; END IF;
 IF current_user<>'herb_manual_executor' THEN RAISE EXCEPTION 'manual_direct_write_forbidden'; END IF;
 IF TG_OP='INSERT' THEN
  IF new.status<>'pending_payment' OR new.manual_state<>'active' OR new.fulfillment_status<>'pending' OR new.paid_at IS NOT NULL OR new.manual_version<>1 THEN RAISE EXCEPTION 'invalid_manual_initial_state'; END IF;
 ELSE
  IF (to_jsonb(old)-ARRAY['status','manual_state','manual_version','paid_at','fulfillment_status','shipping_carrier','tracking_number','tracking_url','shipped_at','updated_at','delivered_at','delivery_confirmation_source']) IS DISTINCT FROM
   (to_jsonb(new)-ARRAY['status','manual_state','manual_version','paid_at','fulfillment_status','shipping_carrier','tracking_number','tracking_url','shipped_at','updated_at','delivered_at','delivery_confirmation_source']) THEN RAISE EXCEPTION 'manual_snapshot_immutable'; END IF;
  v_balance:=manual_private.balance(new.id);
  IF (new.status='approved' AND (v_balance<>new.total_cents OR new.paid_at IS NULL)) OR (new.status='pending_payment' AND (v_balance>=new.total_cents OR new.paid_at IS NOT NULL))
   OR (new.status='cancelled' AND (v_balance<>0 OR new.fulfillment_status<>'pending')) THEN RAISE EXCEPTION 'manual_payment_state_mismatch'; END IF;
  IF new.fulfillment_status IN ('shipped','delivered') AND (v_balance<>new.total_cents OR new.status<>'approved' OR new.manual_state<>'active') THEN RAISE EXCEPTION 'manual_dispatch_not_authorized'; END IF;
 END IF;
 RETURN new;
END; $$;
CREATE TRIGGER manual_order_guard BEFORE INSERT OR UPDATE OR DELETE ON public.orders FOR EACH ROW EXECUTE FUNCTION manual_private.guard_order();
CREATE FUNCTION manual_private.guard_item() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_order public.orders%rowtype;
BEGIN
 SELECT * INTO v_order FROM public.orders WHERE id=CASE WHEN TG_OP='DELETE' THEN old.order_id ELSE new.order_id END;
 IF v_order.origin='manual' THEN
  IF TG_OP<>'INSERT' OR current_user<>'herb_manual_executor' OR EXISTS(SELECT 1 FROM public.manual_order_commands WHERE command_id=v_order.manual_creation_key) THEN RAISE EXCEPTION 'manual_items_immutable'; END IF;
  IF new.manual_line_snapshot IS NULL THEN RAISE EXCEPTION 'manual_line_snapshot_required'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND old.order_id IS DISTINCT FROM new.order_id AND (v_order.origin='manual' OR EXISTS(SELECT 1 FROM public.orders WHERE id=old.order_id AND origin='manual')) THEN RAISE EXCEPTION 'item_order_immutable'; END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN old ELSE new END;
END; $$;
CREATE TRIGGER manual_item_guard BEFORE INSERT OR UPDATE OR DELETE ON public.order_items FOR EACH ROW EXECUTE FUNCTION manual_private.guard_item();
CREATE FUNCTION manual_private.guard_payment_event() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.orders WHERE id=new.order_id AND origin='manual') THEN RAISE EXCEPTION 'manual_provider_event_forbidden'; END IF; RETURN new;
END; $$;
CREATE TRIGGER manual_provider_event_guard BEFORE INSERT OR UPDATE ON public.payment_events FOR EACH ROW EXECUTE FUNCTION manual_private.guard_payment_event();
CREATE FUNCTION manual_private.immutable_row() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN RAISE EXCEPTION 'manual_history_immutable'; END; $$;
CREATE TRIGGER immutable_manual_payments BEFORE UPDATE OR DELETE ON public.manual_payment_entries FOR EACH ROW EXECUTE FUNCTION manual_private.immutable_row();
CREATE TRIGGER immutable_manual_commands BEFORE UPDATE OR DELETE ON public.manual_order_commands FOR EACH ROW EXECUTE FUNCTION manual_private.immutable_row();
CREATE TRIGGER immutable_manual_events BEFORE UPDATE OR DELETE ON public.order_activity_events FOR EACH ROW EXECUTE FUNCTION manual_private.immutable_row();
CREATE TRIGGER immutable_manual_adjustments BEFORE UPDATE OR DELETE ON public.manual_order_adjustments FOR EACH ROW EXECUTE FUNCTION manual_private.immutable_row();
CREATE TRIGGER immutable_customer_profiles BEFORE UPDATE OR DELETE ON public.customer_profiles FOR EACH ROW EXECUTE FUNCTION manual_private.immutable_row();
CREATE FUNCTION manual_private.guard_notification() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN IF EXISTS(SELECT 1 FROM public.orders WHERE id=new.order_id AND origin='manual') THEN RAISE EXCEPTION 'manual_notifications_disabled'; END IF; RETURN new; END; $$;
CREATE TRIGGER manual_notification_guard BEFORE INSERT OR UPDATE ON public.order_notifications FOR EACH ROW EXECUTE FUNCTION manual_private.guard_notification();
CREATE OR REPLACE FUNCTION public.enqueue_admin_order_approved_notification() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF new.origin='online_checkout' AND new.status='approved' AND old.status IS DISTINCT FROM 'approved' THEN
  INSERT INTO public.order_notifications(order_id,notification_type,status) VALUES(new.id,'admin_order_approved','pending'),(new.id,'customer_order_approved','pending') ON CONFLICT(order_id,notification_type) DO NOTHING;
 END IF; RETURN new;
END; $$;
CREATE OR REPLACE FUNCTION public.enqueue_customer_order_shipped_email_notification() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF new.origin='online_checkout' AND new.fulfillment_status='shipped' AND old.fulfillment_status IS DISTINCT FROM 'shipped' THEN
  INSERT INTO public.order_notifications(order_id,notification_type,status) VALUES(new.id,'customer_order_shipped_email','pending') ON CONFLICT(order_id,notification_type) DO NOTHING;
 END IF; RETURN new;
END; $$;
CREATE OR REPLACE FUNCTION public.claim_admin_order_approved_notification(p_order_id uuid) RETURNS SETOF public.order_notifications LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN RETURN QUERY UPDATE public.order_notifications SET status='processing',attempts=attempts+1,last_error=null,updated_at=now()
 WHERE order_id=p_order_id AND notification_type='admin_order_approved' AND EXISTS(SELECT 1 FROM public.orders WHERE id=p_order_id AND origin='online_checkout')
 AND (status IN ('pending','failed') OR (status='processing' AND updated_at<now()-interval '15 minutes')) RETURNING *; END; $$;
CREATE OR REPLACE FUNCTION public.claim_customer_order_approved_notification(p_order_id uuid) RETURNS SETOF public.order_notifications LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN RETURN QUERY UPDATE public.order_notifications SET status='processing',attempts=attempts+1,last_error=null,updated_at=now()
 WHERE order_id=p_order_id AND notification_type='customer_order_approved' AND EXISTS(SELECT 1 FROM public.orders WHERE id=p_order_id AND origin='online_checkout')
 AND (status IN ('pending','failed') OR (status='processing' AND updated_at<now()-interval '15 minutes')) RETURNING *; END; $$;
CREATE OR REPLACE FUNCTION public.claim_customer_order_shipped_email_notification(p_order_id uuid) RETURNS SETOF public.order_notifications LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN RETURN QUERY UPDATE public.order_notifications SET status='processing',attempts=attempts+1,last_error=null,updated_at=now()
 WHERE order_id=p_order_id AND notification_type='customer_order_shipped_email' AND EXISTS(SELECT 1 FROM public.orders WHERE id=p_order_id AND origin='online_checkout')
 AND (status IN ('pending','failed') OR (status='processing' AND updated_at<now()-interval '15 minutes')) RETURNING *; END; $$;
CREATE FUNCTION manual_private.verify_ticket(p_payload text,p_signature text,p_operation text) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c manual_private.configuration%rowtype; v jsonb; expected bytea; supplied bytea; mismatch integer:=0; i integer;
BEGIN
 SELECT * INTO c FROM manual_private.configuration WHERE singleton;
 IF c.enabled IS DISTINCT FROM true OR c.signing_key IS NULL THEN RAISE EXCEPTION 'manual_module_disabled'; END IF;
 IF p_payload IS NULL OR octet_length(p_payload)>524288 OR p_signature IS NULL OR p_signature !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid_manual_attestation'; END IF;
 IF pg_catalog.to_regprocedure('extensions.hmac(bytea,bytea,text)') IS NOT NULL THEN expected:=extensions.hmac(convert_to(p_payload,'UTF8'),c.signing_key,'sha256');
 ELSIF pg_catalog.to_regprocedure('public.hmac(bytea,bytea,text)') IS NOT NULL THEN expected:=public.hmac(convert_to(p_payload,'UTF8'),c.signing_key,'sha256');
 ELSE RAISE EXCEPTION 'manual_crypto_unavailable'; END IF;
 supplied:=decode(p_signature,'hex');
 FOR i IN 0..31 LOOP mismatch:=mismatch | (get_byte(expected,i) # get_byte(supplied,i)); END LOOP;
 IF mismatch<>0 THEN RAISE EXCEPTION 'invalid_manual_attestation'; END IF;
 v:=p_payload::jsonb;
 IF v->>'operation' IS DISTINCT FROM p_operation OR v->>'actor' IS DISTINCT FROM 'shared_admin' OR (v->>'version')::integer IS DISTINCT FROM 1
  OR v->>'requestHash' IS NULL OR v->>'requestHash' !~ '^[a-f0-9]{64}$' OR v->>'commandId' IS NULL THEN RAISE EXCEPTION 'invalid_manual_attestation'; END IF;
 RETURN v;
END; $$;
CREATE FUNCTION manual_private.execute_command(p_payload text,p_signature text,p_operation text) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v jsonb; d jsonb; q jsonb; l jsonb; profile public.customer_profiles%rowtype; o public.orders%rowtype; previous jsonb; result jsonb;
 cmd public.manual_order_commands%rowtype; payment public.manual_payment_entries%rowtype;
 v_command_id uuid; v_order_id uuid; v_request_hash text; amount bigint; received bigint; motive text; entry_id uuid; reference text; method text; occurred timestamptz;
BEGIN
 v:=manual_private.verify_ticket(p_payload,p_signature,p_operation);
 v_command_id:=(v->>'commandId')::uuid; v_request_hash:=v->>'requestHash'; d:=v->'data';
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('manual-command:'||v_command_id::text,0));
 SELECT * INTO cmd FROM public.manual_order_commands WHERE command_id=v_command_id;
 IF FOUND THEN
  IF cmd.operation<>p_operation OR cmd.request_hash<>v_request_hash THEN RAISE EXCEPTION 'manual_idempotency_conflict'; END IF;
  RETURN cmd.result||jsonb_build_object('replayed',true);
 END IF;
 IF (v->>'issuedAt')::bigint>extract(epoch FROM clock_timestamp())+30 OR (v->>'expiresAt')::bigint<extract(epoch FROM clock_timestamp())
  OR (v->>'expiresAt')::bigint-(v->>'issuedAt')::bigint NOT BETWEEN 1 AND 300 OR v->>'issuedAt' IS NULL OR v->>'expiresAt' IS NULL THEN RAISE EXCEPTION 'manual_attestation_expired'; END IF;
 motive:=d->>'reason';
 IF motive IS NULL OR char_length(btrim(motive)) NOT BETWEEN 10 AND 500 OR motive ~ '[[:cntrl:]<>]' OR d->'confirmed' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'manual_confirmation_required'; END IF;
 IF p_operation='create' THEN
  q:=d->'quote';
  IF q IS NULL OR q->'blockingReasons' IS DISTINCT FROM '[]'::jsonb OR q->>'pricingFingerprint' IS DISTINCT FROM d->>'acceptedPricingFingerprint'
   OR q->'lines' IS DISTINCT FROM q->'snapshot'->'lines' OR q->'totalCents' IS DISTINCT FROM q->'snapshot'->'totalCents'
   OR q->'subtotalCents' IS DISTINCT FROM q->'snapshot'->'subtotalCents' OR q->'discountCents' IS DISTINCT FROM q->'snapshot'->'discountCents'
   OR q->'shippingCents' IS DISTINCT FROM q->'snapshot'->'shippingCents' OR jsonb_typeof(q->'lines') IS DISTINCT FROM 'array'
   OR jsonb_array_length(q->'lines') NOT BETWEEN 1 AND 50 OR (q->>'totalCents')::bigint NOT BETWEEN 1 AND 9007199254740991
   OR (q->>'subtotalCents')::bigint-(q->>'discountCents')::bigint+(q->>'shippingCents')::bigint<>(q->>'totalCents')::bigint
   OR (SELECT sum((x->>'subtotalCents')::bigint) FROM jsonb_array_elements(q->'lines') x)<>(q->>'subtotalCents')::bigint
   OR (SELECT sum((x->>'appliedDiscountCents')::bigint) FROM jsonb_array_elements(q->'lines') x)<>(q->>'discountCents')::bigint THEN RAISE EXCEPTION 'invalid_manual_quote'; END IF;
  IF char_length(d->'customer'->>'name') NOT BETWEEN 2 AND 120 OR d->'customer'->>'name' IS NULL
   OR d->'customer'->>'phone' IS NULL OR d->'customer'->>'phone' !~ '^[0-9]{10,15}$'
   OR d->'shippingAddress'->>'streetAddress' IS NULL OR char_length(d->'shippingAddress'->>'streetAddress') NOT BETWEEN 3 AND 160
   OR d->'shippingAddress'->>'postalCode' IS NULL OR d->'shippingAddress'->>'postalCode' !~ '^[0-9]{5}$'
   OR d->'shippingAddress'->>'country' IS DISTINCT FROM 'México'
   OR d->'shippingAddress'->>'colonia' IS NULL OR char_length(btrim(d->'shippingAddress'->>'colonia')) NOT BETWEEN 2 AND 100
   OR d->'shippingAddress'->>'city' IS NULL OR char_length(btrim(d->'shippingAddress'->>'city')) NOT BETWEEN 2 AND 100
   OR d->'shippingAddress'->>'state' IS NULL OR char_length(btrim(d->'shippingAddress'->>'state')) NOT BETWEEN 2 AND 100 THEN RAISE EXCEPTION 'invalid_manual_customer'; END IF;
  IF d->>'profileId' IS NOT NULL THEN
   SELECT * INTO profile FROM public.customer_profiles WHERE id=(d->>'profileId')::uuid FOR UPDATE;
   IF NOT FOUND OR profile.version IS DISTINCT FROM (d->>'profileVersion')::integer OR profile.classification IS DISTINCT FROM d->'classification' THEN RAISE EXCEPTION 'manual_profile_conflict'; END IF;
  ELSE
   INSERT INTO public.customer_profiles(name,email,phone,classification) VALUES(d->'customer'->>'name',d->'customer'->>'email',d->'customer'->>'phone',d->'classification') RETURNING * INTO profile;
  END IF;
  v_order_id:=gen_random_uuid();
  INSERT INTO public.orders(id,external_reference,origin,sales_channel,other_channel_detail,manual_state,manual_version,manual_creation_key,customer_profile_id,
   customer_classification_snapshot,pricing_snapshot,notification_policy,status,currency,subtotal_cents,discount_cents,promotion_code,shipping_method,shipping_cents,
   total_cents,customer_name,customer_email,customer_phone,shipping_address)
  VALUES(v_order_id,'manual_'||v_order_id::text,'manual',d->>'channel',d->>'otherChannelDetail','active',1,v_command_id,profile.id,profile.classification,
   q->'snapshot','disabled','pending_payment','MXN',(q->>'subtotalCents')::bigint,(q->>'discountCents')::bigint,
   CASE WHEN q->>'discountMode'='normal' THEN q->'normalDiscountAvailable'->>'promotionCode' END,
   q->'snapshot'->'intent'->>'shippingMethod',(q->>'shippingCents')::bigint,(q->>'totalCents')::bigint,d->'customer'->>'name',d->'customer'->>'email',d->'customer'->>'phone',d->'shippingAddress') RETURNING * INTO o;
  FOR l IN SELECT * FROM jsonb_array_elements(q->'lines') LOOP
   IF (l->>'packageQuantity')::integer NOT BETWEEN 1 AND 99 OR (l->>'unitPriceCents')::bigint<0
    OR (l->>'unitPriceCents')::bigint*(l->>'packageQuantity')::integer<>(l->>'subtotalCents')::bigint THEN RAISE EXCEPTION 'invalid_manual_line'; END IF;
   INSERT INTO public.order_items(order_id,product_slug,product_name,variant_id,variant_label,quantity,unit_price_cents,line_total_cents,manual_line_snapshot)
   VALUES(o.id,l->>'productSlug',l->>'productName',l->>'variantId',l->>'variantLabel',(l->>'packageQuantity')::integer,(l->>'unitPriceCents')::bigint,(l->>'subtotalCents')::bigint,l);
  END LOOP;
  IF q->'specialDiscountApplied'<>'null'::jsonb THEN
   INSERT INTO public.manual_order_adjustments(order_id,kind,amount_cents,percentage_bps,reason,actor,command_id)
   VALUES(o.id,'special_percentage',(q->'specialDiscountApplied'->>'amountCents')::bigint,(q->'specialDiscountRequested'->>'percentageBps')::integer,q->'specialDiscountApplied'->>'reason','shared_admin',v_command_id);
  END IF;
  IF q->'shippingCourtesyApplied'<>'null'::jsonb THEN
   INSERT INTO public.manual_order_adjustments(order_id,kind,amount_cents,reason,actor,command_id)
   VALUES(o.id,'standard_shipping_courtesy',(q->'shippingCourtesyApplied'->>'amountCents')::bigint,q->'shippingCourtesyApplied'->>'reason','shared_admin',v_command_id);
  END IF;
 ELSE
  SELECT * INTO o FROM public.orders WHERE id=(d->>'orderId')::uuid FOR UPDATE;
  IF NOT FOUND OR o.origin<>'manual' THEN RAISE EXCEPTION 'manual_order_not_found'; END IF;
  IF o.manual_version IS DISTINCT FROM (d->>'expectedVersion')::integer THEN RAISE EXCEPTION 'manual_version_conflict'; END IF;
  previous:=jsonb_build_object('status',o.status,'manualState',o.manual_state,'version',o.manual_version,'receivedCents',manual_private.balance(o.id),'paidAt',o.paid_at,'fulfillmentStatus',o.fulfillment_status);
  IF o.manual_state='cancelled' THEN RAISE EXCEPTION 'manual_order_cancelled'; END IF;
  IF o.fulfillment_status<>'pending' THEN RAISE EXCEPTION 'manual_order_already_shipped'; END IF;
  received:=manual_private.balance(o.id);
  IF p_operation='record_payment' THEN
   IF o.manual_state<>'active' THEN RAISE EXCEPTION 'manual_order_on_hold'; END IF;
   amount:=(d->>'amountCents')::bigint; method:=d->>'method'; reference:=upper(btrim(d->>'reference')); occurred:=(d->>'occurredAt')::timestamptz;
   IF amount IS NULL OR amount<=0 OR amount>o.total_cents-received THEN RAISE EXCEPTION 'manual_invalid_payment_amount'; END IF;
   IF reference IS NULL OR reference='' OR reference ~ '[[:cntrl:]<>]' OR occurred IS NULL OR occurred>clock_timestamp()+interval '5 minutes' THEN RAISE EXCEPTION 'manual_invalid_payment'; END IF;
   INSERT INTO public.manual_payment_entries(order_id,entry_kind,amount_cents,method,reference,occurred_at,actor,reason,command_id)
   VALUES(o.id,'receipt',amount,method,reference,occurred,'shared_admin',motive,v_command_id) RETURNING id INTO entry_id;
   received:=received+amount;
   UPDATE public.orders SET status=CASE WHEN received=total_cents THEN 'approved' ELSE 'pending_payment' END,
    paid_at=CASE WHEN received=total_cents THEN clock_timestamp() END,manual_version=manual_version+1 WHERE id=o.id RETURNING * INTO o;
  ELSIF p_operation='void_payment' THEN
   SELECT * INTO payment FROM public.manual_payment_entries WHERE id=(d->>'receiptId')::uuid AND order_id=o.id AND entry_kind='receipt';
   IF NOT FOUND OR EXISTS(SELECT 1 FROM public.manual_payment_entries WHERE related_receipt_id=payment.id) THEN RAISE EXCEPTION 'manual_payment_adjustment_conflict'; END IF;
   IF d->'confirmedErroneousCapture' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'manual_erroneous_capture_confirmation_required'; END IF;
   INSERT INTO public.manual_payment_entries(order_id,entry_kind,amount_cents,method,reference,related_receipt_id,occurred_at,actor,reason,command_id)
   VALUES(o.id,'void_receipt',payment.amount_cents,payment.method,'VOID:'||payment.id::text,payment.id,clock_timestamp(),'shared_admin',motive,v_command_id) RETURNING id INTO entry_id;
   UPDATE public.orders SET status='pending_payment',paid_at=null,manual_version=manual_version+1 WHERE id=o.id RETURNING * INTO o;
  ELSIF p_operation='cancel' THEN
   IF received<>0 THEN RAISE EXCEPTION 'manual_cancellation_requires_zero_balance'; END IF;
   UPDATE public.orders SET status='cancelled',manual_state='cancelled',manual_version=manual_version+1 WHERE id=o.id RETURNING * INTO o;
  ELSIF p_operation='hold' THEN
   IF jsonb_typeof(d->'onHold') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'manual_invalid_hold'; END IF;
   UPDATE public.orders SET manual_state=CASE WHEN (d->>'onHold')::boolean THEN 'on_hold' ELSE 'active' END,manual_version=manual_version+1 WHERE id=o.id RETURNING * INTO o;
  ELSIF p_operation='ship' THEN
   IF received<>o.total_cents OR o.status<>'approved' OR o.manual_state<>'active' THEN RAISE EXCEPTION 'manual_dispatch_not_authorized'; END IF;
   PERFORM public.mark_order_shipped(o.id,d->>'shippingCarrier',d->>'trackingNumber',d->>'trackingUrl');
   UPDATE public.orders SET manual_version=manual_version+1 WHERE id=o.id RETURNING * INTO o;
  ELSE RAISE EXCEPTION 'manual_unknown_operation'; END IF;
 END IF;
 received:=manual_private.balance(o.id);
 result:=jsonb_build_object('commandId',v_command_id,'orderId',o.id,'publicOrderNumber',o.public_order_number,'version',o.manual_version,
  'status',o.status,'manualState',o.manual_state,'receivedCents',received,'outstandingCents',o.total_cents-received,'totalCents',o.total_cents,
  'paidAt',o.paid_at,'fulfillmentStatus',o.fulfillment_status,'entryId',entry_id,'replayed',false);
 INSERT INTO public.manual_order_commands(command_id,operation,request_hash,order_id,result) VALUES(v_command_id,p_operation,v_request_hash,o.id,result);
 INSERT INTO public.order_activity_events(order_id,command_id,event_kind,actor,reason,previous_state,next_state) VALUES(o.id,v_command_id,p_operation,'shared_admin',motive,previous,result);
 RETURN result;
END; $$;
CREATE FUNCTION public.manual_create_order(p_payload text,p_signature text) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT manual_private.execute_command(p_payload,p_signature,'create'); $$;
CREATE FUNCTION public.manual_record_payment(p_payload text,p_signature text) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT manual_private.execute_command(p_payload,p_signature,'record_payment'); $$;
CREATE FUNCTION public.manual_void_payment(p_payload text,p_signature text) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT manual_private.execute_command(p_payload,p_signature,'void_payment'); $$;
CREATE FUNCTION public.manual_cancel_order(p_payload text,p_signature text) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT manual_private.execute_command(p_payload,p_signature,'cancel'); $$;
CREATE FUNCTION public.manual_set_order_hold(p_payload text,p_signature text) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT manual_private.execute_command(p_payload,p_signature,'hold'); $$;
CREATE FUNCTION public.manual_mark_order_shipped(p_payload text,p_signature text) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT manual_private.execute_command(p_payload,p_signature,'ship'); $$;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_payment_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_order_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_order_adjustments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_profiles,public.manual_payment_entries,public.manual_order_commands,public.order_activity_events,public.manual_order_adjustments FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.customer_profiles,public.manual_payment_entries,public.manual_order_commands,public.order_activity_events,public.manual_order_adjustments TO service_role;
GRANT SELECT,INSERT ON public.customer_profiles,public.manual_payment_entries,public.manual_order_commands,public.order_activity_events,public.manual_order_adjustments TO herb_manual_executor;
GRANT SELECT,INSERT,UPDATE ON public.orders TO herb_manual_executor;
GRANT SELECT,INSERT ON public.order_items TO herb_manual_executor;
CREATE POLICY manual_executor_orders ON public.orders TO herb_manual_executor USING(origin='manual') WITH CHECK(origin='manual');
CREATE POLICY manual_executor_items ON public.order_items TO herb_manual_executor USING(EXISTS(SELECT 1 FROM public.orders WHERE id=order_id AND origin='manual')) WITH CHECK(EXISTS(SELECT 1 FROM public.orders WHERE id=order_id AND origin='manual'));
CREATE POLICY manual_executor_profiles ON public.customer_profiles TO herb_manual_executor USING(true) WITH CHECK(true);
CREATE POLICY manual_executor_payments ON public.manual_payment_entries TO herb_manual_executor USING(true) WITH CHECK(true);
CREATE POLICY manual_executor_commands ON public.manual_order_commands TO herb_manual_executor USING(true) WITH CHECK(true);
CREATE POLICY manual_executor_events ON public.order_activity_events TO herb_manual_executor USING(true) WITH CHECK(true);
CREATE POLICY manual_executor_adjustments ON public.manual_order_adjustments TO herb_manual_executor USING(true) WITH CHECK(true);
GRANT EXECUTE ON FUNCTION public.generate_public_order_number(),public.mark_order_shipped(uuid,text,text,text) TO herb_manual_executor;
REVOKE TRUNCATE ON public.orders,public.order_items,public.payment_events,public.order_notifications FROM service_role;
DO $$ BEGIN
 IF pg_catalog.to_regprocedure('extensions.hmac(bytea,bytea,text)') IS NOT NULL THEN
  GRANT USAGE ON SCHEMA extensions TO herb_manual_executor;
  GRANT EXECUTE ON FUNCTION extensions.hmac(bytea,bytea,text) TO herb_manual_executor;
 ELSIF pg_catalog.to_regprocedure('public.hmac(bytea,bytea,text)') IS NOT NULL THEN
  GRANT EXECUTE ON FUNCTION public.hmac(bytea,bytea,text) TO herb_manual_executor;
 ELSE RAISE EXCEPTION 'manual_crypto_unavailable';
 END IF;
END; $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA manual_private FROM PUBLIC,anon,authenticated,service_role;
ALTER FUNCTION manual_private.balance(uuid) OWNER TO herb_manual_executor;
ALTER FUNCTION manual_private.verify_ticket(text,text,text) OWNER TO herb_manual_executor;
ALTER FUNCTION manual_private.execute_command(text,text,text) OWNER TO herb_manual_executor;
ALTER FUNCTION public.manual_create_order(text,text) OWNER TO herb_manual_executor;
ALTER FUNCTION public.manual_record_payment(text,text) OWNER TO herb_manual_executor;
ALTER FUNCTION public.manual_void_payment(text,text) OWNER TO herb_manual_executor;
ALTER FUNCTION public.manual_cancel_order(text,text) OWNER TO herb_manual_executor;
ALTER FUNCTION public.manual_set_order_hold(text,text) OWNER TO herb_manual_executor;
ALTER FUNCTION public.manual_mark_order_shipped(text,text) OWNER TO herb_manual_executor;
REVOKE EXECUTE ON FUNCTION public.manual_create_order(text,text),public.manual_record_payment(text,text),public.manual_void_payment(text,text),public.manual_cancel_order(text,text),public.manual_set_order_hold(text,text),public.manual_mark_order_shipped(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manual_create_order(text,text),public.manual_record_payment(text,text),public.manual_void_payment(text,text),public.manual_cancel_order(text,text),public.manual_set_order_hold(text,text),public.manual_mark_order_shipped(text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

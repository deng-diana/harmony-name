-- ============================================================
-- 012: Atomic Stripe credit grant (idempotency + add_credits in ONE txn)
-- ============================================================
-- Background:
--   The webhook used to do a 3-step choreography in application code:
--     1. INSERT event_id into stripe_processed_events (idempotency claim)
--     2. add_credits()
--     3. on add_credits failure, DELETE the event_id (so a retry can re-run)
--   Step 3 has a race: two concurrent Stripe retries of the SAME event can
--   interleave so that one deletes the idempotency row that the other is
--   relying on, leaving credits ungranted permanently = a paying user loses
--   credits.
--
--   Fix: do the idempotency claim AND the credit grant inside a SINGLE
--   security-definer function, in one transaction. The unique-key INSERT is
--   the lock: whoever wins the INSERT grants the credits; everyone else sees
--   ON CONFLICT DO NOTHING (no row inserted) and returns false = already done.
--   No delete-on-failure step exists, so the race is gone: if the credit
--   grant fails, the whole transaction (including the INSERT) rolls back, so a
--   retry can cleanly re-process. Note a zero-row UPDATE does NOT throw, so a
--   missing profile is caught explicitly via GET DIAGNOSTICS ROW_COUNT and
--   turned into an exception — otherwise the idempotency row would commit and
--   a paying customer's credits would be lost forever.
--
-- Run: copy into the Supabase SQL Editor -> Run
-- ============================================================

create or replace function public.process_stripe_credit(
  p_event_id text,
  p_user_id  uuid,
  p_credits  integer
)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  v_claimed integer;
  v_updated integer;
begin
  if p_credits <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  -- Idempotency claim: only the FIRST insert of this event_id "wins".
  -- ON CONFLICT DO NOTHING => a retry inserts 0 rows and we bail out.
  insert into public.stripe_processed_events (event_id)
  values (p_event_id)
  on conflict (event_id) do nothing;

  get diagnostics v_claimed = row_count;
  if v_claimed = 0 then
    return false;  -- already processed; do NOT grant again
  end if;

  -- First time for this event -> grant the credits atomically.
  update public.profiles
     set credits = credits + p_credits,
         updated_at = now()
   where id = p_user_id;

  -- A zero-row UPDATE (profile row missing) does NOT raise on its own, so the
  -- idempotency INSERT above would otherwise commit and the credits would be
  -- lost forever. Check ROW_COUNT and raise so the whole txn (INSERT included)
  -- rolls back -> the webhook 500s -> Stripe retries -> nothing is lost.
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'PROFILE_NOT_FOUND for user %', p_user_id;
  end if;

  return true;
end;
$$;

-- Only the webhook (service_role) may call this. Users must never grant
-- themselves credits, so revoke from public and grant to service_role only.
revoke all on function public.process_stripe_credit(text, uuid, integer) from public;
grant execute on function public.process_stripe_credit(text, uuid, integer) to service_role;

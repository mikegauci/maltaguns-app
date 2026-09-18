alter table public.profiles
  add column if not exists identity_verified boolean not null default false,
  add column if not exists identity_verified_at timestamptz,
  add column if not exists identity_status text,
  add column if not exists identity_first_name text,
  add column if not exists identity_last_name text,
  add column if not exists identity_document_type text,
  add column if not exists didit_session_id text,
  add column if not exists didit_session_url text,
  add column if not exists didit_session_created_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'id_card_verified'
  ) then
    update public.profiles
    set
      identity_verified = true,
      identity_verified_at = coalesce(updated_at, now()),
      identity_status = 'Approved'
    where id_card_verified = true
      and identity_verified = false;
  end if;
end $$;

create table if not exists public.didit_webhook_events (
  event_id text primary key,
  session_id text,
  status text,
  vendor_data text,
  received_at timestamptz not null default now()
);

create or replace function public.guard_identity_verification_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  if new.identity_verified is distinct from old.identity_verified
    or new.identity_verified_at is distinct from old.identity_verified_at
    or new.identity_status is distinct from old.identity_status
    or new.identity_first_name is distinct from old.identity_first_name
    or new.identity_last_name is distinct from old.identity_last_name
    or new.identity_document_type is distinct from old.identity_document_type
    or new.didit_session_id is distinct from old.didit_session_id
    or new.didit_session_url is distinct from old.didit_session_url
    or new.didit_session_created_at is distinct from old.didit_session_created_at
  then
    raise exception
      'identity verification columns are managed by the Didit webhook';
  end if;

  return new;
end;
$function$;

drop trigger if exists guard_identity_verification_columns on public.profiles;

create trigger guard_identity_verification_columns
before update on public.profiles
for each row
execute function public.guard_identity_verification_columns();

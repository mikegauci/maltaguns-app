alter table public.profiles
  add column if not exists identity_review_notes text[];

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
    or new.identity_review_notes is distinct from old.identity_review_notes
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

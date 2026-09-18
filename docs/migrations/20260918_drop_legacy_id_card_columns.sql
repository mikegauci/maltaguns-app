drop trigger if exists profiles_verification_notify on public.profiles;

create or replace function public.trg_profiles_verification_notify()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if coalesce(old.is_verified, false) = false
    and coalesce(new.is_verified, false) = true
  then
    perform public.insert_notification(
      new.id,
      'license_approved',
      'Firearms license approved',
      'Your firearms license has been approved.',
      '/profile',
      'license_approved:' || new.id::text || ':' || new.updated_at::text
    );
  end if;

  if coalesce(old.identity_verified, false) = false
    and coalesce(new.identity_verified, false) = true
  then
    perform public.insert_notification(
      new.id,
      'identity_approved',
      'Identity verified',
      'Your identity has been verified.',
      '/profile',
      'identity_approved:' || new.id::text || ':' || coalesce(new.identity_verified_at::text, new.updated_at::text, now()::text)
    );
  end if;

  return new;
end;
$function$;

create trigger profiles_verification_notify
after update on public.profiles
for each row
execute function public.trg_profiles_verification_notify();

alter table public.profiles
  drop column if exists id_card_image,
  drop column if exists id_card_verified;

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

  if coalesce(old.identity_status, '') <> 'Declined'
    and coalesce(new.identity_status, '') = 'Declined'
  then
    perform public.insert_notification(
      new.id,
      'identity_declined',
      'Identity verification declined',
      'Your identity verification was not approved. Sign in to your profile to review the details and try again.',
      '/profile',
      'identity_declined:' || new.id::text || ':' || coalesce(new.updated_at::text, now()::text)
    );
  end if;

  return new;
end;
$function$;

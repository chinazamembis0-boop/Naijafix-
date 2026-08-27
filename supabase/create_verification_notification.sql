create or replace function create_verification_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.notifications (user_id, type, title, message, is_read, created_at)
  values (p_user_id, p_type, p_title, p_message, false, now());
end;
$$;

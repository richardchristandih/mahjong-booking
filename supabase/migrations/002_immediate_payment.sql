-- Safe to run more than once. Existing bookings keep their current status.
alter table bookings alter column status set default 'AWAITING_PAYMENT';
alter table settings alter column payment_deadline_minutes set default 3;
update settings set payment_deadline_minutes = 3 where id = 1;

create or replace function create_booking(
  p_reference text, p_name text, p_phone text, p_date date, p_start time, p_end time
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_table tables%rowtype;
  v_settings settings%rowtype;
  v_customer_id bigint;
  v_duration integer;
begin
  select * into v_table from tables where is_active order by id limit 1 for update;
  select * into v_settings from settings where id = 1;
  if v_table.id is null then raise exception 'No active table'; end if;
  v_duration := extract(epoch from (p_end - p_start)) / 60;
  if p_date < (now() at time zone v_settings.timezone)::date
     or p_start < v_settings.opening_time or p_end > v_settings.closing_time
     or v_duration <= 0 or mod(v_duration, v_settings.booking_interval_minutes) <> 0
     or mod(extract(epoch from (p_start - v_settings.opening_time))::integer / 60, v_settings.booking_interval_minutes) <> 0 then
    raise exception 'Invalid booking time';
  end if;
  if p_date = (now() at time zone v_settings.timezone)::date
     and p_start <= (now() at time zone v_settings.timezone)::time then raise exception 'Cannot book past time'; end if;
  if exists (
    select 1 from blocked_times where table_id = v_table.id and date = p_date
      and tsrange(p_date + start_time, p_date + end_time, '[)') && tsrange(p_date + p_start, p_date + p_end, '[)')
  ) then raise exception 'Time is unavailable'; end if;
  insert into customers (name, phone) values (p_name, p_phone) returning id into v_customer_id;
  insert into bookings (
    booking_reference, customer_id, table_id, booking_date, start_time, end_time,
    duration_minutes, hourly_rate, total_amount, status, payment_due_at
  ) values (
    p_reference, v_customer_id, v_table.id, p_date, p_start, p_end,
    v_duration, v_settings.hourly_rate, v_settings.hourly_rate * v_duration / 60,
    'AWAITING_PAYMENT', now() + make_interval(mins => v_settings.payment_deadline_minutes)
  );
  return p_reference;
end $$;

-- Rollback: restore the old defaults and rerun the create_booking function from 001_initial.sql.

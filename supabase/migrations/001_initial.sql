create extension if not exists btree_gist;

create type booking_status as enum (
  'PENDING_APPROVAL', 'AWAITING_PAYMENT', 'PAYMENT_REVIEW', 'CONFIRMED',
  'REJECTED', 'CANCELLED', 'EXPIRED'
);
create type payment_status as enum ('PENDING', 'SUBMITTED', 'CONFIRMED', 'REJECTED');

create table admins (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);
create table tables (
  id bigint generated always as identity primary key,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table customers (
  id bigint generated always as identity primary key,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);
create table bookings (
  id bigint generated always as identity primary key,
  booking_reference text not null unique,
  customer_id bigint not null references customers,
  table_id bigint not null references tables,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  hourly_rate bigint not null check (hourly_rate >= 0),
  total_amount bigint not null check (total_amount >= 0),
  status booking_status not null default 'AWAITING_PAYMENT',
  admin_note text,
  payment_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);
alter table bookings add constraint no_active_booking_overlap
  exclude using gist (
    table_id with =,
    tsrange(booking_date + start_time, booking_date + end_time, '[)') with &&
  ) where (status in ('PENDING_APPROVAL', 'AWAITING_PAYMENT', 'PAYMENT_REVIEW', 'CONFIRMED'));

create table payments (
  id bigint generated always as identity primary key,
  booking_id bigint not null unique references bookings on delete cascade,
  amount bigint not null,
  receipt_url text,
  status payment_status not null default 'PENDING',
  rejection_reason text,
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references admins
);
create table blocked_times (
  id bigint generated always as identity primary key,
  table_id bigint not null references tables,
  date date not null,
  start_time time not null,
  end_time time not null,
  reason text not null,
  created_by uuid references admins,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create table settings (
  id integer primary key default 1 check (id = 1),
  venue_name text not null default 'The Mahjong Room',
  opening_time time not null default '10:00',
  closing_time time not null default '22:00',
  booking_interval_minutes integer not null default 60,
  hourly_rate bigint not null default 50000,
  qris_image_url text,
  qris_account_name text,
  payment_instructions text default 'Scan the QRIS, pay the exact amount, then upload your receipt.',
  payment_deadline_minutes integer not null default 3,
  whatsapp_number text,
  timezone text not null default 'Asia/Jakarta'
);

insert into tables (name) values ('Table 1');
insert into settings (id) values (1);

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

create or replace function create_blocked_time(
  p_table_id bigint, p_date date, p_start time, p_end time, p_reason text, p_admin uuid
) returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  perform 1 from tables where id = p_table_id for update;
  if p_end <= p_start or exists (
    select 1 from bookings where table_id = p_table_id and booking_date = p_date
      and status in ('PENDING_APPROVAL','AWAITING_PAYMENT','PAYMENT_REVIEW','CONFIRMED')
      and tsrange(p_date + start_time, p_date + end_time, '[)') && tsrange(p_date + p_start, p_date + p_end, '[)')
  ) or exists (
    select 1 from blocked_times where table_id = p_table_id and date = p_date
      and tsrange(p_date + start_time, p_date + end_time, '[)') && tsrange(p_date + p_start, p_date + p_end, '[)')
  ) then raise exception 'Time is unavailable'; end if;
  insert into blocked_times(table_id,date,start_time,end_time,reason,created_by)
  values(p_table_id,p_date,p_start,p_end,p_reason,p_admin) returning id into v_id;
  return v_id;
end $$;

create or replace function expire_overdue_bookings() returns void
language sql security definer set search_path = public as $$
  update bookings set status = 'EXPIRED', updated_at = now()
  where status = 'AWAITING_PAYMENT' and payment_due_at < now();
$$;

alter table admins enable row level security;
alter table tables enable row level security;
alter table customers enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;
alter table blocked_times enable row level security;
alter table settings enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

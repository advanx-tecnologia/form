-- Private intake for the Raio-X do Negócio form.
-- Browser access is only through the narrowly scoped RPC below.

create table if not exists public.raio_x_negocio_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique,
  empresa text not null check (char_length(trim(empresa)) between 2 and 200),
  respostas jsonb not null check (jsonb_typeof(respostas) = 'object'),
  anexos jsonb not null default '[]'::jsonb check (jsonb_typeof(anexos) = 'array'),
  origem text not null default 'form-raio-x-negocio',
  drive_file_id text,
  drive_exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.raio_x_negocio_submissions enable row level security;
revoke all on table public.raio_x_negocio_submissions from anon, authenticated;

create or replace function public.submit_raio_x_negocio(
  p_submission_id uuid,
  p_empresa text,
  p_respostas jsonb,
  p_anexos jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_submission_id is null then
    raise exception 'submission_id é obrigatório';
  end if;
  if p_empresa is null or char_length(trim(p_empresa)) < 2 then
    raise exception 'empresa é obrigatória';
  end if;
  if p_respostas is null or jsonb_typeof(p_respostas) <> 'object' then
    raise exception 'respostas inválidas';
  end if;
  if p_anexos is null or jsonb_typeof(p_anexos) <> 'array' then
    raise exception 'anexos inválidos';
  end if;

  insert into public.raio_x_negocio_submissions (submission_id, empresa, respostas, anexos)
  values (p_submission_id, trim(p_empresa), p_respostas, p_anexos)
  on conflict (submission_id) do update
  set empresa = excluded.empresa,
      respostas = excluded.respostas,
      anexos = excluded.anexos,
      updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_raio_x_negocio(uuid, text, jsonb, jsonb) from public;
grant execute on function public.submit_raio_x_negocio(uuid, text, jsonb, jsonb) to anon;

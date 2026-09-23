-- ===============================================================
--  Liina juoksee Mascotiin — tulostaulun tietokanta
--
--  Aja tämä tiedosto kokonaisuudessaan Supabasen SQL Editorissa
--  (liitä → Run). Tiedosto on ajettavissa uudelleen: se ei tuhoa
--  olemassa olevia pelaajia eikä tuloksia.
--
--  Periaate: peli ei koske tauluihin suoraan. Kaikki kulkee
--  palvelinfunktioiden kautta, jotka tarkistavat nimimerkin, PINin
--  ja tuloksen uskottavuuden. Pelin julkinen avain näkee vain
--  funktiot ja yhden rivin versiotaulun, jonka muuttumista
--  seuraamalla tulostaulu päivittyy reaaliajassa.
--
--  Projektin asetuksissa "Automatically expose new tables" on pois
--  päältä, joten oikeudet annetaan tässä käsin grant-lauseilla.
-- ===============================================================

create extension if not exists pgcrypto with schema extensions;


-- ---------------------------------------------------------------
--  Taulut
-- ---------------------------------------------------------------

-- Pelaaja ja hänen paras tuloksensa. nimi_avain on nimimerkin
-- vertailumuoto: pienet kirjaimet ja välilyönnit tiivistettynä, joten
-- "Kalle" ja "kalle " ovat sama nimi.
create table if not exists public.pelaajat (
  id          uuid primary key default gen_random_uuid(),
  nimimerkki  text not null check (char_length(nimimerkki) between 3 and 16),
  nimi_avain  text not null unique,
  paras       integer not null default 0 check (paras >= 0),
  paras_aika  timestamptz,
  luotu       timestamptz not null default now()
);

-- PIN on omassa taulussaan, jotta mikään tulostaulun kysely ei voi
-- vahingossa tuoda sitä mukanaan. Tallessa on vain bcrypt-tiiviste.
create table if not exists public.pelaaja_pin (
  pelaaja_id    uuid primary key references public.pelaajat (id) on delete cascade,
  pin_tiiviste  text not null,
  muutettu      timestamptz not null default now()
);

-- Laitteen istunto. Laite saa satunnaisen tunnuksen, ja tänne
-- tallennetaan vain sen SHA-256-tiiviste. Pelaajalla voi olla monta
-- laitetta yhtä aikaa.
create table if not exists public.istunnot (
  tunnus_tiiviste  text primary key,
  pelaaja_id       uuid not null references public.pelaajat (id) on delete cascade,
  luotu            timestamptz not null default now(),
  viimeksi         timestamptz not null default now()
);
create index if not exists istunnot_pelaaja on public.istunnot (pelaaja_id);

-- Kirjautumisyritykset PINin arvaamisen hidastamiseksi.
create table if not exists public.kirjautumisyritykset (
  id          bigserial primary key,
  nimi_avain  text not null,
  aika        timestamptz not null default now(),
  onnistui    boolean not null
);
create index if not exists kirjautumisyritykset_nimi_aika
  on public.kirjautumisyritykset (nimi_avain, aika desc);

-- Kaikki hyväksytyt suoritukset. Tulostaulu lukee pelaajat-taulua;
-- tämä on historiaa ja väärennösten selvittelyä varten.
create table if not exists public.tulokset (
  id          bigserial primary key,
  pelaaja_id  uuid not null references public.pelaajat (id) on delete cascade,
  pisteet     integer not null,
  matka       integer not null,
  kesto       numeric(8, 2) not null,
  luotu       timestamptz not null default now()
);
create index if not exists tulokset_pelaaja_aika on public.tulokset (pelaaja_id, luotu desc);

-- Kielletyt sanat nimimerkeissä. Vertailu tehdään osamerkkijonona
-- tiivistettyyn muotoon, josta on poistettu välit ja merkit ja jossa
-- numerot on muutettu kirjaimiksi (0→o, 1→i, 3→e, 4→a, 5→s, 7→t).
-- Lisää tai poista sanoja vapaasti tästä taulusta.
create table if not exists public.kielletyt_sanat (
  sana  text primary key
);
insert into public.kielletyt_sanat (sana) values
  ('vittu'), ('vitu'), ('perkele'), ('paska'), ('huora'), ('kyrpa'), ('kyrpä'),
  ('pillu'), ('mulkku'), ('runkk'), ('kusipaa'), ('kusipää'), ('homo'),
  ('neekeri'), ('nekru'), ('natsi'), ('hitler'), ('fuck'), ('shit'),
  ('cunt'), ('nigg'), ('bitch'), ('whore'), ('penis'), ('pussy')
on conflict do nothing;

-- Tulostaulun versio. Yksi rivi, jonka luku kasvaa aina kun joku
-- tulos taulussa muuttuu. Peli seuraa tätä riviä Realtimella ja hakee
-- tulostaulun uudelleen. Näin itse pelaajataulua ei tarvitse avata
-- julkiseksi lainkaan.
create table if not exists public.tulostaulu_versio (
  id        smallint primary key default 1 check (id = 1),
  versio    bigint not null default 0,
  muutettu  timestamptz not null default now()
);
insert into public.tulostaulu_versio (id, versio) values (1, 0)
on conflict (id) do nothing;


-- ---------------------------------------------------------------
--  Rivitason suojaus
--
--  Kaikki taulut lukitaan. Ainoa avoin reikä on versiotaulun luku.
--  Palvelinfunktiot ajetaan omistajan oikeuksin, joten ne pääsevät
--  tauluihin käsiksi lukituksesta huolimatta.
-- ---------------------------------------------------------------

alter table public.pelaajat             enable row level security;
alter table public.pelaaja_pin          enable row level security;
alter table public.istunnot             enable row level security;
alter table public.kirjautumisyritykset enable row level security;
alter table public.tulokset             enable row level security;
alter table public.kielletyt_sanat      enable row level security;
alter table public.tulostaulu_versio    enable row level security;

drop policy if exists "versio luku" on public.tulostaulu_versio;
create policy "versio luku" on public.tulostaulu_versio
  for select to anon, authenticated using (true);

revoke all on public.pelaajat, public.pelaaja_pin, public.istunnot,
              public.kirjautumisyritykset, public.tulokset,
              public.kielletyt_sanat, public.tulostaulu_versio
  from anon, authenticated;
grant select on public.tulostaulu_versio to anon, authenticated;


-- ---------------------------------------------------------------
--  Versiotaulun päivitys
-- ---------------------------------------------------------------

create or replace function public._tulostaulu_muuttui()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.tulostaulu_versio
     set versio = versio + 1, muutettu = now()
   where id = 1;
  return null;
end;
$$;

drop trigger if exists pelaajat_tulostaulu on public.pelaajat;
create trigger pelaajat_tulostaulu
  after insert or delete or update of paras, nimimerkki on public.pelaajat
  for each statement execute function public._tulostaulu_muuttui();


-- ---------------------------------------------------------------
--  Sisäiset apufunktiot (eivät näy pelille)
-- ---------------------------------------------------------------

-- Nimimerkin vertailumuoto.
create or replace function public._nimi_avain(p_nimi text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select lower(regexp_replace(btrim(coalesce(p_nimi, '')), '\s+', ' ', 'g'));
$$;

-- Tarkistaa nimimerkin muodon ja sanat. Palauttaa siistityn nimen.
create or replace function public._tarkista_nimi(p_nimi text)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_nimi       text := regexp_replace(btrim(coalesce(p_nimi, '')), '\s+', ' ', 'g');
  v_puristettu text;
begin
  if v_nimi !~ '^[A-Za-zÅÄÖåäöÉéÜü0-9_. -]{3,16}$'
     or v_nimi !~ '[A-Za-zÅÄÖåäöÉéÜü0-9]' then
    raise exception 'NIMI_MUOTO';
  end if;

  v_puristettu := regexp_replace(
    translate(lower(v_nimi), '013457', 'oieast'),
    '[^a-zåäöéü]', '', 'g');

  if exists (select 1 from public.kielletyt_sanat k
              where position(k.sana in v_puristettu) > 0) then
    raise exception 'NIMI_KIELLETTY';
  end if;

  return v_nimi;
end;
$$;

-- Luo laitteelle uuden istunnon ja palauttaa selväkielisen tunnuksen.
-- Tunnus näytetään vain kerran, tauluun menee sen tiiviste.
create or replace function public._uusi_istunto(p_pelaaja uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_tunnus text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  insert into public.istunnot (tunnus_tiiviste, pelaaja_id)
  values (encode(extensions.digest(v_tunnus, 'sha256'), 'hex'), p_pelaaja);
  return v_tunnus;
end;
$$;

-- Hakee pelaajan istuntotunnuksella.
create or replace function public._pelaaja_tunnuksella(p_tunnus text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_pelaaja uuid;
begin
  if p_tunnus is null or p_tunnus !~ '^[0-9a-f]{64}$' then
    raise exception 'ISTUNTO_VANHENTUNUT';
  end if;

  update public.istunnot
     set viimeksi = now()
   where tunnus_tiiviste = encode(extensions.digest(p_tunnus, 'sha256'), 'hex')
  returning pelaaja_id into v_pelaaja;

  if v_pelaaja is null then
    raise exception 'ISTUNTO_VANHENTUNUT';
  end if;
  return v_pelaaja;
end;
$$;

-- Pelaajan sija: kuinka monella on parempi tulos, plus yksi.
-- Tasapisteissä sama sija.
create or replace function public._sija(p_paras integer)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when p_paras <= 0 then null
              else (select count(*)::int + 1 from public.pelaajat where paras > p_paras)
         end;
$$;


-- ---------------------------------------------------------------
--  Pelin käyttämät funktiot
--
--  Virheet palautetaan koodeina (esim. NIMI_VARATTU), jotka peli
--  kääntää suomenkielisiksi viesteiksi.
-- ---------------------------------------------------------------

-- Uuden nimimerkin varaus. Palauttaa laitteen istuntotunnuksen.
create or replace function public.rekisteroidy(p_nimimerkki text, p_pin text)
returns json
language plpgsql
volatile
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_nimi    text;
  v_pelaaja uuid;
begin
  v_nimi := public._tarkista_nimi(p_nimimerkki);

  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then
    raise exception 'PIN_MUOTO';
  end if;

  begin
    insert into public.pelaajat (nimimerkki, nimi_avain)
    values (v_nimi, public._nimi_avain(v_nimi))
    returning id into v_pelaaja;
  exception when unique_violation then
    raise exception 'NIMI_VARATTU';
  end;

  insert into public.pelaaja_pin (pelaaja_id, pin_tiiviste)
  values (v_pelaaja, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)));

  return json_build_object(
    'tunnus',     public._uusi_istunto(v_pelaaja),
    'nimimerkki', v_nimi,
    'paras',      0,
    'sija',       null
  );
end;
$$;

-- Kirjautuminen olemassa olevaan nimimerkkiin uudella laitteella.
-- Viisi väärää yritystä 15 minuutissa lukitsee nimimerkin
-- kirjautumisen 15 minuutiksi.
--
-- Väärä PIN palautetaan {"virhe": ...}-vastauksena eikä poikkeuksena.
-- Poikkeus peruisi koko transaktion, jolloin epäonnistunut yritys ei
-- tallentuisi ja arvauslaskuri ei koskaan kasvaisi.
create or replace function public.kirjaudu(p_nimimerkki text, p_pin text)
returns json
language plpgsql
volatile
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_avain   text := public._nimi_avain(p_nimimerkki);
  v_rivi    record;
  v_oikein  boolean := false;
begin
  if (select count(*) from public.kirjautumisyritykset
       where nimi_avain = v_avain and not onnistui
         and aika > now() - interval '15 minutes') >= 5 then
    raise exception 'KIRJAUTUMINEN_LUKITTU';
  end if;

  select p.id, p.nimimerkki, p.paras, k.pin_tiiviste
    into v_rivi
    from public.pelaajat p
    join public.pelaaja_pin k on k.pelaaja_id = p.id
   where p.nimi_avain = v_avain;

  if found and coalesce(p_pin, '') ~ '^[0-9]{4}$' then
    v_oikein := extensions.crypt(p_pin, v_rivi.pin_tiiviste) = v_rivi.pin_tiiviste;
  end if;

  insert into public.kirjautumisyritykset (nimi_avain, onnistui)
  values (v_avain, v_oikein);

  if not v_oikein then
    -- Sama viesti väärälle nimelle ja väärälle PINille.
    return json_build_object('virhe', 'VIRHEELLINEN_TUNNUS');
  end if;

  return json_build_object(
    'tunnus',     public._uusi_istunto(v_rivi.id),
    'nimimerkki', v_rivi.nimimerkki,
    'paras',      v_rivi.paras,
    'sija',       public._sija(v_rivi.paras)
  );
end;
$$;

-- Laitteen oma tila: nimimerkki, ennätys ja sija. Kutsutaan kun peli
-- avataan ja laitteella on jo tunnus.
create or replace function public.oma_tila(p_tunnus text)
returns json
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_pelaaja uuid := public._pelaaja_tunnuksella(p_tunnus);
  v_rivi    record;
begin
  select nimimerkki, paras into v_rivi from public.pelaajat where id = v_pelaaja;
  return json_build_object(
    'nimimerkki', v_rivi.nimimerkki,
    'paras',      v_rivi.paras,
    'sija',       public._sija(v_rivi.paras)
  );
end;
$$;

-- Suorituksen tallennus. Tarkistaa uskottavuuden ja päivittää
-- ennätyksen, jos tulos on parempi kuin aiempi.
--
-- Rajat tulevat pelin fysiikasta:
--   vauhti on enintään 31 m/s          → matka ≤ kesto × 31 + 10
--   metriltä 3 pistettä, kolikoista
--   boostilla enintään noin 15/m,
--   tölkit ja laudat noin 2/m          → pisteet ≤ matka × 22 + 500
-- Lisäksi kahden tallennuksen välissä on oltava vähintään 1,5 s.
create or replace function public.tallenna_tulos(
  p_tunnus  text,
  p_pisteet integer,
  p_matka   integer,
  p_kesto   numeric
)
returns json
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_pelaaja   uuid := public._pelaaja_tunnuksella(p_tunnus);
  v_edellinen integer;
  v_uusi      boolean;
  v_paras     integer;
begin
  if p_pisteet is null or p_matka is null or p_kesto is null
     or p_pisteet < 0 or p_pisteet > 5000000
     or p_matka   < 0 or p_matka   > 1000000
     or p_kesto   < 0.5 or p_kesto > 36000
     or p_matka   > p_kesto * 31 + 10
     or p_pisteet > p_matka * 22 + 500 then
    raise exception 'TULOS_HYLATTY';
  end if;

  if exists (select 1 from public.tulokset
              where pelaaja_id = v_pelaaja
                and luotu > now() - interval '1.5 seconds') then
    raise exception 'TULOS_HYLATTY';
  end if;

  insert into public.tulokset (pelaaja_id, pisteet, matka, kesto)
  values (v_pelaaja, p_pisteet, p_matka, p_kesto);

  select paras into v_edellinen from public.pelaajat where id = v_pelaaja for update;
  v_uusi := p_pisteet > v_edellinen;

  if v_uusi then
    update public.pelaajat
       set paras = p_pisteet, paras_aika = now()
     where id = v_pelaaja;
  end if;

  v_paras := greatest(v_edellinen, p_pisteet);
  return json_build_object(
    'uusi_ennatys', v_uusi,
    'edellinen',    v_edellinen,
    'paras',        v_paras,
    'sija',         public._sija(v_paras)
  );
end;
$$;

-- Tulostaulu: kärki 10 ja pyytäjän oma rivi, jos se jää kärjen
-- ulkopuolelle. Tasapisteissä sama sija, ja aiemmin saavutettu tulos
-- listataan ensin. Tunnus on vapaaehtoinen: ilman sitä palautetaan
-- pelkkä kärki.
create or replace function public.tulostaulu(p_tunnus text default null)
returns table (sija integer, nimimerkki text, paras integer, oma boolean)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_pelaaja uuid;
begin
  if p_tunnus is not null then
    begin
      v_pelaaja := public._pelaaja_tunnuksella(p_tunnus);
    exception when others then
      v_pelaaja := null;
    end;
  end if;

  return query
  with jarjestys as (
    select p.id,
           p.nimimerkki,
           p.paras,
           rank() over (order by p.paras desc)::int                   as sija,
           row_number() over (order by p.paras desc, p.paras_aika asc) as rivi
      from public.pelaajat p
     where p.paras > 0
  )
  select j.sija, j.nimimerkki, j.paras, j.id is not distinct from v_pelaaja
    from jarjestys j
   where j.rivi <= 10
      or j.id = v_pelaaja
   order by j.rivi;
end;
$$;


-- Uloskirjautuminen: poistaa tämän laitteen istunnon, jolloin laitteelle
-- jäänyt tunnus ei enää kelpaa. Muiden laitteiden istunnot säilyvät.
create or replace function public.kirjaudu_ulos(p_tunnus text)
returns json
language plpgsql
volatile
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if p_tunnus is not null and p_tunnus ~ '^[0-9a-f]{64}$' then
    delete from public.istunnot
     where tunnus_tiiviste = encode(extensions.digest(p_tunnus, 'sha256'), 'hex');
  end if;
  return json_build_object('ok', true);
end;
$$;


-- ---------------------------------------------------------------
--  Ylläpito (vain SQL Editorista, ei pelille)
--
--  Unohtunut PIN:
--    select public.nollaa_pin('Nimimerkki', '1234');
--
--  Pelaajan poisto (poistaa myös tulokset ja istunnot):
--    delete from public.pelaajat where nimi_avain = lower('Nimimerkki');
-- ---------------------------------------------------------------

create or replace function public.nollaa_pin(p_nimimerkki text, p_uusi_pin text)
returns text
language plpgsql
volatile
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_pelaaja uuid;
begin
  if coalesce(p_uusi_pin, '') !~ '^[0-9]{4}$' then
    raise exception 'PIN_MUOTO';
  end if;
  select id into v_pelaaja from public.pelaajat
   where nimi_avain = public._nimi_avain(p_nimimerkki);
  if v_pelaaja is null then
    raise exception 'Nimimerkkiä % ei löydy', p_nimimerkki;
  end if;
  update public.pelaaja_pin
     set pin_tiiviste = extensions.crypt(p_uusi_pin, extensions.gen_salt('bf', 8)),
         muutettu = now()
   where pelaaja_id = v_pelaaja;
  delete from public.kirjautumisyritykset
   where nimi_avain = public._nimi_avain(p_nimimerkki);
  return 'PIN vaihdettu, lukitus poistettu';
end;
$$;


-- ---------------------------------------------------------------
--  Funktioiden oikeudet
--
--  PostgreSQL antaa funktioille oletuksena suoritusoikeuden kaikille,
--  joten kaikki suljetaan ensin ja pelille avataan vain viisi.
-- ---------------------------------------------------------------

revoke all on function public._tulostaulu_muuttui()          from public, anon, authenticated;
revoke all on function public._nimi_avain(text)              from public, anon, authenticated;
revoke all on function public._tarkista_nimi(text)           from public, anon, authenticated;
revoke all on function public._uusi_istunto(uuid)            from public, anon, authenticated;
revoke all on function public._pelaaja_tunnuksella(text)     from public, anon, authenticated;
revoke all on function public._sija(integer)                 from public, anon, authenticated;
revoke all on function public.nollaa_pin(text, text)         from public, anon, authenticated;
revoke all on function public.rekisteroidy(text, text)       from public, anon, authenticated;
revoke all on function public.kirjaudu(text, text)           from public, anon, authenticated;
revoke all on function public.oma_tila(text)                 from public, anon, authenticated;
revoke all on function public.tallenna_tulos(text, integer, integer, numeric) from public, anon, authenticated;
revoke all on function public.tulostaulu(text)               from public, anon, authenticated;
revoke all on function public.kirjaudu_ulos(text)            from public, anon, authenticated;

grant execute on function public.rekisteroidy(text, text)       to anon, authenticated;
grant execute on function public.kirjaudu(text, text)           to anon, authenticated;
grant execute on function public.oma_tila(text)                 to anon, authenticated;
grant execute on function public.tallenna_tulos(text, integer, integer, numeric) to anon, authenticated;
grant execute on function public.tulostaulu(text)               to anon, authenticated;
grant execute on function public.kirjaudu_ulos(text)            to anon, authenticated;


-- ---------------------------------------------------------------
--  Reaaliaikaisuus: versiotaulu Realtime-julkaisuun
-- ---------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'tulostaulu_versio'
  ) then
    alter publication supabase_realtime add table public.tulostaulu_versio;
  end if;
end;
$$;

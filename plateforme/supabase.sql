-- =============================================================================
-- CREATIVE STUDIO · PLATEFORME V1 · BASE DE DONNÉES (Supabase)
-- À coller UNE fois dans Supabase : SQL Editor > New query > coller > Run.
-- Peut être relancé sans danger : il met à jour les fonctions sans effacer les données.
--
-- Principe (section 5 du document) : l'étanchéité est dans la base, pas dans l'interface.
-- Les tables sont fermées à tout accès direct. Chaque personne passe par des fonctions
-- qui vérifient qui elle est (client, créatif, équipe Studio) et ne renvoient que ce
-- qu'elle a le droit de voir. Un client ne peut techniquement jamais lire un créatif.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------- Tables ----------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'client' check (role in ('client','crea','studio')),
  sous_role text not null default 'tous',
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  -- client
  nom text not null default '', entreprise text not null default '', type text not null default 'Particulier',
  secteur text not null default '', pays text not null default '', langue text not null default 'Français',
  contact text not null default '', source text not null default '',
  marque jsonb not null default '{"couleurs":[],"polices":[],"brief":""}',
  -- créatif
  pseudo text not null default '', specialites text[] not null default '{}', specialites_demandees text[] not null default '{}',
  langues text[] not null default '{}', secteurs text[] not null default '{}', niveau text not null default 'Candidat',
  statut text not null default 'dispo', absent_jusqua timestamptz, capacite int not null default 2, fuseau text not null default '',
  lien_travaux text not null default '', presentation text not null default '',
  score int not null default 70, gains jsonb not null default '{"recu":0,"attente":0}', portfolio jsonb not null default '[]'
);

create sequence if not exists public.cs_order_seq start 1001;

create table if not exists public.orders (
  id text primary key,
  client_id uuid not null references public.profiles(id),
  crea_id uuid references public.profiles(id),
  service text not null, forfait text, state text not null default 'soumise',
  created_at timestamptz not null default now(),
  delai_promis timestamptz, prix numeric, remuneration numeric,
  publication boolean not null default false, parent boolean not null default false, etude_de_cas boolean not null default false,
  brief jsonb not null default '{}', brief_nettoye text,
  offre_ouverte jsonb, offres jsonb not null default '[]', progres text, choix jsonb,
  versions jsonb not null default '[]', retouches jsonb not null default '{"incluses":2,"utilisees":0,"fiches":[]}',
  fil jsonb not null default '{"client":[],"crea":[]}', historique jsonb not null default '[]',
  paiement jsonb not null default '{"statut":"En attente","montant":null}', retour jsonb
);

create table if not exists public.journal (
  id bigserial primary key, at timestamptz not null default now(), who text not null, what text not null, order_id text
);

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.journal enable row level security;
-- Aucune règle d'accès direct : tout passe par les fonctions ci-dessous.

-- ---------- Outils ----------------------------------------------------------
create or replace function public.cs_ms(t timestamptz) returns bigint language sql immutable as
$$ select case when t is null then null else (extract(epoch from t) * 1000)::bigint end $$;

create or replace function public.cs_now() returns bigint language sql stable as
$$ select (extract(epoch from now()) * 1000)::bigint $$;

create or replace function public.cs_me() returns public.profiles language sql stable security definer set search_path = public as
$$ select * from profiles where id = auth.uid() and actif $$;

create or replace function public.cs_label(st text) returns text language sql immutable as $$
  select case st when 'soumise' then 'Nouvelle' when 'qualification' then 'À qualifier' when 'dispatch' then 'En dispatch'
    when 'attribuee' then 'Attribuée' when 'production' then 'En production' when 'controle' then 'En contrôle'
    when 'livree' then 'Livrée' when 'retouche' then 'Retouches' when 'terminee' then 'Terminée'
    when 'annulee' then 'Annulée' when 'litige' then 'Litige' else st end $$;

-- Coordonnées masquées : téléphone, e-mail, lien, messagerie externe (section 11)
create or replace function public.cs_mask(t text) returns jsonb language plpgsql immutable as $$
declare o text := coalesce(t, '');
begin
  o := regexp_replace(o, '\+?(\d[ .-]?){8,}\d', '[coordonnée masquée]', 'g');
  o := regexp_replace(o, '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}', '[coordonnée masquée]', 'g');
  o := regexp_replace(o, '(https?://|www\.)[^ ]+', '[coordonnée masquée]', 'gi');
  o := regexp_replace(o, '(whatsapp|wa\.me|linkedin|instagram|telegram)', '[coordonnée masquée]', 'gi');
  return jsonb_build_object('text', o, 'flagged', o <> coalesce(t, ''));
end $$;

create or replace function public.cs_log(p_who text, p_what text, p_order text default null) returns void
language sql security definer set search_path = public as
$$ insert into journal(who, what, order_id) values (p_who, p_what, p_order) $$;

create or replace function public.cs_state(p_id text, p_state text, p_who text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update orders set state = p_state,
    historique = historique || jsonb_build_array(jsonb_build_object('state', p_state, 'by', p_who, 'at', cs_now()))
  where id = p_id;
  perform cs_log(p_who, p_id || ' → ' || cs_label(p_state), p_id);
end $$;

create or replace function public.cs_say(p_id text, p_side text, p_from text, p_text text, p_extra jsonb default '{}') returns void
language sql security definer set search_path = public as $$
  update orders set fil = jsonb_set(fil, array[p_side],
    coalesce(fil -> p_side, '[]') || jsonb_build_array(jsonb_build_object('from', p_from, 'text', p_text, 'at', cs_now()) || p_extra))
  where id = p_id $$;

create or replace function public.cs_order(p_id text) returns public.orders language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = p_id for update;
  if o.id is null then raise exception 'Commande introuvable'; end if;
  return o;
end $$;

create or replace function public.cs_need(p_role text) returns public.profiles language plpgsql security definer set search_path = public as $$
declare m profiles := cs_me();
begin
  if m.id is null then raise exception 'Connectez-vous d''abord'; end if;
  if p_role is not null and m.role <> p_role then raise exception 'Action non autorisée pour ce compte'; end if;
  return m;
end $$;

-- ---------- Création du profil à l'inscription ------------------------------
-- Une inscription crée un client ou un créatif candidat. Jamais un compte Studio.
create or replace function public.cs_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
        r text := case when m ->> 'role' = 'crea' then 'crea' else 'client' end;
begin
  insert into profiles(id, email, role, nom, entreprise, type, secteur, pays, langue, contact, source,
                       pseudo, specialites_demandees, langues, secteurs, fuseau, lien_travaux, presentation)
  values (new.id, new.email, r, coalesce(m ->> 'nom', ''), coalesce(m ->> 'entreprise', ''),
          case when coalesce(m ->> 'entreprise', '') <> '' then 'Entreprise' else 'Particulier' end,
          coalesce(m ->> 'secteur', ''), coalesce(m ->> 'pays', ''), coalesce(m ->> 'langue', 'Français'),
          coalesce(nullif(m ->> 'contact', ''), new.email, ''), coalesce(m ->> 'source', ''),
          coalesce(m ->> 'pseudo', ''),
          coalesce(array(select jsonb_array_elements_text(m -> 'specialites')), '{}'),
          coalesce(array(select jsonb_array_elements_text(m -> 'langues')), '{}'),
          coalesce(array(select jsonb_array_elements_text(m -> 'secteurs')), '{}'),
          coalesce(m ->> 'fuseau', ''), coalesce(m ->> 'lien_travaux', ''), coalesce(m ->> 'presentation', ''))
  on conflict (id) do nothing;
  if r = 'crea' then perform cs_log('Système', 'Nouvelle candidature de créatif : ' || coalesce(m ->> 'pseudo', new.email)); end if;
  return new;
end $$;

drop trigger if exists cs_on_auth_user_created on auth.users;
create trigger cs_on_auth_user_created after insert on auth.users for each row execute procedure public.cs_new_user();

-- ---------- Vues JSON selon la personne -------------------------------------
create or replace function public.cs_client_json(p public.profiles) returns jsonb language sql stable as $$
  select jsonb_build_object('id', p.id, 'nom', p.nom, 'entreprise', p.entreprise, 'type', p.type, 'secteur', p.secteur,
    'pays', p.pays, 'langue', p.langue, 'contact', p.contact, 'source', p.source, 'marque', p.marque, 'email', p.email) $$;

create or replace function public.cs_crea_json(p public.profiles, full_access boolean) returns jsonb language sql stable as $$
  select case when full_access then jsonb_build_object('id', p.id, 'pseudo', coalesce(nullif(p.pseudo, ''), p.nom), 'nom', p.nom, 'email', p.email,
      'specialites', to_jsonb(p.specialites), 'specialitesDemandees', to_jsonb(p.specialites_demandees), 'langues', to_jsonb(p.langues),
      'secteurs', to_jsonb(p.secteurs), 'niveau', p.niveau, 'statut', p.statut, 'absentJusqua', cs_ms(p.absent_jusqua),
      'capacite', p.capacite, 'fuseau', p.fuseau, 'contact', p.contact, 'score', p.score, 'gains', p.gains,
      'portfolio', p.portfolio, 'lienTravaux', p.lien_travaux, 'presentation', p.presentation, 'createdAt', cs_ms(p.created_at))
  else jsonb_build_object('id', p.id, 'pseudo', coalesce(nullif(p.pseudo, ''), p.nom), 'specialites', to_jsonb(p.specialites),
      'langues', to_jsonb(p.langues), 'niveau', p.niveau, 'secteurs', to_jsonb(p.secteurs)) end $$;

create or replace function public.cs_strip(a jsonb) returns jsonb language sql immutable as
$$ select coalesce(jsonb_agg(m - 'brut'), '[]'::jsonb) from jsonb_array_elements(coalesce(a, '[]'::jsonb)) m $$;

create or replace function public.cs_order_json(o public.orders, r text, uid uuid) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', o.id, 'service', o.service, 'forfait', o.forfait, 'state', o.state, 'createdAt', cs_ms(o.created_at),
    'delaiPromis', cs_ms(o.delai_promis), 'publication', o.publication, 'parent', o.parent, 'progres', o.progres,
    'retouches', case when r = 'crea' then jsonb_set(o.retouches, '{fiches}', coalesce((select jsonb_agg(f - 'brut') from jsonb_array_elements(o.retouches -> 'fiches') f), '[]')) else o.retouches end,
    'historique', o.historique,
    'clientId', case when r = 'crea' then null else o.client_id end,
    'creaId', case when r = 'client' then null else o.crea_id end,
    'prix', case when r = 'crea' then null else o.prix end,
    'remuneration', case when r = 'client' then null else o.remuneration end,
    'brief', case when r = 'crea' then o.brief - 'reponses' || jsonb_build_object('reponses', '[]'::jsonb) else o.brief end,
    'briefNettoye', case when r = 'client' then null
                         when r = 'crea' then coalesce(o.brief_nettoye, (select string_agg(x, E'\n') from jsonb_array_elements_text(o.brief -> 'reponses') x where x <> ''))
                         else o.brief_nettoye end,
    'offreOuverte', case when r = 'client' then null when r = 'crea' then o.offre_ouverte - 'cibles' else o.offre_ouverte end,
    'offres', case when r = 'studio' then o.offres when r = 'crea' then coalesce((select jsonb_agg(f) from jsonb_array_elements(o.offres) f where f ->> 'creaId' = uid::text), '[]') else '[]' end,
    'choix', o.choix,
    'versions', case when r = 'client' then coalesce((select jsonb_agg(v - 'note' - 'consigne') from jsonb_array_elements(o.versions) v where v ->> 'statut' = 'validee'), '[]') else o.versions end,
    'fil', case when r = 'studio' then o.fil
                when r = 'client' then jsonb_build_object('client', cs_strip(o.fil -> 'client'), 'crea', '[]'::jsonb)
                else jsonb_build_object('client', '[]'::jsonb, 'crea', cs_strip(o.fil -> 'crea')) end,
    'paiement', case when r = 'crea' then jsonb_build_object('statut', '') else o.paiement end,
    'retour', case when r = 'crea' then null else o.retour end,
    'etudeDeCas', o.etude_de_cas) $$;

create or replace function public.cs_snapshot() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare m profiles := cs_me(); r text;
begin
  if m.id is null then return jsonb_build_object('me', null); end if;
  r := m.role;
  return jsonb_build_object(
    'me', jsonb_build_object('id', m.id, 'role', r, 'email', m.email, 'sousRole', m.sous_role),
    'equipe', jsonb_build_object('sousRole', m.sous_role),
    'clients', case when r = 'studio' then coalesce((select jsonb_agg(cs_client_json(p) order by p.created_at desc) from profiles p where p.role = 'client'), '[]')
                    when r = 'client' then jsonb_build_array(cs_client_json(m)) else '[]' end,
    'creatifs', case when r = 'studio' then coalesce((select jsonb_agg(cs_crea_json(p, true) order by p.created_at desc) from profiles p where p.role = 'crea'), '[]')
                     when r = 'crea' then jsonb_build_array(cs_crea_json(m, true)) || coalesce((select jsonb_agg(cs_crea_json(p, false)) from profiles p where p.role = 'crea' and p.actif and p.id <> m.id and p.niveau <> 'Candidat'), '[]')
                     else '[]' end,
    'orders', coalesce((select jsonb_agg(cs_order_json(o, r, m.id) order by o.created_at desc) from orders o
                where r = 'studio' or (r = 'client' and o.client_id = m.id)
                   or (r = 'crea' and (o.crea_id = m.id or (o.state = 'dispatch' and coalesce(o.offre_ouverte -> 'cibles', '[]') ? m.id::text)))), '[]'),
    'contacts', case when r = 'studio' then coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'at', cs_ms(k.at), 'nom', k.nom, 'prenom', k.prenom, 'telephone', k.telephone, 'email', k.email, 'reseaux', k.reseaux, 'traite', k.traite) order by k.at desc)
                 from (select * from contacts order by at desc limit 200) k), '[]') else '[]' end,
    'journal', case when r = 'studio' then coalesce((select jsonb_agg(jsonb_build_object('at', cs_ms(j.at), 'who', j.who, 'what', j.what) order by j.at desc)
                 from (select * from journal order by at desc limit 200) j), '[]') else '[]' end);
end $$;

-- ---------- Profil ----------------------------------------------------------
create or replace function public.cs_update_me(p jsonb) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need(null);
begin
  update profiles set
    nom = coalesce(p ->> 'nom', nom), entreprise = coalesce(p ->> 'entreprise', entreprise), pays = coalesce(p ->> 'pays', pays),
    langue = coalesce(p ->> 'langue', langue), contact = coalesce(p ->> 'contact', contact), source = coalesce(p ->> 'source', source),
    secteur = coalesce(p ->> 'secteur', secteur),
    type = case when coalesce(p ->> 'entreprise', entreprise) <> '' then 'Entreprise' else 'Particulier' end,
    marque = case when p ? 'brief' then jsonb_set(marque, '{brief}', to_jsonb(p ->> 'brief')) else marque end,
    statut = case when m.role = 'crea' and p ->> 'statut' in ('dispo', 'occupe', 'absent') then p ->> 'statut' else statut end,
    absent_jusqua = case when m.role = 'crea' and p ? 'absentJusqua' then to_timestamp((p ->> 'absentJusqua')::bigint / 1000.0) else absent_jusqua end
  where id = m.id;
end $$;

create or replace function public.cs_portfolio_add(p jsonb) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('crea');
begin
  if coalesce(p ->> 'path', '') not like 'portfolio/' || m.id::text || '/%' then raise exception 'Fichier non valide'; end if;
  update profiles set portfolio = jsonb_build_array(jsonb_build_object('titre', coalesce(nullif(p ->> 'titre', ''), 'Travail'),
    'secteur', p ->> 'secteur', 'format', p ->> 'format', 'path', p ->> 'path', 'pub', 'Privé', 'at', cs_now())) || portfolio
  where id = m.id;
end $$;

-- ---------- Client ----------------------------------------------------------
create or replace function public.cs_create_order(p jsonb) returns text language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('client'); nid text;
begin
  if coalesce(p ->> 'service', '') = '' then raise exception 'Service manquant'; end if;
  if p ? 'profil' then perform cs_update_me(p -> 'profil'); end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p -> 'brief' -> 'refs', '[]')) f where coalesce(f ->> 'path', '') not like 'refs/' || m.id::text || '/%') then
    raise exception 'Fichier de référence non valide';
  end if;
  nid := 'CS-' || nextval('cs_order_seq');
  insert into orders(id, client_id, service, forfait, brief, publication, parent, historique)
  values (nid, m.id, p ->> 'service', p ->> 'forfait', coalesce(p -> 'brief', '{}'), coalesce((p ->> 'publication')::boolean, false),
          coalesce((p ->> 'parent')::boolean, false), jsonb_build_array(jsonb_build_object('state', 'soumise', 'by', 'Client', 'at', cs_now())));
  perform cs_log('Client', nid || ' → Nouvelle commande', nid);
  return nid;
end $$;

create or replace function public.cs_c_pick(p_id text, p_k text) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('client'); o orders := cs_order(p_id);
begin
  if o.client_id <> m.id or o.choix is null or p_k not in ('a', 'b') then raise exception 'Action impossible'; end if;
  update orders set choix = jsonb_set(choix, '{pick}', to_jsonb(p_k)) where id = p_id;
  perform cs_say(p_id, 'crea', 'studio', 'Le client a choisi la piste ' || upper(p_k) || '.');
  perform cs_log('Client', p_id || ' : piste ' || upper(p_k) || ' choisie', p_id);
end $$;

create or replace function public.cs_c_publication(p_id text, p_on boolean) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('client'); o orders := cs_order(p_id);
begin
  if o.client_id <> m.id then raise exception 'Action impossible'; end if;
  update orders set publication = p_on where id = p_id;
end $$;

create or replace function public.cs_c_retouche(p_id text, p_text text) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('client'); o orders := cs_order(p_id); n int;
begin
  if o.client_id <> m.id or o.state <> 'livree' then raise exception 'Action impossible'; end if;
  if (o.retouches ->> 'utilisees')::int >= (o.retouches ->> 'incluses')::int then raise exception 'Plus de retouche incluse dans cette formule'; end if;
  n := jsonb_array_length(o.retouches -> 'fiches') + 1;
  update orders set retouches = jsonb_set(jsonb_set(retouches, '{utilisees}', to_jsonb((retouches ->> 'utilisees')::int + 1)), '{fiches}',
    (retouches -> 'fiches') || jsonb_build_array(jsonb_build_object('n', n, 'brut', p_text, 'reformule', null, 'at', cs_now())))
  where id = p_id;
  perform cs_state(p_id, 'retouche', 'Client');
end $$;

create or replace function public.cs_finish(p_id text, p_who text) returns void language plpgsql security definer set search_path = public as $$
declare o orders := cs_order(p_id);
begin
  perform cs_state(p_id, 'terminee', p_who);
  if o.crea_id is not null and o.remuneration is not null then
    update profiles set gains = jsonb_set(gains, '{attente}', to_jsonb(coalesce((gains ->> 'attente')::numeric, 0) + o.remuneration)) where id = o.crea_id;
  end if;
end $$;

create or replace function public.cs_c_validate(p_id text) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('client'); o orders := cs_order(p_id);
begin
  if o.client_id <> m.id or o.state <> 'livree' then raise exception 'Action impossible'; end if;
  perform cs_finish(p_id, 'Client');
end $$;

create or replace function public.cs_c_feedback(p_id text, p jsonb) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('client'); o orders := cs_order(p_id);
begin
  if o.client_id <> m.id or o.state <> 'terminee' or o.retour is not null then raise exception 'Action impossible'; end if;
  update orders set retour = jsonb_build_object('q', least(5, greatest(1, (p ->> 'q')::int)), 'd', least(5, greatest(1, (p ->> 'd')::int)),
    'c', least(5, greatest(1, (p ->> 'c')::int)), 'comment', left(coalesce(p ->> 'comment', ''), 2000), 'again', coalesce((p ->> 'again')::boolean, false), 'at', cs_now())
  where id = p_id;
  perform cs_log('Client', p_id || ' : avis envoyé', p_id);
end $$;

create or replace function public.cs_c_add_refs(p_id text, p_files jsonb) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('client'); o orders := cs_order(p_id);
begin
  if o.client_id <> m.id or o.state in ('terminee', 'annulee') then raise exception 'Action impossible'; end if;
  if jsonb_array_length(coalesce(p_files, '[]')) = 0 then return; end if;
  if exists (select 1 from jsonb_array_elements(p_files) f where coalesce(f ->> 'path', '') not like 'refs/' || m.id::text || '/%') then raise exception 'Fichier non valide'; end if;
  update orders set brief = jsonb_set(brief, '{refs}', coalesce(brief -> 'refs', '[]') || p_files) where id = p_id;
  perform cs_say(p_id, 'client', 'client', jsonb_array_length(p_files) || ' fichier(s) de référence ajouté(s).');
end $$;

create or replace function public.cs_c_cancel(p_id text) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('client'); o orders := cs_order(p_id);
begin
  if o.client_id <> m.id or o.state not in ('soumise', 'qualification', 'dispatch') then raise exception 'Cette commande ne peut plus être annulée ici'; end if;
  perform cs_state(p_id, 'annulee', 'Client');
end $$;

-- ---------- Messages (deux fils relayés) ------------------------------------
create or replace function public.cs_msg(p_id text, p_side text, p_text text, p_question boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need(null); o orders := cs_order(p_id); k jsonb;
begin
  if coalesce(trim(p_text), '') = '' then return; end if;
  if m.role = 'studio' then
    if p_side not in ('client', 'crea') then raise exception 'Fil inconnu'; end if;
    perform cs_say(p_id, p_side, 'studio', left(p_text, 4000), case when p_question then '{"question":true}'::jsonb else '{}'::jsonb end);
  elsif m.role = 'client' then
    if o.client_id <> m.id then raise exception 'Action impossible'; end if;
    k := cs_mask(left(p_text, 4000));
    perform cs_say(p_id, 'client', 'client', k ->> 'text', case when (k ->> 'flagged')::boolean then jsonb_build_object('masque', true, 'brut', p_text) else '{}'::jsonb end);
    if (k ->> 'flagged')::boolean then perform cs_log('Système', p_id || ' : coordonnée masquée dans un message client', p_id); end if;
  else
    if o.crea_id is distinct from m.id then raise exception 'Action impossible'; end if;
    k := cs_mask(left(p_text, 4000));
    perform cs_say(p_id, 'crea', 'crea', k ->> 'text', case when (k ->> 'flagged')::boolean then jsonb_build_object('masque', true, 'brut', p_text) else '{}'::jsonb end);
    if (k ->> 'flagged')::boolean then perform cs_log('Système', p_id || ' : coordonnée masquée dans un message créatif', p_id); end if;
  end if;
end $$;

-- ---------- Créatif ---------------------------------------------------------
create or replace function public.cs_k_accept(p_id text, p_delai text) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('crea'); o orders := cs_order(p_id);
begin
  if o.state <> 'dispatch' or not (coalesce(o.offre_ouverte -> 'cibles', '[]') ? m.id::text) then raise exception 'Cette offre n''est plus ouverte'; end if;
  if exists (select 1 from jsonb_array_elements(o.offres) f where f ->> 'creaId' = m.id::text) then return; end if;
  update orders set offres = offres || jsonb_build_array(jsonb_build_object('creaId', m.id, 'delai', left(p_delai, 40), 'at', cs_now())) where id = p_id;
  perform cs_log(coalesce(nullif(m.pseudo, ''), m.nom), p_id || ' : mission acceptée, délai proposé ' || p_delai, p_id);
end $$;

create or replace function public.cs_k_decline(p_id text) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('crea'); o orders := cs_order(p_id);
begin
  update orders set offre_ouverte = jsonb_set(offre_ouverte, '{cibles}', coalesce((select jsonb_agg(c) from jsonb_array_elements(offre_ouverte -> 'cibles') c where c #>> '{}' <> m.id::text), '[]'))
  where id = p_id and offre_ouverte is not null;
end $$;

create or replace function public.cs_k_progress(p_id text, p_p text) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('crea'); o orders := cs_order(p_id);
begin
  if o.crea_id is distinct from m.id or o.state not in ('attribuee', 'production', 'retouche') then raise exception 'Action impossible'; end if;
  if p_p not in ('Démarré', 'Pistes envoyées', 'En affinage', 'Prêt à livrer', 'Bloqué') then raise exception 'État inconnu'; end if;
  update orders set progres = p_p where id = p_id;
  if o.state = 'attribuee' then perform cs_state(p_id, 'production', 'Créatif'); end if;
  perform cs_log(coalesce(nullif(m.pseudo, ''), m.nom), p_id || ' : avancement « ' || p_p || ' »', p_id);
end $$;

create or replace function public.cs_k_deliver(p_id text, p_kind text, p_note text, p_files jsonb) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('crea'); o orders := cs_order(p_id); f jsonb;
begin
  if o.crea_id is distinct from m.id or o.state not in ('attribuee', 'production', 'retouche') then raise exception 'Action impossible'; end if;
  if jsonb_array_length(coalesce(p_files, '[]')) = 0 then raise exception 'Ajoutez au moins un fichier'; end if;
  if p_kind = 'pistes' and jsonb_array_length(p_files) <> 2 then raise exception 'Déposez exactement deux pistes (A et B)'; end if;
  for f in select * from jsonb_array_elements(p_files) loop
    if coalesce(f ->> 'path', '') not like 'livrables/' || p_id || '/%' then raise exception 'Fichier non valide'; end if;
  end loop;
  update orders set progres = 'Prêt à livrer', versions = versions || jsonb_build_array(jsonb_build_object(
      'n', jsonb_array_length(versions) + 1, 'kind', case when p_kind = 'pistes' then 'pistes' else 'livrable' end,
      'statut', 'soumise', 'note', left(coalesce(p_note, ''), 4000), 'fichiers', p_files, 'at', cs_now()))
  where id = p_id;
  perform cs_state(p_id, 'controle', 'Créatif');
end $$;

-- ---------- Équipe Studio ---------------------------------------------------
create or replace function public.cs_s_take(p_id text) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('studio'); o orders := cs_order(p_id);
begin
  if o.state <> 'soumise' then raise exception 'Déjà prise en charge'; end if;
  perform cs_state(p_id, 'qualification', 'Accueil Studio');
end $$;

create or replace function public.cs_targets(p_service text) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(id), '[]') from profiles
  where role = 'crea' and actif and niveau <> 'Candidat' and statut = 'dispo' and (p_service = 'surmesure' or p_service = any(specialites)) $$;

create or replace function public.cs_s_launch(p_id text, p jsonb) returns int language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('studio'); o orders := cs_order(p_id); t jsonb;
begin
  if o.state not in ('qualification', 'dispatch') then raise exception 'Prenez d''abord la commande en charge'; end if;
  t := cs_targets(o.service);
  update orders set
    prix = case when nullif(p ->> 'prix', '') is null then null else (p ->> 'prix')::numeric end,
    remuneration = case when nullif(p ->> 'remuneration', '') is null then remuneration else (p ->> 'remuneration')::numeric end,
    delai_promis = case when nullif(p ->> 'delai', '') is null then null else to_timestamp((p ->> 'delai')::bigint / 1000.0) end,
    retouches = jsonb_set(retouches, '{incluses}', to_jsonb(coalesce((p ->> 'retouches')::int, 2))),
    brief_nettoye = nullif(p ->> 'briefNettoye', ''),
    offre_ouverte = jsonb_build_object('at', cs_now(), 'fin', cs_now() + 4 * 3600 * 1000, 'cibles', t),
    paiement = case when paiement ->> 'statut' = 'En attente' and nullif(p ->> 'prix', '') is not null
                    then jsonb_build_object('statut', 'À régler', 'montant', (p ->> 'prix')::numeric) else paiement end
  where id = p_id;
  if o.state = 'qualification' then
    perform cs_say(p_id, 'client', 'studio', 'Merci ! Votre demande est claire, nous composons votre équipe créative.');
    perform cs_state(p_id, 'dispatch', 'Accueil Studio');
  end if;
  return jsonb_array_length(t);
end $$;

create or replace function public.cs_s_relaunch(p_id text) returns int language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('studio'); o orders := cs_order(p_id); t jsonb;
begin
  if o.state <> 'dispatch' then raise exception 'Action impossible'; end if;
  t := cs_targets(o.service);
  update orders set offre_ouverte = jsonb_build_object('at', cs_now(), 'fin', cs_now() + 4 * 3600 * 1000, 'cibles', t) where id = p_id;
  perform cs_log('Dispatch Studio', p_id || ' : offre relancée', p_id);
  return jsonb_array_length(t);
end $$;

create or replace function public.cs_s_assign(p_id text, p_crea uuid) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('studio'); o orders := cs_order(p_id); c profiles;
begin
  select * into c from profiles where id = p_crea and role = 'crea' and actif;
  if c.id is null then raise exception 'Créatif introuvable'; end if;
  if o.state not in ('dispatch', 'qualification') then raise exception 'Action impossible'; end if;
  update orders set crea_id = c.id, offre_ouverte = null where id = p_id;
  perform cs_say(p_id, 'crea', 'studio', 'Mission confirmée. Échéance : ' || coalesce(to_char(o.delai_promis, 'DD/MM/YYYY'), 'à préciser') || '.');
  perform cs_say(p_id, 'client', 'studio', 'Votre équipe créative est constituée. Première piste attendue très vite.');
  perform cs_state(p_id, 'attribuee', 'Dispatch Studio');
end $$;

create or replace function public.cs_s_approve(p_id text) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('studio'); o orders := cs_order(p_id); i int; v jsonb;
begin
  if o.state <> 'controle' then raise exception 'Rien à contrôler'; end if;
  select (ord - 1)::int, e into i, v from jsonb_array_elements(o.versions) with ordinality as x(e, ord) where e ->> 'statut' = 'soumise' order by ord desc limit 1;
  if v is null then raise exception 'Aucune version à contrôler'; end if;
  if v ->> 'kind' = 'pistes' then
    update orders set versions = jsonb_set(versions, array[i::text, 'statut'], '"pistes"'),
      choix = jsonb_build_object('a', v -> 'fichiers' -> 0, 'b', v -> 'fichiers' -> 1, 'pick', null) where id = p_id;
    perform cs_say(p_id, 'client', 'studio', 'Deux pistes vous attendent : choisissez celle qui vous parle le plus.');
    perform cs_say(p_id, 'crea', 'studio', 'Vos deux pistes ont été transmises au client.');
    perform cs_state(p_id, 'production', 'Contrôle Studio');
  else
    update orders set versions = jsonb_set(versions, array[i::text, 'statut'], '"validee"') where id = p_id;
    perform cs_say(p_id, 'client', 'studio', 'Votre livraison est prête. Vous pouvez la télécharger et la valider, ou demander une retouche.');
    perform cs_say(p_id, 'crea', 'studio', 'Version ' || (v ->> 'n') || ' validée et livrée au client.');
    perform cs_state(p_id, 'livree', 'Contrôle Studio');
  end if;
end $$;

create or replace function public.cs_s_reject(p_id text, p_consigne text) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('studio'); o orders := cs_order(p_id); i int; v jsonb;
begin
  if o.state <> 'controle' or coalesce(trim(p_consigne), '') = '' then raise exception 'Écrivez une consigne'; end if;
  select (ord - 1)::int, e into i, v from jsonb_array_elements(o.versions) with ordinality as x(e, ord) where e ->> 'statut' = 'soumise' order by ord desc limit 1;
  update orders set versions = jsonb_set(jsonb_set(versions, array[i::text, 'statut'], '"refusee"'), array[i::text, 'consigne'], to_jsonb(p_consigne)) where id = p_id;
  perform cs_say(p_id, 'crea', 'studio', 'Version ' || (v ->> 'n') || ' à corriger : ' || p_consigne);
  perform cs_state(p_id, case when jsonb_array_length(o.retouches -> 'fiches') > 0 and exists (select 1 from jsonb_array_elements(o.versions) e where e ->> 'statut' = 'validee') then 'retouche' else 'production' end, 'Contrôle Studio');
end $$;

create or replace function public.cs_s_fiche(p_id text, p_text text, p_motif text) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('studio'); o orders := cs_order(p_id); i int := jsonb_array_length(o.retouches -> 'fiches') - 1;
begin
  if i < 0 then raise exception 'Aucune demande de retouche'; end if;
  update orders set retouches = jsonb_set(jsonb_set(retouches, array['fiches', i::text, 'reformule'], to_jsonb(p_text)), array['fiches', i::text, 'motif'], to_jsonb(p_motif)) where id = p_id;
  perform cs_say(p_id, 'crea', 'studio', 'Fiche de retouche n°' || (i + 1) || ' disponible dans la mission.');
  perform cs_log('Contrôle Studio', p_id || ' : fiche de retouche n°' || (i + 1) || ' envoyée (' || p_motif || ')', p_id);
end $$;

create or replace function public.cs_s_forward(p_id text, p_side text, p_idx int) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('studio'); o orders := cs_order(p_id); t text;
begin
  t := o.fil -> p_side -> p_idx ->> 'text';
  if t is null then raise exception 'Message introuvable'; end if;
  if p_side = 'client' then
    if o.crea_id is null then raise exception 'Aucun créatif attribué'; end if;
    perform cs_say(p_id, 'crea', 'studio', 'Message du client, relu par le Studio : ' || (cs_mask(t) ->> 'text'));
  else
    perform cs_say(p_id, 'client', 'studio', 'De la part de l''équipe créative : ' || (cs_mask(t) ->> 'text'));
  end if;
  perform cs_log('Équipe Studio', p_id || ' : message transféré après relecture', p_id);
end $$;

create or replace function public.cs_s_do(p_id text, p_what text) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('studio'); o orders := cs_order(p_id);
begin
  if p_what = 'close' then
    if o.state <> 'livree' then raise exception 'Action impossible'; end if;
    perform cs_finish(p_id, 'Plateforme (silence du client)');
  elsif p_what = 'case' then
    if not o.publication then raise exception 'Le client n''a pas autorisé la publication'; end if;
    update orders set etude_de_cas = true where id = p_id;
    perform cs_log('Équipe Studio', p_id || ' : étude de cas préparée pour la vitrine', p_id);
  elsif p_what = 'litige' then perform cs_state(p_id, 'litige', 'Équipe Studio');
  elsif p_what = 'cancel' then
    update orders set paiement = jsonb_set(paiement, '{statut}', case when paiement ->> 'statut' = 'Payé' then '"Remboursé"' else paiement -> 'statut' end) where id = p_id;
    perform cs_state(p_id, 'annulee', 'Équipe Studio');
  elsif p_what = 'paid' then
    update orders set paiement = jsonb_set(paiement, '{statut}', '"Payé"') where id = p_id;
    perform cs_log('Finance Studio', p_id || ' : règlement enregistré', p_id);
  else raise exception 'Action inconnue'; end if;
end $$;

create or replace function public.cs_s_certify(p_crea uuid, p jsonb) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('studio');
begin
  update profiles set
    niveau = case when p ->> 'niveau' in ('Candidat', 'Certifié', 'Confirmé', 'Référent') then p ->> 'niveau' else niveau end,
    specialites = case when p ? 'specialites' then array(select jsonb_array_elements_text(p -> 'specialites')) else specialites end,
    score = case when p ? 'score' then least(100, greatest(0, (p ->> 'score')::int)) else score end,
    actif = case when p ? 'actif' then (p ->> 'actif')::boolean else actif end
  where id = p_crea and role = 'crea';
  perform cs_log('Équipe Studio', 'Créatif mis à jour : niveau ' || coalesce(p ->> 'niveau', '—'));
end $$;

create or replace function public.cs_s_subrole(p_sr text) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('studio');
begin
  if p_sr not in ('tous', 'accueil', 'dispatch', 'controle', 'finance') then raise exception 'Sous-rôle inconnu'; end if;
  update profiles set sous_role = p_sr where id = m.id;
end $$;

-- ---------- Formulaire de contact de l'accueil -----------------------------
create table if not exists public.contacts (
  id bigserial primary key, at timestamptz not null default now(), nom text, prenom text, telephone text,
  email text, reseaux text, traite boolean not null default false
);
alter table public.contacts enable row level security;

create or replace function public.cs_contact(p jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p ->> 'email', '') !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' or coalesce(trim(p ->> 'nom'), '') = '' then raise exception 'Formulaire incomplet'; end if;
  if (select count(*) from contacts where email = p ->> 'email' and at > now() - interval '1 hour') >= 3 then raise exception 'Trop de messages envoyés, réessayez plus tard'; end if;
  insert into contacts(nom, prenom, telephone, email, reseaux)
  values (left(p ->> 'nom', 120), left(p ->> 'prenom', 120), left(p ->> 'telephone', 40), left(p ->> 'email', 200), left(p ->> 'reseaux', 300));
  perform cs_log('Site', 'Nouveau message de contact : ' || left(coalesce(p ->> 'prenom', '') || ' ' || coalesce(p ->> 'nom', ''), 120));
end $$;

create or replace function public.cs_s_contact_done(p_id bigint) returns void language plpgsql security definer set search_path = public as $$
declare m profiles := cs_need('studio');
begin update contacts set traite = true where id = p_id; end $$;

-- ---------- Droits d'exécution ----------------------------------------------
revoke all on all functions in schema public from public, anon;
grant execute on function public.cs_snapshot(), public.cs_update_me(jsonb), public.cs_portfolio_add(jsonb), public.cs_create_order(jsonb),
  public.cs_c_pick(text, text), public.cs_c_publication(text, boolean), public.cs_c_retouche(text, text), public.cs_c_validate(text),
  public.cs_c_feedback(text, jsonb), public.cs_c_cancel(text), public.cs_c_add_refs(text, jsonb), public.cs_msg(text, text, text, boolean), public.cs_k_accept(text, text),
  public.cs_k_decline(text), public.cs_k_progress(text, text), public.cs_k_deliver(text, text, text, jsonb), public.cs_s_take(text),
  public.cs_s_launch(text, jsonb), public.cs_s_relaunch(text), public.cs_s_assign(text, uuid), public.cs_s_approve(text),
  public.cs_s_reject(text, text), public.cs_s_fiche(text, text, text), public.cs_s_forward(text, text, int), public.cs_s_do(text, text),
  public.cs_s_certify(uuid, jsonb), public.cs_s_subrole(text), public.cs_s_contact_done(bigint)
  to authenticated;
grant execute on function public.cs_contact(jsonb) to anon, authenticated;

-- ---------- Fichiers (stockage privé) ---------------------------------------
-- refs/<client>/…        références envoyées par le client avec sa commande
-- livrables/<commande>/… fichiers déposés par le créatif
-- portfolio/<créatif>/…  travaux du créatif
insert into storage.buckets (id, name, public) values ('cs-fichiers', 'cs-fichiers', false) on conflict (id) do nothing;

create or replace function public.cs_can_write(p_name text) returns boolean language plpgsql stable security definer set search_path = public as $$
declare m profiles := cs_me(); a text[] := string_to_array(p_name, '/');
begin
  if m.id is null then return false; end if;
  if m.role = 'studio' then return true; end if;
  if a[1] in ('refs', 'portfolio') then return a[2] = m.id::text; end if;
  if a[1] = 'livrables' then
    return exists (select 1 from orders o where o.id = a[2] and o.crea_id = m.id and o.state in ('attribuee', 'production', 'retouche'));
  end if;
  return false;
end $$;

create or replace function public.cs_can_read(p_name text) returns boolean language plpgsql stable security definer set search_path = public as $$
declare m profiles := cs_me(); a text[] := string_to_array(p_name, '/');
begin
  if m.id is null then return false; end if;
  if m.role = 'studio' then return true; end if;
  if a[1] = 'refs' then
    return a[2] = m.id::text or exists (select 1 from orders o, jsonb_array_elements(coalesce(o.brief -> 'refs', '[]')) f
      where f ->> 'path' = p_name and (o.crea_id = m.id or (o.state = 'dispatch' and coalesce(o.offre_ouverte -> 'cibles', '[]') ? m.id::text)));
  end if;
  if a[1] = 'portfolio' then return a[2] = m.id::text or m.role = 'crea'; end if;
  if a[1] = 'livrables' then
    return exists (select 1 from orders o where o.id = a[2] and (
      o.crea_id = m.id
      or (o.client_id = m.id and (
            exists (select 1 from jsonb_array_elements(o.versions) v, jsonb_array_elements(v -> 'fichiers') f where v ->> 'statut' = 'validee' and f ->> 'path' = p_name)
         or o.choix -> 'a' ->> 'path' = p_name or o.choix -> 'b' ->> 'path' = p_name))));
  end if;
  return false;
end $$;

grant execute on function public.cs_can_read(text), public.cs_can_write(text) to authenticated;

drop policy if exists "cs lecture" on storage.objects;
drop policy if exists "cs envoi" on storage.objects;
create policy "cs lecture" on storage.objects for select to authenticated using (bucket_id = 'cs-fichiers' and public.cs_can_read(name));
create policy "cs envoi" on storage.objects for insert to authenticated with check (bucket_id = 'cs-fichiers' and public.cs_can_write(name));

-- =============================================================================
-- APRÈS VOTRE PREMIÈRE INSCRIPTION SUR LE SITE : donnez-vous l'accès Équipe Studio.
-- Remplacez l'adresse ci-dessous par la vôtre, puis lancez UNIQUEMENT cette ligne :
-- update public.profiles set role = 'studio', sous_role = 'tous' where email = 'votre@adresse.com';
-- =============================================================================

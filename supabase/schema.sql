-- =====================================================
--  Mastère Poulet — script Supabase COMPLET (un seul script)
--  Supabase → SQL Editor → New query → coller TOUT → Run
--  ⚠️ Le début efface les anciennes tables : on repart de zéro.
-- =====================================================

-- 0) On supprime tout ce qui existait (si ça existe)
drop table if exists commandes;
drop table if exists etudiants;
drop table if exists plats;

-- 1) Les plats (6 colonnes, dont 1 booléen : dispo)
create table plats (
  id         bigint generated always as identity primary key,
  nom        text not null,
  prix       numeric(5,2) not null check (prix >= 0),
  categorie  text not null,          -- etudiant / classique / saint_ouen / dessert
  dispo      boolean not null default true,
  image_url  text
);

-- 2) Les cartes étudiantes reconnues (numéro à 8 chiffres)
create table etudiants (
  numero  text primary key check (numero ~ '^[0-9]{8}$'),
  nom     text not null
);

-- 3) Les commandes validées
--    On ne stocke JAMAIS la carte complète ni le CVV : seulement les 4 derniers chiffres.
create table commandes (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  articles    jsonb not null,
  total       numeric(6,2) not null check (total >= 0),
  reduction   boolean not null default false,
  titulaire   text not null,
  carte_fin   text not null check (carte_fin ~ '^[0-9]{4}$')
);

-- 4) Sécurité : RLS activé SANS policy sur les 3 tables.
--    Avec la clé publique, personne ne peut lire ni écrire.
--    Seul notre serveur Express (clé secrète) y a accès.
alter table plats enable row level security;
alter table etudiants enable row level security;
alter table commandes enable row level security;

-- 5) Les plats de départ (images : TheMealDB, https://www.themealdb.com/api.php)
insert into plats (nom, prix, categorie, dispo, image_url) values
-- Menu étudiant
('Le Partiel Raté',          4.50, 'etudiant',   true,  'https://www.themealdb.com/images/media/meals/wuyd2h1765655837.jpg'),
('Le Rattrapage',            3.90, 'etudiant',   false, 'https://www.themealdb.com/images/media/meals/1529446352.jpg'),
('L''Alternant',             5.50, 'etudiant',   true,  'https://www.themealdb.com/images/media/meals/cj56fs1762340001.jpg'),
('Le Boursier',              4.90, 'etudiant',   true,  'https://www.themealdb.com/images/media/meals/qxytrx1511304021.jpg'),
-- Les classiques
('Le Master Crispy',         8.90, 'classique',  true,  'https://www.themealdb.com/images/media/meals/40r49m1763197022.jpg'),
('Le Tandoori du Master',    9.50, 'classique',  true,  'https://www.themealdb.com/images/media/meals/qptpvt1487339892.jpg'),
('Le Karaage Zero-Day',      8.50, 'classique',  true,  'https://www.themealdb.com/images/media/meals/tyywsw1505930373.jpg'),
('Le Kung Pao Firewall',     9.00, 'classique',  true,  'https://www.themealdb.com/images/media/meals/1525872624.jpg'),
('Les Brochettes Phishing',  7.90, 'classique',  true,  'https://www.themealdb.com/images/media/meals/3um6il1763794322.jpg'),
-- Menu Saint-Ouen
('Le Spécial Saint-Ouen',   11.00, 'saint_ouen', true,  'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg'),
('La Mairie Gourmande',     10.50, 'saint_ouen', true,  'https://www.themealdb.com/images/media/meals/uwvxpv1511557015.jpg'),
('Le Conseil Municipal',    12.00, 'saint_ouen', false, 'https://www.themealdb.com/images/media/meals/qpxvuq1511798906.jpg'),
-- Desserts
('Le Brownie Bug Bounty',    3.50, 'dessert',    true,  'https://www.themealdb.com/images/media/meals/yypvst1511386427.jpg'),
('Le Churros Root',          3.00, 'dessert',    true,  'https://www.themealdb.com/images/media/meals/nxnny61763250596.jpg'),
('Le Cheesecake Chiffré',    3.90, 'dessert',    true,  'https://www.themealdb.com/images/media/meals/swttys1511385853.jpg'),
('Le Flan Firewall',         3.50, 'dessert',    true,  'https://www.themealdb.com/images/media/meals/0s80wo1764374393.jpg');

-- 6) Numéros étudiants de test pour la démo
insert into etudiants (numero, nom) values
('20260001', 'Étudiant Test 1'),
('20260002', 'Étudiant Test 2'),
('20260003', 'Étudiant Test 3');

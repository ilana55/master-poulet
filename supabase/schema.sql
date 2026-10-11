-- =====================================================
--  Mastère Poulet — script Supabase
--  À coller dans Supabase : SQL Editor → New query → Run
-- =====================================================

-- 1) La table (6 colonnes, dont 1 booléen : dispo)
create table plats (
  id         bigint generated always as identity primary key,
  nom        text not null,
  prix       numeric(5,2) not null check (prix >= 0),  -- la base refuse aussi les prix négatifs
  categorie  text not null,                             -- etudiant / classique / saint_ouen / dessert
  dispo      boolean not null default true,
  image_url  text
);

-- 2) Sécurité : on active le Row Level Security SANS créer de policy.
--    Résultat : avec la clé publique (anon), personne ne peut lire ni écrire.
--    Seul notre serveur Express, qui utilise la clé secrète, peut accéder à la table.
alter table plats enable row level security;

-- 3) Les données de départ (images : TheMealDB, https://www.themealdb.com/api.php)
insert into plats (nom, prix, categorie, dispo, image_url) values
-- Menu étudiant (petits prix)
('Le Partiel Raté',          4.50, 'etudiant',   true,  'https://www.themealdb.com/images/media/meals/wuyd2h1765655837.jpg'),
('Le Rattrapage',            3.90, 'etudiant',   false, 'https://www.themealdb.com/images/media/meals/1529446352.jpg'),
('L''Alternant',             5.50, 'etudiant',   true,  'https://www.themealdb.com/images/media/meals/cj56fs1762340001.jpg'),
('Le Boursier',              4.90, 'etudiant',   true,  'https://www.themealdb.com/images/media/meals/qxytrx1511304021.jpg'),
-- Menu classique (les grands classiques du Master)
('Le Master Crispy',         8.90, 'classique',  true,  'https://www.themealdb.com/images/media/meals/40r49m1763197022.jpg'),
('Le Tandoori du Master',    9.50, 'classique',  true,  'https://www.themealdb.com/images/media/meals/qptpvt1487339892.jpg'),
('Le Karaage Zero-Day',      8.50, 'classique',  true,  'https://www.themealdb.com/images/media/meals/tyywsw1505930373.jpg'),
('Le Kung Pao Firewall',     9.00, 'classique',  true,  'https://www.themealdb.com/images/media/meals/1525872624.jpg'),
('Les Brochettes Phishing',  7.90, 'classique',  true,  'https://www.themealdb.com/images/media/meals/3um6il1763794322.jpg'),
-- Menu Saint-Ouen (à renommer selon votre idée)
('Le Spécial Saint-Ouen',   11.00, 'saint_ouen', true,  'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg'),
('La Mairie Gourmande',     10.50, 'saint_ouen', true,  'https://www.themealdb.com/images/media/meals/uwvxpv1511557015.jpg'),
('Le Conseil Municipal',    12.00, 'saint_ouen', false, 'https://www.themealdb.com/images/media/meals/qpxvuq1511798906.jpg'),
-- Desserts
('Le Brownie Bug Bounty',    3.50, 'dessert',    true,  'https://www.themealdb.com/images/media/meals/yypvst1511386427.jpg'),
('Le Churros Root',          3.00, 'dessert',    true,  'https://www.themealdb.com/images/media/meals/nxnny61763250596.jpg'),
('Le Cheesecake Chiffré',    3.90, 'dessert',    true,  'https://www.themealdb.com/images/media/meals/swttys1511385853.jpg');

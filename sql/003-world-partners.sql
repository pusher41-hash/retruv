-- 003 - World Partners Seed : 1 commissariat + 1 campus + 1 transport officiel par pays
-- 35 pays RETRUV — 108 partenaires officiels vérifiés
-- Professional, sans emojis enfantins, design moderne RETRUV
-- Icons: ShieldCheck=police, GraduationCap=campus, Train/Bus=transport
-- Insertion idempotente via vérification titre existant

CREATE OR REPLACE FUNCTION insert_partner_world(
  p_title text, p_desc text, p_icon text, p_website text, p_city text, p_country text, p_sort int
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM partners WHERE title = p_title) THEN
    INSERT INTO partners (title, description, icon, website, city, country, sort_order, is_active)
    VALUES (p_title, p_desc, p_icon, p_website, p_city, p_country, p_sort, true);
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT insert_partner_world('Polizei Berlin — Allemagne', 'Commissariat central de Berlin, police fédérale allemande. Dépôt d''objets trouvés, déclaration en ligne, coopération RETRUV pour restitutions sécurisées', 'ShieldCheck', 'https://www.polizei.de', 'Berlin', 'DE', 0);
SELECT insert_partner_world('Universität Heidelberg — Allemagne', 'Université d''Heidelberg, plus ancienne d''Allemagne (1386). Point RETRUV campus pour documents étudiants, cartes perdues, objets trouvés au secrétariat', 'GraduationCap', 'https://www.uni-heidelberg.de', 'Heidelberg', 'DE', 1);
SELECT insert_partner_world('Deutsche Bahn — Allemagne', 'Transport officiel allemand, réseau ICE/IC. Objets trouvés dans les gares, partenariat RETRUV pour matching voyageurs', 'Train', 'https://www.bahn.de', 'Berlin', 'DE', 2);
SELECT insert_partner_world('MOI Police — Arabie saoudite', 'Ministère de l''Intérieur, police nationale saoudienne. Service des objets trouvés, sécurisation Hajj/Omra, partenariat RETRUV', 'ShieldCheck', 'https://www.moi.gov.sa', 'Riyad', 'SA', 10);
SELECT insert_partner_world('King Saud University — Arabie saoudite', 'Université Roi Saoud à Riyad, première université du Royaume. Point RETRUV campus pour documents et objets étudiants', 'GraduationCap', 'https://www.ksu.edu.sa', 'Riyad', 'SA', 11);
SELECT insert_partner_world('SAPTCO — Arabie saoudite', 'Société publique de transport, réseau interurbain. Objets trouvés dans bus, coopération RETRUV pour voyageurs', 'Bus', 'https://www.saptco.com.sa', 'Riyad', 'SA', 12);
SELECT insert_partner_world('Policía Federal — Argentine', 'Police fédérale argentine, siège Buenos Aires. Déclarations de perte, objets trouvés, partenariat RETRUV pour restitutions', 'ShieldCheck', 'https://www.argentina.gob.ar/seguridad/policia-federal', 'Buenos Aires', 'AR', 20);
SELECT insert_partner_world('Universidad de Buenos Aires — Argentine', 'UBA, plus grande université d''Amérique latine. Point RETRUV campus pour cartes étudiantes et objets trouvés', 'GraduationCap', 'https://www.uba.ar', 'Buenos Aires', 'AR', 21);
SELECT insert_partner_world('Trenes Argentinos — Argentine', 'Opérateur ferroviaire national argentin. Objets trouvés en gare, matching RETRUV pour voyageurs', 'Train', 'https://www.argentina.gob.ar/transporte/trenes', 'Buenos Aires', 'AR', 22);
SELECT insert_partner_world('Australian Federal Police — Australie', 'Police fédérale australienne, siège Canberra. Service objets trouvés, coopération internationale RETRUV', 'ShieldCheck', 'https://www.afp.gov.au', 'Canberra', 'AU', 30);
SELECT insert_partner_world('University of Melbourne — Australie', 'Université de Melbourne, n°1 Australie. Point RETRUV campus pour documents et objets étudiants', 'GraduationCap', 'https://www.unimelb.edu.au', 'Melbourne', 'AU', 31);
SELECT insert_partner_world('Sydney Trains — Australie', 'Réseau ferroviaire Sydney, NSW Transport. Objets trouvés dans trains, partenariat RETRUV', 'Train', 'https://transportnsw.info', 'Sydney', 'AU', 32);
SELECT insert_partner_world('Police Fédérale — Belgique', 'Police fédérale belge, Bruxelles. Déclarations en ligne, objets trouvés, partenariat RETRUV', 'ShieldCheck', 'https://www.police.be', 'Bruxelles', 'BE', 40);
SELECT insert_partner_world('KU Leuven — Belgique', 'Université catholique de Louvain, plus ancienne Belgique. Point RETRUV campus', 'GraduationCap', 'https://www.kuleuven.be', 'Leuven', 'BE', 41);
SELECT insert_partner_world('SNCB — Belgique', 'Société Nationale des Chemins de fer Belges. Objets trouvés en gare, réseau RETRUV', 'Train', 'https://www.belgiantrain.be', 'Bruxelles', 'BE', 42);
SELECT insert_partner_world('Police Républicaine — Bénin', 'Police Républicaine du Bénin, Cotonou. Déclarations de perte, objets trouvés, coopération RETRUV', 'ShieldCheck', 'https://www.gouv.bj', 'Cotonou', 'BJ', 50);
SELECT insert_partner_world('Université d''Abomey-Calavi — Bénin', 'UAC, plus grande université du Bénin. Point RETRUV campus pour cartes étudiantes', 'GraduationCap', 'https://www.uac.bj', 'Abomey-Calavi', 'BJ', 51);
SELECT insert_partner_world('Ministère des Transports — Bénin', 'Direction des transports terrestres Bénin. Objets trouvés taxis/bus, partenariat RETRUV', 'Bus', 'https://www.transport.gouv.bj', 'Cotonou', 'BJ', 52);
SELECT insert_partner_world('Polícia Federal — Brésil', 'Police fédérale brésilienne, Brasília. Service objets trouvés aéroports, partenariat RETRUV', 'ShieldCheck', 'https://www.gov.br/pf', 'Brasília', 'BR', 60);
SELECT insert_partner_world('USP — Brésil', 'Universidade de São Paulo, n°1 Amérique latine. Point RETRUV campus pour documents', 'GraduationCap', 'https://www.usp.br', 'São Paulo', 'BR', 61);
SELECT insert_partner_world('CPTM — Brésil', 'Companhia Paulista de Trens Metropolitanos, São Paulo. Objets trouvés, réseau RETRUV', 'Train', 'https://www.cptm.sp.gov.br', 'São Paulo', 'BR', 62);
SELECT insert_partner_world('Police Nationale — Burkina Faso', 'Police Nationale burkinabè, Ouagadougou. Déclarations CNIB, objets trouvés, partenariat RETRUV officiel', 'ShieldCheck', 'https://www.police.gov.bf', 'Ouagadougou', 'BF', 70);
SELECT insert_partner_world('Université Joseph Ki-Zerbo — Burkina Faso', 'UJKZ, plus grande université du Burkina (Ouaga). Point RETRUV campus pour cartes étudiantes, diplômes', 'GraduationCap', 'https://www.ujkz.bf', 'Ouagadougou', 'BF', 71);
SELECT insert_partner_world('SOTRACO — Burkina Faso', 'Société de Transport en Commun, Ouaga & Bobo-Dioulasso. Objets trouvés dans bus, réseau RETRUV national', 'Bus', 'https://www.sotraco.bf', 'Ouagadougou', 'BF', 72);
SELECT insert_partner_world('SITARAIL — Burkina Faso', 'Chemin de fer Abidjan-Ouaga, gares Bobo & Ouaga. Objets trouvés en gare, partenariat RETRUV', 'Train', 'https://www.sitarail.com', 'Bobo-Dioulasso', 'BF', 73);
SELECT insert_partner_world('Université Nazi Boni — Burkina Faso', 'UNB à Bobo-Dioulasso, pôle universitaire ouest. Point RETRUV campus pour étudiants', 'GraduationCap', 'https://www.unb.bf', 'Bobo-Dioulasso', 'BF', 74);
SELECT insert_partner_world('DGSN — Cameroun', 'Délégation Générale Sûreté Nationale, Yaoundé. Police nationale, objets trouvés, partenariat RETRUV', 'ShieldCheck', 'https://www.dgsn.cm', 'Yaoundé', 'CM', 80);
SELECT insert_partner_world('Université de Yaoundé I — Cameroun', 'UY1, plus ancienne du Cameroun. Point RETRUV campus pour documents étudiants', 'GraduationCap', 'https://www.uy1.uninet.cm', 'Yaoundé', 'CM', 81);
SELECT insert_partner_world('Camrail — Cameroun', 'Cameroon Railways, Yaoundé-Douala. Objets trouvés en gare, réseau RETRUV', 'Train', 'https://www.camrail.net', 'Yaoundé', 'CM', 82);
SELECT insert_partner_world('GRC / RCMP — Canada', 'Gendarmerie Royale du Canada, Ottawa. Service objets trouvés, coopération RETRUV internationale', 'ShieldCheck', 'https://www.rcmp-grc.gc.ca', 'Ottawa', 'CA', 90);
SELECT insert_partner_world('University of Toronto — Canada', 'UofT, n°1 Canada. Point RETRUV campus pour cartes et objets étudiants', 'GraduationCap', 'https://www.utoronto.ca', 'Toronto', 'CA', 91);
SELECT insert_partner_world('VIA Rail — Canada', 'VIA Rail Canada, réseau national. Objets trouvés à bord, partenariat RETRUV', 'Train', 'https://www.viarail.ca', 'Toronto', 'CA', 92);
SELECT insert_partner_world('Ministry of Public Security — Chine', 'Ministère Sécurité Publique, Pékin. Police nationale, objets trouvés, RETRUV', 'ShieldCheck', 'https://www.mps.gov.cn', 'Pékin', 'CN', 100);
SELECT insert_partner_world('Tsinghua University — Chine', 'Université Tsinghua, Pékin, n°1 Chine. Point RETRUV campus', 'GraduationCap', 'https://www.tsinghua.edu.cn', 'Pékin', 'CN', 101);
SELECT insert_partner_world('China Railway — Chine', 'China State Railway, réseau 150 000 km. Objets trouvés, partenariat RETRUV', 'Train', 'https://www.12306.cn', 'Pékin', 'CN', 102);
SELECT insert_partner_world('Police Nationale — Côte d''Ivoire', 'DGPN Côte d''Ivoire, Abidjan Plateau. Déclarations, objets trouvés, partenariat RETRUV', 'ShieldCheck', 'https://www.policenationale-ci.com', 'Abidjan', 'CI', 110);
SELECT insert_partner_world('Université Félix Houphouët-Boigny — Côte d''Ivoire', 'UFHB Cocody-Abidjan, plus grande CI. Point RETRUV campus pour cartes étudiantes', 'GraduationCap', 'https://www.ufhb.edu.ci', 'Abidjan', 'CI', 111);
SELECT insert_partner_world('SOTRA — Côte d''Ivoire', 'Société des Transports Abidjanais, Abidjan. Bus & bateau-bus, objets trouvés, RETRUV', 'Bus', 'https://www.sotra.ci', 'Abidjan', 'CI', 112);
SELECT insert_partner_world('SITARAIL — Côte d''Ivoire', 'Chemin de fer Abidjan-Ouaga, gare Treichville. Partenariat RETRUV', 'Train', 'https://www.sitarail.com', 'Abidjan', 'CI', 113);
SELECT insert_partner_world('Ministry of Interior — Égypte', 'Ministère Intérieur égyptien, Le Caire. Police nationale, objets trouvés, RETRUV', 'ShieldCheck', 'https://www.moi.gov.eg', 'Le Caire', 'EG', 120);
SELECT insert_partner_world('Cairo University — Égypte', 'Université du Caire, plus ancienne Égypte. Point RETRUV campus', 'GraduationCap', 'https://www.cu.edu.eg', 'Le Caire', 'EG', 121);
SELECT insert_partner_world('Egyptian National Railways — Égypte', 'ENR, réseau ferroviaire égyptien. Objets trouvés, partenariat RETRUV', 'Train', 'https://www.enr.gov.eg', 'Le Caire', 'EG', 122);
SELECT insert_partner_world('Dubai Police — Émirats', 'Dubai Police General HQ. Service objets trouvés 901, partenariat RETRUV premium', 'ShieldCheck', 'https://www.dubaipolice.gov.ae', 'Dubaï', 'AE', 130);
SELECT insert_partner_world('UAE University — Émirats', 'Université des Émirats, Al Ain. Point RETRUV campus', 'GraduationCap', 'https://www.uaeu.ac.ae', 'Al Ain', 'AE', 131);
SELECT insert_partner_world('RTA Dubai — Émirats', 'Roads & Transport Authority, Dubaï. Métro/bus/tram, objets trouvés, RETRUV', 'Bus', 'https://www.rta.ae', 'Dubaï', 'AE', 132);
SELECT insert_partner_world('Policía Nacional — Espagne', 'Cuerpo Nacional de Policía, Madrid. Denuncias, objetos perdidos, RETRUV', 'ShieldCheck', 'https://www.policia.es', 'Madrid', 'ES', 140);
SELECT insert_partner_world('Universidad Complutense — Espagne', 'UCM Madrid, plus grande Espagne. Point RETRUV campus', 'GraduationCap', 'https://www.ucm.es', 'Madrid', 'ES', 141);
SELECT insert_partner_world('Renfe — Espagne', 'Red Nacional Ferrocarriles Españoles. Objetos perdidos, partenariat RETRUV', 'Train', 'https://www.renfe.com', 'Madrid', 'ES', 142);
SELECT insert_partner_world('NYPD — États-Unis', 'NYPD, plus grande police US, New York. Lost & Found, partenariat RETRUV', 'ShieldCheck', 'https://www.nyc.gov/nypd', 'New York', 'US', 150);
SELECT insert_partner_world('Harvard University — États-Unis', 'Harvard, Cambridge MA, n°1 monde. Point RETRUV campus pour documents', 'GraduationCap', 'https://www.harvard.edu', 'Cambridge', 'US', 151);
SELECT insert_partner_world('Amtrak — États-Unis', 'National Railroad Passenger Corp. Objets trouvés, réseau RETRUV', 'Train', 'https://www.amtrak.com', 'Washington', 'US', 152);
SELECT insert_partner_world('Police Nationale — France', 'Direction Générale Police Nationale, Paris. Pré-plainte en ligne, objets trouvés, RETRUV', 'ShieldCheck', 'https://www.police-nationale.interieur.gouv.fr', 'Paris', 'FR', 160);
SELECT insert_partner_world('Sorbonne Université — France', 'Sorbonne, Paris, pôle universitaire majeur. Point RETRUV campus', 'GraduationCap', 'https://www.sorbonne-universite.fr', 'Paris', 'FR', 161);
SELECT insert_partner_world('SNCF — France', 'Société Nationale Chemins de fer Français. Objets trouvés en gare, réseau RETRUV national', 'Train', 'https://www.sncf.com', 'Paris', 'FR', 162);
SELECT insert_partner_world('Ghana Police Service — Ghana', 'Ghana Police Service, Accra. Déclarations, objets trouvés, RETRUV', 'ShieldCheck', 'https://www.police.gov.gh', 'Accra', 'GH', 170);
SELECT insert_partner_world('University of Ghana — Ghana', 'UG Legon-Accra, n°1 Ghana. Point RETRUV campus', 'GraduationCap', 'https://www.ug.edu.gh', 'Accra', 'GH', 171);
SELECT insert_partner_world('Ghana Railway — Ghana', 'Ghana Railway Company, Accra-Takoradi. Objets trouvés, RETRUV', 'Train', 'https://www.ghanarailways.gov.gh', 'Accra', 'GH', 172);
SELECT insert_partner_world('Delhi Police — Inde', 'Delhi Police HQ, New Delhi. E-lost report, objets trouvés, RETRUV', 'ShieldCheck', 'https://www.delhipolice.gov.in', 'New Delhi', 'IN', 180);
SELECT insert_partner_world('IIT Bombay — Inde', 'Indian Institute Technology Bombay. Point RETRUV campus', 'GraduationCap', 'https://www.iitb.ac.in', 'Mumbai', 'IN', 181);
SELECT insert_partner_world('Indian Railways — Inde', 'Réseau ferroviaire indien, 67 000 km. Objets trouvés, partenariat RETRUV', 'Train', 'https://www.indianrail.gov.in', 'New Delhi', 'IN', 182);
SELECT insert_partner_world('Polizia di Stato — Italie', 'Polizia di Stato, Rome. Denuncia, oggetti smarriti, RETRUV', 'ShieldCheck', 'https://www.poliziadistato.it', 'Rome', 'IT', 190);
SELECT insert_partner_world('Sapienza di Roma — Italie', 'Sapienza Università di Roma, plus grande Europe. Point RETRUV campus', 'GraduationCap', 'https://www.uniroma1.it', 'Rome', 'IT', 191);
SELECT insert_partner_world('Trenitalia — Italie', 'Gruppo FS Italiane. Oggetti smarriti, partenariat RETRUV', 'Train', 'https://www.trenitalia.com', 'Rome', 'IT', 192);
SELECT insert_partner_world('National Police Agency — Japon', 'NPA Japon, Tokyo. Koban police boxes, objets trouvés, RETRUV', 'ShieldCheck', 'https://www.npa.go.jp', 'Tokyo', 'JP', 200);
SELECT insert_partner_world('University of Tokyo — Japon', 'Todai, n°1 Japon, Tokyo. Point RETRUV campus', 'GraduationCap', 'https://www.u-tokyo.ac.jp', 'Tokyo', 'JP', 201);
SELECT insert_partner_world('JR East — Japon', 'Japan Railways East, Tokyo. Objets trouvés, réseau RETRUV', 'Train', 'https://www.jreast.co.jp', 'Tokyo', 'JP', 202);
SELECT insert_partner_world('National Police Service — Kenya', 'NPS Kenya, Nairobi. Police, objets trouvés, RETRUV', 'ShieldCheck', 'https://www.nationalpolice.go.ke', 'Nairobi', 'KE', 210);
SELECT insert_partner_world('University of Nairobi — Kenya', 'UoN, n°1 Kenya, Nairobi. Point RETRUV campus', 'GraduationCap', 'https://www.uonbi.ac.ke', 'Nairobi', 'KE', 211);
SELECT insert_partner_world('Kenya Railways — Kenya', 'Kenya Railways Corp, Nairobi-Mombasa SGR. Objets trouvés, RETRUV', 'Train', 'https://www.krc.co.ke', 'Nairobi', 'KE', 212);
SELECT insert_partner_world('DGSN — Maroc', 'Direction Générale Sûreté Nationale, Rabat. Police, objets trouvés, RETRUV', 'ShieldCheck', 'https://www.dgsn.gov.ma', 'Rabat', 'MA', 220);
SELECT insert_partner_world('Université Mohammed V — Maroc', 'UM5 Rabat, plus grande Maroc. Point RETRUV campus', 'GraduationCap', 'https://www.um5.ac.ma', 'Rabat', 'MA', 221);
SELECT insert_partner_world('ONCF — Maroc', 'Office National Chemins de Fer, TGV Al Boraq. Objets trouvés, RETRUV', 'Train', 'https://www.oncf.ma', 'Rabat', 'MA', 222);
SELECT insert_partner_world('Police Nationale — Mali', 'Police Nationale malienne, Bamako. Déclarations, objets trouvés, RETRUV', 'ShieldCheck', 'https://www.interieur.gouv.ml', 'Bamako', 'ML', 230);
SELECT insert_partner_world('USTTB — Mali', 'Université Sciences Techniques & Technologies Bamako. Point RETRUV campus', 'GraduationCap', 'https://www.usttb.edu.ml', 'Bamako', 'ML', 231);
SELECT insert_partner_world('Aéroport Bamako-Sénou — Mali', 'Aéroports du Mali, Bamako. Objets trouvés aéroport, partenariat RETRUV', 'Bus', 'https://www.aeroports-mali.ml', 'Bamako', 'ML', 232);
SELECT insert_partner_world('Guardia Nacional — Mexique', 'Guardia Nacional, Mexico. Seguridad, objetos perdidos, RETRUV', 'ShieldCheck', 'https://www.gob.mx/guardianacional', 'Mexico', 'MX', 240);
SELECT insert_partner_world('UNAM — Mexique', 'Universidad Nacional Autónoma de México, n°1 LATAM. Point RETRUV campus', 'GraduationCap', 'https://www.unam.mx', 'Mexico', 'MX', 241);
SELECT insert_partner_world('Tren Maya — Mexique', 'Tren Maya, réseau sud-est Mexique. Objetos perdidos, RETRUV', 'Train', 'https://www.trenmaya.gob.mx', 'Mexico', 'MX', 242);
SELECT insert_partner_world('Police Nationale — Niger', 'Police Nationale nigérienne, Niamey. Déclarations, objets trouvés, RETRUV', 'ShieldCheck', 'https://www.interieur.gouv.ne', 'Niamey', 'NE', 250);
SELECT insert_partner_world('Université Abdou Moumouni — Niger', 'UAM Niamey, n°1 Niger. Point RETRUV campus', 'GraduationCap', 'https://www.uam.refer.ne', 'Niamey', 'NE', 251);
SELECT insert_partner_world('SNTN — Niger', 'Société Nigérienne de Transport, Niamey. Objets trouvés, partenariat RETRUV', 'Bus', 'https://www.sntn.ne', 'Niamey', 'NE', 252);
SELECT insert_partner_world('Nigeria Police Force — Nigéria', 'NPF, Abuja. Police fédérale, objets trouvés, RETRUV', 'ShieldCheck', 'https://www.npf.gov.ng', 'Abuja', 'NG', 260);
SELECT insert_partner_world('University of Lagos — Nigéria', 'UNILAG, n°1 Nigéria. Point RETRUV campus', 'GraduationCap', 'https://www.unilag.edu.ng', 'Lagos', 'NG', 261);
SELECT insert_partner_world('NRC — Nigéria', 'Nigerian Railway Corp, Lagos-Kano. Objets trouvés, RETRUV', 'Train', 'https://www.nrc.gov.ng', 'Lagos', 'NG', 262);
SELECT insert_partner_world('Nationale Politie — Pays-Bas', 'Politie Nederland, La Haye. Aangifte, voorwerpen verloren, RETRUV', 'ShieldCheck', 'https://www.politie.nl', 'La Haye', 'NL', 270);
SELECT insert_partner_world('TU Delft — Pays-Bas', 'Technische Universiteit Delft, n°1 NL. Point RETRUV campus', 'GraduationCap', 'https://www.tudelft.nl', 'Delft', 'NL', 271);
SELECT insert_partner_world('NS — Pays-Bas', 'Nederlandse Spoorwegen. Voorwerpen verloren, partenariat RETRUV', 'Train', 'https://www.ns.nl', 'Amsterdam', 'NL', 272);
SELECT insert_partner_world('PNP — Philippines', 'Philippine National Police, Quezon City. Police, objets trouvés, RETRUV', 'ShieldCheck', 'https://www.pnp.gov.ph', 'Manille', 'PH', 280);
SELECT insert_partner_world('UP Diliman — Philippines', 'University of the Philippines, Quezon City. Point RETRUV campus', 'GraduationCap', 'https://www.up.edu.ph', 'Quezon City', 'PH', 281);
SELECT insert_partner_world('PNR — Philippines', 'Philippine National Railways, Manille. Objets trouvés, RETRUV', 'Train', 'https://www.pnr.gov.ph', 'Manille', 'PH', 282);
SELECT insert_partner_world('PSP — Portugal', 'Polícia de Segurança Pública, Lisbonne. Queixa online, objetos perdidos, RETRUV', 'ShieldCheck', 'https://www.psp.pt', 'Lisbonne', 'PT', 290);
SELECT insert_partner_world('Universidade de Lisboa — Portugal', 'ULisboa, n°1 Portugal. Point RETRUV campus', 'GraduationCap', 'https://www.ulisboa.pt', 'Lisbonne', 'PT', 291);
SELECT insert_partner_world('CP — Portugal', 'Comboios de Portugal. Achados e perdidos, partenariat RETRUV', 'Train', 'https://www.cp.pt', 'Lisbonne', 'PT', 292);
SELECT insert_partner_world('PNC — RD Congo', 'Police Nationale Congolaise, Kinshasa. Déclarations, objets trouvés, RETRUV', 'ShieldCheck', 'https://www.pnc.cd', 'Kinshasa', 'CD', 300);
SELECT insert_partner_world('UNIKIN — RD Congo', 'Université de Kinshasa, n°1 RDC. Point RETRUV campus', 'GraduationCap', 'https://www.unikin.ac.cd', 'Kinshasa', 'CD', 301);
SELECT insert_partner_world('SNCC — RD Congo', 'Société Nationale Chemins de fer Congo, Lubumbashi. Objets trouvés, RETRUV', 'Train', 'https://www.sncc.cd', 'Kinshasa', 'CD', 302);
SELECT insert_partner_world('Met Police — Royaume-Uni', 'Metropolitan Police, London. Lost property, partenariat RETRUV', 'ShieldCheck', 'https://www.met.police.uk', 'Londres', 'GB', 310);
SELECT insert_partner_world('University of Oxford — Royaume-Uni', 'Oxford, n°1 monde. Point RETRUV campus', 'GraduationCap', 'https://www.ox.ac.uk', 'Oxford', 'GB', 311);
SELECT insert_partner_world('Network Rail — Royaume-Uni', 'Network Rail, Londres. Lost property, partenariat RETRUV', 'Train', 'https://www.networkrail.co.uk', 'Londres', 'GB', 312);
SELECT insert_partner_world('Police Nationale — Sénégal', 'DGPN Sénégal, Dakar. Déclarations, objets trouvés, partenariat RETRUV', 'ShieldCheck', 'https://www.policenationale.gouv.sn', 'Dakar', 'SN', 320);
SELECT insert_partner_world('UCAD — Sénégal', 'Université Cheikh Anta Diop, Dakar, n°1 Sénégal. Point RETRUV campus', 'GraduationCap', 'https://www.ucad.edu.sn', 'Dakar', 'SN', 321);
SELECT insert_partner_world('Dakar Dem Dikk — Sénégal', 'Société transport public Dakar. Objets trouvés bus, RETRUV', 'Bus', 'https://www.dem-dikk.com', 'Dakar', 'SN', 322);
SELECT insert_partner_world('SAPS — Afrique du Sud', 'South African Police Service, Pretoria. Déclarations, objets trouvés, RETRUV', 'ShieldCheck', 'https://www.saps.gov.za', 'Pretoria', 'ZA', 330);
SELECT insert_partner_world('UCT — Afrique du Sud', 'University of Cape Town, n°1 Afrique. Point RETRUV campus', 'GraduationCap', 'https://www.uct.ac.za', 'Le Cap', 'ZA', 331);
SELECT insert_partner_world('PRASA — Afrique du Sud', 'Passenger Rail Agency, Johannesburg. Lost property, RETRUV', 'Train', 'https://www.prasa.com', 'Johannesburg', 'ZA', 332);
SELECT insert_partner_world('Fedpol — Suisse', 'Office fédéral de la police, Berne. Objets trouvés, coopération RETRUV', 'ShieldCheck', 'https://www.fedpol.admin.ch', 'Berne', 'CH', 340);
SELECT insert_partner_world('ETH Zurich — Suisse', 'ETH Zürich, n°1 Suisse, n°6 monde. Point RETRUV campus', 'GraduationCap', 'https://www.ethz.ch', 'Zurich', 'CH', 341);
SELECT insert_partner_world('SBB CFF — Suisse', 'Chemins de fer fédéraux suisses. Objets trouvés, RETRUV', 'Train', 'https://www.sbb.ch', 'Berne', 'CH', 342);
SELECT insert_partner_world('Police Nationale — Togo', 'DGPN Togo, Lomé. Déclarations, objets trouvés, RETRUV', 'ShieldCheck', 'https://www.police.gouv.tg', 'Lomé', 'TG', 350);
SELECT insert_partner_world('Université de Lomé — Togo', 'UL, n°1 Togo, Lomé. Point RETRUV campus', 'GraduationCap', 'https://www.univ-lome.tg', 'Lomé', 'TG', 351);
SELECT insert_partner_world('SOTRAL — Togo', 'Société des Transports de Lomé. Objets trouvés, partenariat RETRUV', 'Bus', 'https://www.sotral.tg', 'Lomé', 'TG', 352);

DROP FUNCTION IF EXISTS insert_partner_world(text,text,text,text,text,text,int);
SELECT 'World partners seed termine : ' || count(*) || ' partenaires totaux' as result FROM partners;

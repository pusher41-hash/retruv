export type WorldRecoveryPoint = {
  name: string;
  type: "gare" | "mairie" | "commissariat" | "universite" | "autre";
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  email: string | null;
  hours: string | null;
  managerName: string | null;
};

export const WORLD_RECOVERY_POINTS: WorldRecoveryPoint[] = [
  // Allemagne (DE)
  { name: 'Polizeipräsidium Berlin', type: 'commissariat', address: 'Platz der Luftbrücke 6, 12101 Berlin', city: 'Berlin', country: 'DE', latitude: 52.4838, longitude: 13.387, phone: '+49 30 46640', email: 'praesidium@polizei.berlin.de', hours: '24h/24', managerName: 'Direktion Einsatz Berlin' },
  { name: 'Université Humboldt — Berlin', type: 'universite', address: 'Unter den Linden 6, 10117 Berlin', city: 'Berlin', country: 'DE', latitude: 52.5186, longitude: 13.3937, phone: '+49 30 20930', email: 'info@hu-berlin.de', hours: 'Lun–Ven 8h–18h', managerName: 'Secrétariat central' },
  { name: 'Gare Centrale de Berlin (Hauptbahnhof)', type: 'gare', address: 'Washingtonplatz 2, 10557 Berlin', city: 'Berlin', country: 'DE', latitude: 52.5251, longitude: 13.3694, phone: '+49 30 29710550', email: 'fundsachen@bahn.de', hours: 'Tous les jours 6h–22h', managerName: 'Service Objets Trouvés DB' },

  // Arabie saoudite (SA)
  { name: 'Direction de la Police — Riyad', type: 'commissariat', address: 'King Fahd Road, Al-Olaya, Riyad 11421', city: 'Riyad', country: 'SA', latitude: 24.7136, longitude: 46.6753, phone: '+966 11 4011111', email: 'info@moi.gov.sa', hours: '24h/24', managerName: 'Ministère de l\'Intérieur' },
  { name: 'Université Roi Saoud — Riyad', type: 'universite', address: 'King Khalid Road, Riyad 11451', city: 'Riyad', country: 'SA', latitude: 24.7167, longitude: 46.6167, phone: '+966 11 4670000', email: 'info@ksu.edu.sa', hours: 'Dim–Jeu 7h30–15h30', managerName: 'Décanat des affaires étudiantes' },
  { name: 'Gare SAPTCO — Riyad', type: 'gare', address: 'Aziziyah, Route Dammam, Riyad', city: 'Riyad', country: 'SA', latitude: 24.6389, longitude: 46.7121, phone: '+966 800 1249999', email: 'info@saptco.com.sa', hours: 'Tous les jours 5h–23h', managerName: 'Guichet objets trouvés' },

  // Argentine (AR)
  { name: 'Comisaría Central — Buenos Aires', type: 'commissariat', address: 'Av. Belgrano 1548, C1092AAO Buenos Aires', city: 'Buenos Aires', country: 'AR', latitude: -34.6098, longitude: -58.3926, phone: '+54 11 43465700', email: 'prensa@policiafederal.gov.ar', hours: '24h/24', managerName: 'Policía Federal Argentina' },
  { name: 'Universidad de Buenos Aires — Pavillon Central', type: 'universite', address: 'Viamonte 430, C1053ABJ Buenos Aires', city: 'Buenos Aires', country: 'AR', latitude: -34.5998, longitude: -58.373, phone: '+54 11 52854000', email: 'informes@uba.ar', hours: 'Lun–Ven 8h–20h', managerName: 'Secrétariat UBA' },
  { name: 'Gare Retiro — Buenos Aires', type: 'gare', address: 'Av. Ramos Mejía 1550, Retiro, Buenos Aires', city: 'Buenos Aires', country: 'AR', latitude: -34.59, longitude: -58.3747, phone: '+54 11 43177300', email: 'contacto@trenesargentinos.gob.ar', hours: 'Tous les jours 5h–23h', managerName: 'Trenes Argentinos' },

  // Australie (AU)
  { name: 'AFP — poste de Canberra', type: 'commissariat', address: 'GPO Box 401, Canberra ACT 2601', city: 'Canberra', country: 'AU', latitude: -35.2809, longitude: 149.13, phone: '+61 2 51260123', email: 'info@afp.gov.au', hours: 'Lun–Ven 8h–16h', managerName: 'Australian Federal Police' },
  { name: 'University of Melbourne — Parkville', type: 'universite', address: 'Parkville VIC 3010, Grattan Street', city: 'Melbourne', country: 'AU', latitude: -37.7963, longitude: 144.9614, phone: '+61 3 83444444', email: 'enquiries@unimelb.edu.au', hours: 'Lun–Ven 8h–18h', managerName: 'Student Services' },
  { name: 'Central Station — Sydney', type: 'gare', address: 'Eddy Avenue, Haymarket NSW 2000', city: 'Sydney', country: 'AU', latitude: -33.883, longitude: 151.2065, phone: '+61 2 82022200', email: 'lostproperty@transport.nsw.gov.au', hours: 'Tous les jours 6h–22h', managerName: 'Sydney Trains' },

  // Belgique (BE)
  { name: 'Commissariat central — Bruxelles', type: 'commissariat', address: 'Rue Fritz Toussaint 8, 1050 Bruxelles', city: 'Bruxelles', country: 'BE', latitude: 50.82, longitude: 4.385, phone: '+32 2 6426531', email: 'info@police.be', hours: '24h/24', managerName: 'Police Fédérale' },
  { name: 'KU Leuven — Campus centre', type: 'universite', address: 'Oude Markt 13, 3000 Leuven', city: 'Leuven', country: 'BE', latitude: 50.8798, longitude: 4.7005, phone: '+32 16 324000', email: 'info@kuleuven.be', hours: 'Lun–Ven 8h–18h', managerName: 'Service étudiants' },
  { name: 'Gare Bruxelles-Midi', type: 'gare', address: 'Avenue Fonsny 47B, 1060 Bruxelles', city: 'Bruxelles', country: 'BE', latitude: 50.8357, longitude: 4.336, phone: '+32 2 5282828', email: 'lostproperty@belgiantrain.be', hours: 'Tous les jours 6h–22h', managerName: 'SNCB Objets Trouvés' },

  // Bénin (BJ)
  { name: 'Commissariat central — Cotonou', type: 'commissariat', address: 'Avenue Jean-Paul II, Cotonou', city: 'Cotonou', country: 'BJ', latitude: 6.3703, longitude: 2.3912, phone: '+229 21301322', email: 'contact@police.gouv.bj', hours: '24h/24', managerName: 'Police Républicaine' },
  { name: 'Université d\'Abomey-Calavi', type: 'universite', address: 'BP 526, Abomey-Calavi', city: 'Abomey-Calavi', country: 'BJ', latitude: 6.4486, longitude: 2.3557, phone: '+229 21360007', email: 'contact@uac.bj', hours: 'Lun–Ven 7h–18h', managerName: 'Rectorat UAC' },
  { name: 'Gare routière — Cotonou', type: 'gare', address: 'Carrefour Dantokpa, Cotonou', city: 'Cotonou', country: 'BJ', latitude: 6.3684, longitude: 2.4372, phone: '+229 21314314', email: 'transport@gouv.bj', hours: 'Tous les jours 5h–22h', managerName: 'Direction Transports' },

  // Brésil (BR)
  { name: 'Delegacia Central — Brasília', type: 'commissariat', address: 'SAS Quadra 06, Brasília DF 70037', city: 'Brasília', country: 'BR', latitude: -15.7939, longitude: -47.8828, phone: '+55 61 20245900', email: 'ouvidoria@pf.gov.br', hours: '24h/24', managerName: 'Polícia Federal' },
  { name: 'USP — Cidade Universitária', type: 'universite', address: 'Av. Prof. Luciano Gualberto 380, São Paulo', city: 'São Paulo', country: 'BR', latitude: -23.5614, longitude: -46.7308, phone: '+55 11 30916600', email: 'atendimento@usp.br', hours: 'Lun–Ven 7h–19h', managerName: 'Secrétariat USP' },
  { name: 'Estação da Luz — São Paulo', type: 'gare', address: 'Praça da Luz 1, São Paulo', city: 'São Paulo', country: 'BR', latitude: -23.5346, longitude: -46.6342, phone: '+55 11 32934400', email: 'sac@cptm.sp.gov.br', hours: 'Tous les jours 4h–Minuit', managerName: 'CPTM' },

  // Burkina Faso (BF)
  { name: 'Commissariat central — Ouagadougou', type: 'commissariat', address: 'Avenue Dimdolobsom, Ouagadougou 01 BP 22', city: 'Ouagadougou', country: 'BF', latitude: 12.3648, longitude: -1.5336, phone: '+226 25491122', email: 'contact@police.gov.bf', hours: '24h/24', managerName: 'Police Nationale' },
  { name: 'Université Joseph Ki-Zerbo', type: 'universite', address: '03 BP 7021, Ouagadougou', city: 'Ouagadougou', country: 'BF', latitude: 12.3714, longitude: -1.5012, phone: '+226 25307064', email: 'contact@ujkz.bf', hours: 'Lun–Ven 7h–18h', managerName: 'Présidence UJKZ' },
  { name: 'Gare SOTRACO — Ouagadougou', type: 'gare', address: 'Avenue Kwame Nkrumah, Ouagadougou', city: 'Ouagadougou', country: 'BF', latitude: 12.361, longitude: -1.519, phone: '+226 25312815', email: 'contact@sotraco.bf', hours: 'Tous les jours 5h–22h', managerName: 'SOTRACO' },
  { name: 'Gare SOTRACO — Bobo-Dioulasso', type: 'gare', address: 'Avenue de la République, Bobo-Dioulasso', city: 'Bobo-Dioulasso', country: 'BF', latitude: 11.1782, longitude: -4.297, phone: '+226 20971124', email: 'bobo@sotraco.bf', hours: 'Tous les jours 5h–22h', managerName: 'Antenne Bobo' },
  { name: 'Université Nazi Boni', type: 'universite', address: '01 BP 1091, Bobo-Dioulasso', city: 'Bobo-Dioulasso', country: 'BF', latitude: 11.1833, longitude: -4.2833, phone: '+226 20980039', email: 'contact@unb.bf', hours: 'Lun–Ven 7h–17h', managerName: 'Rectorat UNB' },

  // Cameroun (CM)
  { name: 'DGSN — Yaoundé', type: 'commissariat', address: 'Avenue Foch, Yaoundé Centre', city: 'Yaoundé', country: 'CM', latitude: 3.848, longitude: 11.5021, phone: '+237 222224624', email: 'dgsn@dgsn.cm', hours: '24h/24', managerName: 'Délégation Générale' },
  { name: 'Université de Yaoundé I', type: 'universite', address: 'BP 812 Yaoundé', city: 'Yaoundé', country: 'CM', latitude: 3.861, longitude: 11.501, phone: '+237 222310360', email: 'contact@uy1.uninet.cm', hours: 'Lun–Ven 7h–17h', managerName: 'Rectorat' },
  { name: 'Gare Camrail — Yaoundé', type: 'gare', address: 'Avenue Kennedy, Yaoundé', city: 'Yaoundé', country: 'CM', latitude: 3.865, longitude: 11.521, phone: '+237 22240426', email: 'info@camrail.net', hours: 'Tous les jours 5h–22h', managerName: 'Camrail' },

  // Canada (CA)
  { name: 'GRC — Division Ottawa', type: 'commissariat', address: '73 Leikin Drive, Ottawa ON K1A 0R2', city: 'Ottawa', country: 'CA', latitude: 45.4215, longitude: -75.6972, phone: '+1 613 9987265', email: 'info@rcmp-grc.gc.ca', hours: '24h/24', managerName: 'Gendarmerie Royale' },
  { name: 'University of Toronto — St George', type: 'universite', address: '27 King\'s College Cir, Toronto ON', city: 'Toronto', country: 'CA', latitude: 43.6629, longitude: -79.3957, phone: '+1 416 9782011', email: 'info@utoronto.ca', hours: 'Lun–Ven 8h–18h', managerName: 'Campus Services' },
  { name: 'Union Station — Toronto', type: 'gare', address: '65 Front St W, Toronto ON M5J 1E6', city: 'Toronto', country: 'CA', latitude: 43.6453, longitude: -79.3807, phone: '+1 888 8427245', email: 'lostfound@viarail.ca', hours: 'Tous les jours 5h30–23h', managerName: 'VIA Rail' },

  // Chine (CN)
  { name: 'Bureau Sécurité Publique — Pékin', type: 'commissariat', address: '14 East Chang\'an Ave, Dongcheng, Pékin 100741', city: 'Pékin', country: 'CN', latitude: 39.909, longitude: 116.3974, phone: '+86 10 66261110', email: 'contact@mps.gov.cn', hours: '24h/24', managerName: 'MPS Pékin' },
  { name: 'Tsinghua University', type: 'universite', address: '30 Shuangqing Rd, Haidian, Pékin', city: 'Pékin', country: 'CN', latitude: 40.0021, longitude: 116.3261, phone: '+86 10 62785001', email: 'zsb@tsinghua.edu.cn', hours: 'Lun–Ven 8h–17h', managerName: 'Bureau étudiants' },
  { name: 'Gare Pékin Ouest', type: 'gare', address: 'Lianhuachi E Rd, Fengtai, Pékin', city: 'Pékin', country: 'CN', latitude: 39.8944, longitude: 116.321, phone: '+86 12306', email: 'service@12306.cn', hours: 'Tous les jours 5h–23h', managerName: 'China Railway' },

  // Côte d'Ivoire (CI)
  { name: 'DGPN — Abidjan', type: 'commissariat', address: 'Avenue Marchand, Plateau, Abidjan', city: 'Abidjan', country: 'CI', latitude: 5.32, longitude: -4.04, phone: '+225 2720203030', email: 'dgpn@police.ci', hours: '24h/24', managerName: 'Police Nationale' },
  { name: 'Université Félix Houphouët-Boigny', type: 'universite', address: 'BP V34 Cocody, Abidjan', city: 'Abidjan', country: 'CI', latitude: 5.3526, longitude: -3.98, phone: '+225 2722444281', email: 'contact@ufhb.edu.ci', hours: 'Lun–Ven 7h30–17h30', managerName: 'Présidence UFHB' },
  { name: 'Gare SOTRA — Abidjan', type: 'gare', address: 'Avenue des Lagunes, Adjamé, Abidjan', city: 'Abidjan', country: 'CI', latitude: 5.353, longitude: -4.019, phone: '+225 2721375400', email: 'info@sotra.ci', hours: 'Tous les jours 5h–21h', managerName: 'SOTRA' },
  { name: 'Gare SITARAIL — Abidjan', type: 'gare', address: 'Boulevard de Marseille, Treichville, Abidjan', city: 'Abidjan', country: 'CI', latitude: 5.291, longitude: -4.013, phone: '+225 21242580', email: 'info@sitarail.com', hours: 'Tous les jours 6h–19h', managerName: 'SITARAIL' },

  // Égypte (EG)
  { name: 'Direction Sécurité — Le Caire', type: 'commissariat', address: 'Abdeen, Le Caire 11511', city: 'Le Caire', country: 'EG', latitude: 30.0444, longitude: 31.2357, phone: '+20 2 24830000', email: 'info@moi.gov.eg', hours: '24h/24', managerName: 'Ministry of Interior' },
  { name: 'Cairo University', type: 'universite', address: 'Gamma Street, Giza 12613', city: 'Le Caire', country: 'EG', latitude: 30.0276, longitude: 31.21, phone: '+20 2 35676105', email: 'info@cu.edu.eg', hours: 'Sam–Jeu 8h–16h', managerName: 'Administration CU' },
  { name: 'Gare Ramsès — Le Caire', type: 'gare', address: 'Midam Ramses, Azbakeya, Le Caire', city: 'Le Caire', country: 'EG', latitude: 30.0635, longitude: 31.2465, phone: '+20 2 25748000', email: 'info@enr.gov.eg', hours: 'Tous les jours 5h–23h', managerName: 'Egyptian National Railways' },

  // Émirats arabes unis (AE)
  { name: 'Police Générale — Abou Dhabi', type: 'commissariat', address: 'Sheikh Zayed Street, Abou Dhabi', city: 'Abou Dhabi', country: 'AE', latitude: 24.4539, longitude: 54.3773, phone: '+971 2 4461461', email: 'contact@adpolice.gov.ae', hours: '24h/24', managerName: 'Abu Dhabi Police' },
  { name: 'UAE University — Al Ain', type: 'universite', address: 'Sheikh Khalifa Bin Zayed St, Al Ain', city: 'Al Ain', country: 'AE', latitude: 24.2285, longitude: 55.746, phone: '+971 3 7135111', email: 'info@uaeu.ac.ae', hours: 'Dim–Jeu 7h30–15h', managerName: 'Student Affairs' },
  { name: 'Dubai Metro — Union Station', type: 'gare', address: 'Deira, Dubai', city: 'Dubaï', country: 'AE', latitude: 25.2687, longitude: 55.3103, phone: '+971 4 2244000', email: 'lostproperty@rta.ae', hours: 'Tous les jours 5h–Minuit', managerName: 'RTA Dubai' },

  // Espagne (ES)
  { name: 'Comisaría Centro — Madrid', type: 'commissariat', address: 'Calle de Leganitos 19, 28004 Madrid', city: 'Madrid', country: 'ES', latitude: 40.4203, longitude: -3.7058, phone: '+34 915821234', email: 'info@policia.es', hours: '24h/24', managerName: 'Policía Nacional' },
  { name: 'Universidad Complutense — Madrid', type: 'universite', address: 'Av. Séneca 2, 28040 Madrid', city: 'Madrid', country: 'ES', latitude: 40.451, longitude: -3.732, phone: '+34 913941000', email: 'info@ucm.es', hours: 'Lun–Ven 8h–20h', managerName: 'Secrétariat' },
  { name: 'Gare Atocha — Madrid', type: 'gare', address: 'Plaza del Emperador Carlos V, 28045 Madrid', city: 'Madrid', country: 'ES', latitude: 40.4072, longitude: -3.6918, phone: '+34 912320320', email: 'objetosperdidos@renfe.es', hours: 'Tous les jours 5h30–Minuit', managerName: 'Renfe' },

  // États-Unis (US)
  { name: 'NYPD Lost Property — New York', type: 'commissariat', address: '1 Police Plaza, New York NY 10038', city: 'New York', country: 'US', latitude: 40.7128, longitude: -74.006, phone: '+1 646 6105000', email: 'lostandfound@nypd.nyc.gov', hours: '24h/24', managerName: 'NYPD' },
  { name: 'Harvard University', type: 'universite', address: 'Massachusetts Hall, Cambridge MA 02138', city: 'Cambridge', country: 'US', latitude: 42.377, longitude: -71.1167, phone: '+1 617 4951000', email: 'info@harvard.edu', hours: 'Lun–Ven 9h–17h', managerName: 'Operations Services' },
  { name: 'Grand Central Terminal — New York', type: 'gare', address: '89 E 42nd St, New York NY 10017', city: 'New York', country: 'US', latitude: 40.7527, longitude: -73.9772, phone: '+1 212 3402583', email: 'lostproperty@amtrak.com', hours: 'Tous les jours 5h15–2h', managerName: 'MTA' },

  // France (FR)
  { name: 'Commissariat Châtelet — Paris', type: 'commissariat', address: '4 Rue de la Montagne Sainte-Geneviève, 75005 Paris', city: 'Paris', country: 'FR', latitude: 48.8462, longitude: 2.3432, phone: '+33 1 49274254', email: 'contact@police-nationale.interieur.gouv.fr', hours: '24h/24', managerName: 'Police Nationale' },
  { name: 'Sorbonne Université', type: 'universite', address: '21 Rue de l\'École de Médecine, 75006 Paris', city: 'Paris', country: 'FR', latitude: 48.85, longitude: 2.343, phone: '+33 1 44272727', email: 'contact@sorbonne-universite.fr', hours: 'Lun–Ven 8h–19h', managerName: 'Scolarité' },
  { name: 'Gare du Nord — Paris', type: 'gare', address: '18 Rue de Dunkerque, 75010 Paris', city: 'Paris', country: 'FR', latitude: 48.8809, longitude: 2.3553, phone: '+33 1 800946459', email: 'objets.trouves@sncf.fr', hours: 'Tous les jours 6h–23h', managerName: 'SNCF Gares & Connexions' },

  // Ghana (GH)
  { name: 'Ghana Police HQ — Accra', type: 'commissariat', address: 'Ring Road Central, Accra', city: 'Accra', country: 'GH', latitude: 5.6037, longitude: -0.187, phone: '+233 302 773906', email: 'info@police.gov.gh', hours: '24h/24', managerName: 'Ghana Police Service' },
  { name: 'University of Ghana — Legon', type: 'universite', address: 'Legon Boundary, Accra', city: 'Accra', country: 'GH', latitude: 5.65, longitude: -0.185, phone: '+233 302 213820', email: 'pad@ug.edu.gh', hours: 'Lun–Ven 8h–16h', managerName: 'Academic Affairs' },
  { name: 'Gare Ghana Railway — Accra', type: 'gare', address: 'Kwame Nkrumah Ave, Accra', city: 'Accra', country: 'GH', latitude: 5.55, longitude: -0.217, phone: '+233 302 221021', email: 'info@ghanarailway.gov.gh', hours: 'Lun–Sam 6h–18h', managerName: 'Ghana Railway' },

  // Inde (IN)
  { name: 'Commissariat central — Mumbai', type: 'commissariat', address: 'DN Road, Fort, Mumbai 400001', city: 'Mumbai', country: 'IN', latitude: 18.934, longitude: 72.8356, phone: '+91 22 22621855', email: 'cp.mumbai@mahapolice.gov.in', hours: '24h/24', managerName: 'Mumbai Police' },
  { name: 'IIT Bombay — Powai', type: 'universite', address: 'Powai, Mumbai 400076', city: 'Mumbai', country: 'IN', latitude: 19.1334, longitude: 72.9133, phone: '+91 22 25722545', email: 'dean.sa@iitb.ac.in', hours: 'Lun–Ven 9h–17h', managerName: 'Student Affairs' },
  { name: 'Chhatrapati Shivaji Terminus — Mumbai', type: 'gare', address: 'Chhatrapati Shivaji Maharaj Terminus, Mumbai', city: 'Mumbai', country: 'IN', latitude: 18.94, longitude: 72.8355, phone: '+91 139', email: 'lostproperty@indianrail.gov.in', hours: '24h/24', managerName: 'Central Railway' },

  // Italie (IT)
  { name: 'Questura Centrale — Rome', type: 'commissariat', address: 'Via di San Vitale 15, 00184 Rome', city: 'Rome', country: 'IT', latitude: 41.9, longitude: 12.49, phone: '+39 06 46861', email: 'questura.rm@pecps.poliziadistato.it', hours: '24h/24', managerName: 'Polizia di Stato' },
  { name: 'Sapienza Università di Roma', type: 'universite', address: 'Piazzale Aldo Moro 5, 00185 Rome', city: 'Rome', country: 'IT', latitude: 41.9028, longitude: 12.5216, phone: '+39 06 49911', email: 'info@uniroma1.it', hours: 'Lun–Ven 8h–19h', managerName: 'Segreteria studenti' },
  { name: 'Stazione Termini — Rome', type: 'gare', address: 'Piazza dei Cinquecento, 00185 Rome', city: 'Rome', country: 'IT', latitude: 41.9009, longitude: 12.5019, phone: '+39 06 47306641', email: 'oggettismarriti@trenitalia.it', hours: 'Tous les jours 6h–22h', managerName: 'Trenitalia' },

  // Japon (JP)
  { name: 'Commissariat Marunouchi — Tokyo', type: 'commissariat', address: '1-3-1 Otemachi, Chiyoda, Tokyo 100-0004', city: 'Tokyo', country: 'JP', latitude: 35.681, longitude: 139.767, phone: '+81 3 35811232', email: 'info@keishicho.metro.tokyo.jp', hours: '24h/24', managerName: 'Tokyo Metropolitan Police' },
  { name: 'University of Tokyo — Hongo', type: 'universite', address: '7-3-1 Hongo, Bunkyo, Tokyo 113-8654', city: 'Tokyo', country: 'JP', latitude: 35.7126, longitude: 139.7621, phone: '+81 3 38122111', email: 'info@u-tokyo.ac.jp', hours: 'Lun–Ven 9h–17h', managerName: 'Student Support' },
  { name: 'Gare Tokyo Central', type: 'gare', address: '1-9-1 Marunouchi, Chiyoda, Tokyo 100-0005', city: 'Tokyo', country: 'JP', latitude: 35.6812, longitude: 139.7671, phone: '+81 3 32130111', email: 'lostfound@jreast.co.jp', hours: 'Tous les jours 4h30–1h', managerName: 'JR East' },

  // Kenya (KE)
  { name: 'Central Police Station — Nairobi', type: 'commissariat', address: 'University Way, Nairobi', city: 'Nairobi', country: 'KE', latitude: -1.2833, longitude: 36.8172, phone: '+254 20 2722221', email: 'info@nationalpolice.go.ke', hours: '24h/24', managerName: 'National Police Service' },
  { name: 'University of Nairobi — Main Campus', type: 'universite', address: 'University Way, Nairobi', city: 'Nairobi', country: 'KE', latitude: -1.279, longitude: 36.817, phone: '+254 20 318262', email: 'pr@uonbi.ac.ke', hours: 'Lun–Ven 8h–16h', managerName: 'Academic Registrar' },
  { name: 'Gare Nairobi Terminus (SGR)', type: 'gare', address: 'Syokimau, Mombasa Road, Nairobi', city: 'Nairobi', country: 'KE', latitude: -1.363, longitude: 36.909, phone: '+254 709 483000', email: 'info@kenyarailways.go.ke', hours: 'Tous les jours 6h–22h', managerName: 'Kenya Railways' },

  // Maroc (MA)
  { name: 'Préfecture de Police — Rabat', type: 'commissariat', address: 'Avenue Mohammed V, Rabat', city: 'Rabat', country: 'MA', latitude: 34.0209, longitude: -6.8416, phone: '+212 537760060', email: 'contact@dgsn.gov.ma', hours: '24h/24', managerName: 'DGSN' },
  { name: 'Université Mohammed V — Rabat', type: 'universite', address: 'Avenue Ibn Battouta, Agdal, Rabat', city: 'Rabat', country: 'MA', latitude: 34.007, longitude: -6.848, phone: '+212 537772806', email: 'contact@um5.ac.ma', hours: 'Lun–Ven 8h–18h', managerName: 'Présidence' },
  { name: 'Gare Rabat-Ville', type: 'gare', address: 'Avenue Moulay Hassan, Rabat', city: 'Rabat', country: 'MA', latitude: 34.017, longitude: -6.836, phone: '+212 537203040', email: 'contact@oncf.ma', hours: 'Tous les jours 6h–22h', managerName: 'ONCF' },

  // Mali (ML)
  { name: 'Commissariat central — Bamako', type: 'commissariat', address: 'Avenue Al Qods, Bamako', city: 'Bamako', country: 'ML', latitude: 12.6392, longitude: -8.0029, phone: '+223 20222398', email: 'dgsn@securite.gov.ml', hours: '24h/24', managerName: 'Police Nationale' },
  { name: 'USTTB — Bamako', type: 'universite', address: 'Point G, Bamako BP 1805', city: 'Bamako', country: 'ML', latitude: 12.639, longitude: -7.991, phone: '+223 20225277', email: 'contact@usttb.edu.ml', hours: 'Lun–Ven 7h–17h', managerName: 'Rectorat' },
  { name: 'Gare routière — Bamako', type: 'gare', address: 'Sogoniko, Bamako', city: 'Bamako', country: 'ML', latitude: 12.61, longitude: -7.95, phone: '+223 20201220', email: 'transport@transports.gouv.ml', hours: 'Tous les jours 5h–22h', managerName: 'Dir. Transports' },

  // Mexique (MX)
  { name: 'Ministerio Público — Mexico', type: 'commissariat', address: 'Dr. Río de la Loza 114, Centro, CDMX 06010', city: 'Mexico', country: 'MX', latitude: 19.426, longitude: -99.145, phone: '+52 55 52009000', email: 'contacto@ssc.cdmx.gob.mx', hours: '24h/24', managerName: 'SSC CDMX' },
  { name: 'UNAM — Ciudad Universitaria', type: 'universite', address: 'Av. Universidad 3000, Coyoacán, CDMX 04510', city: 'Mexico', country: 'MX', latitude: 19.3317, longitude: -99.1923, phone: '+52 55 56220000', email: 'info@unam.mx', hours: 'Lun–Ven 7h–21h', managerName: 'Coordinación estudiantil' },
  { name: 'Gare Buenavista — Mexico', type: 'gare', address: 'Eje 1 Norte Mosqueta 259, Buenavista, CDMX', city: 'Mexico', country: 'MX', latitude: 19.4484, longitude: -99.1523, phone: '+52 55 51301200', email: 'objetos@ferromex.mx', hours: 'Tous les jours 5h–23h', managerName: 'Ferromex' },

  // Niger (NE)
  { name: 'Direction Police Nationale — Niamey', type: 'commissariat', address: 'Avenue du Fleuve, Niamey', city: 'Niamey', country: 'NE', latitude: 13.5116, longitude: 2.1108, phone: '+227 20373143', email: 'dgsn@interieur.gov.ne', hours: '24h/24', managerName: 'DGSN Niger' },
  { name: 'Université Abdou Moumouni — Niamey', type: 'universite', address: 'BP 10896, Niamey', city: 'Niamey', country: 'NE', latitude: 13.504, longitude: 2.099, phone: '+227 20315075', email: 'rectorat@uam.refer.ne', hours: 'Lun–Ven 7h–17h', managerName: 'Rectorat UAM' },
  { name: 'Gare routière Wadata — Niamey', type: 'gare', address: 'Quartier Wadata, Niamey', city: 'Niamey', country: 'NE', latitude: 13.52, longitude: 2.105, phone: '+227 20733630', email: 'transport@gouv.ne', hours: 'Tous les jours 5h–22h', managerName: 'Dir. Transports' },

  // Nigéria (NG)
  { name: 'Force HQ — Abuja', type: 'commissariat', address: 'Louis Edet House, Shehu Shagari Way, Abuja', city: 'Abuja', country: 'NG', latitude: 9.0667, longitude: 7.4833, phone: '+234 9 2340426', email: 'info@npf.gov.ng', hours: '24h/24', managerName: 'Nigeria Police Force' },
  { name: 'University of Lagos — Akoka', type: 'universite', address: 'Akoka, Yaba, Lagos', city: 'Lagos', country: 'NG', latitude: 6.5168, longitude: 3.3864, phone: '+234 1 2802500', email: 'info@unilag.edu.ng', hours: 'Lun–Ven 8h–16h', managerName: 'Student Affairs' },
  { name: 'Mobolaji Johnson Station — Lagos', type: 'gare', address: 'Ebute Metta, Lagos', city: 'Lagos', country: 'NG', latitude: 6.5, longitude: 3.38, phone: '+234 1 2708000', email: 'info@nrc.gov.ng', hours: 'Tous les jours 6h–21h', managerName: 'Nigerian Railway Corp' },

  // Pays-Bas (NL)
  { name: 'Hoofdbureau Politie — La Haye', type: 'commissariat', address: 'Burgemeester Patijnlaan 19, 2585 BG La Haye', city: 'La Haye', country: 'NL', latitude: 52.0833, longitude: 4.3167, phone: '+31 88 1679000', email: 'info@politie.nl', hours: '24h/24', managerName: 'Politie Nederland' },
  { name: 'TU Delft — Campus', type: 'universite', address: 'Mekelweg 5, 2628 CC Delft', city: 'Delft', country: 'NL', latitude: 52.002, longitude: 4.373, phone: '+31 15 2789111', email: 'info@tudelft.nl', hours: 'Lun–Ven 8h–18h', managerName: 'Education & Student Affairs' },
  { name: 'Centraal Station — Amsterdam', type: 'gare', address: 'Stationsplein 15, 1012 AB Amsterdam', city: 'Amsterdam', country: 'NL', latitude: 52.3791, longitude: 4.8994, phone: '+31 30 7515155', email: 'gevondenvoorwerpen@ns.nl', hours: 'Tous les jours 6h–22h', managerName: 'NS' },

  // Philippines (PH)
  { name: 'PNP HQ — Quezon City', type: 'commissariat', address: 'Camp Crame, Quezon City 1111', city: 'Manille', country: 'PH', latitude: 14.6091, longitude: 121.0425, phone: '+63 2 87230001', email: 'info@pnp.gov.ph', hours: '24h/24', managerName: 'Philippine National Police' },
  { name: 'UP Diliman', type: 'universite', address: 'University Ave, Diliman, Quezon City', city: 'Quezon City', country: 'PH', latitude: 14.653, longitude: 121.072, phone: '+63 2 89818500', email: 'updiliman@up.edu.ph', hours: 'Lun–Ven 8h–17h', managerName: 'OSR' },
  { name: 'Tutuban Station — Manille', type: 'gare', address: 'Tutuban, Tondo, Manila 1012', city: 'Manille', country: 'PH', latitude: 14.61, longitude: 120.973, phone: '+63 2 83197348', email: 'info@pnr.gov.ph', hours: 'Tous les jours 5h–21h', managerName: 'PNR' },

  // Portugal (PT)
  { name: 'Comando Metropolitano — Lisbonne', type: 'commissariat', address: 'Rua Capelo 13, 1200-091 Lisbonne', city: 'Lisbonne', country: 'PT', latitude: 38.7075, longitude: -9.14, phone: '+351 213613900', email: 'geral@psp.pt', hours: '24h/24', managerName: 'PSP' },
  { name: 'Universidade de Lisboa — Cidade Universitária', type: 'universite', address: 'Alameda da Universidade, 1649-004 Lisbonne', city: 'Lisbonne', country: 'PT', latitude: 38.752, longitude: -9.158, phone: '+351 217967624', email: 'reitoria@ulisboa.pt', hours: 'Lun–Ven 9h–18h', managerName: 'Reitoria' },
  { name: 'Gare de Santa Apolónia — Lisbonne', type: 'gare', address: 'Av. Infante D. Henrique, 1100-316 Lisbonne', city: 'Lisbonne', country: 'PT', latitude: 38.7138, longitude: -9.1227, phone: '+351 707201280', email: 'perdidos@cp.pt', hours: 'Tous les jours 6h–22h', managerName: 'CP' },

  // RD Congo (CD)
  { name: 'Commissariat central — Kinshasa', type: 'commissariat', address: 'Avenue de la Libération, Gombe, Kinshasa', city: 'Kinshasa', country: 'CD', latitude: -4.325, longitude: 15.3229, phone: '+243 817100500', email: 'contact@pnc.cd', hours: '24h/24', managerName: 'PNC' },
  { name: 'Université de Kinshasa', type: 'universite', address: 'Route de Kimwenza, Mont Amba, Kinshasa', city: 'Kinshasa', country: 'CD', latitude: -4.415, longitude: 15.309, phone: '+243 810000001', email: 'contact@unikin.ac.cd', hours: 'Lun–Ven 7h–17h', managerName: 'Rectorat' },
  { name: 'Gare Centrale — Kinshasa', type: 'gare', address: 'Avenue des Aviateurs, Gombe, Kinshasa', city: 'Kinshasa', country: 'CD', latitude: -4.305, longitude: 15.313, phone: '+243 993015015', email: 'info@sncc.cd', hours: 'Lun–Sam 6h–18h', managerName: 'SNCC' },

  // Royaume-Uni (GB)
  { name: 'Met Police — Belgravia', type: 'commissariat', address: 'New Scotland Yard, Victoria Embankment, London SW1A 2JL', city: 'Londres', country: 'GB', latitude: 51.5081, longitude: -0.1247, phone: '+44 20 72301212', email: 'lostproperty@met.police.uk', hours: '24h/24', managerName: 'Metropolitan Police' },
  { name: 'University of Oxford — Wellington Square', type: 'universite', address: 'University Offices, Wellington Square, Oxford OX1 2JD', city: 'Oxford', country: 'GB', latitude: 51.757, longitude: -1.263, phone: '+44 1865 270000', email: 'enquiries@ox.ac.uk', hours: 'Lun–Ven 9h–17h', managerName: 'University Offices' },
  { name: 'King\'s Cross Station — Londres', type: 'gare', address: 'Euston Road, London N1 9AL', city: 'Londres', country: 'GB', latitude: 51.532, longitude: -0.124, phone: '+44 343 2221234', email: 'lostproperty@networkrail.co.uk', hours: 'Tous les jours 5h–1h', managerName: 'Network Rail' },

  // Sénégal (SN)
  { name: 'Commissariat central — Dakar', type: 'commissariat', address: 'Avenue Léopold Sédar Senghor, Dakar Plateau', city: 'Dakar', country: 'SN', latitude: 14.6937, longitude: -17.4441, phone: '+221 338002517', email: 'dgpn@interieur.gouv.sn', hours: '24h/24', managerName: 'Police Nationale' },
  { name: 'UCAD — Dakar', type: 'universite', address: 'Route de Ouakam, Dakar-Fann', city: 'Dakar', country: 'SN', latitude: 14.687, longitude: -17.463, phone: '+221 338246575', email: 'contact@ucad.edu.sn', hours: 'Lun–Ven 8h–17h', managerName: 'Rectorat' },
  { name: 'Gare Dakar Dem Dikk — Colobane', type: 'gare', address: 'Avenue Cheikh Anta Diop, Colobane, Dakar', city: 'Dakar', country: 'SN', latitude: 14.713, longitude: -17.449, phone: '+221 338494100', email: 'contact@demdikk.sn', hours: 'Tous les jours 5h–22h', managerName: 'Dakar Dem Dikk' },

  // Afrique du Sud (ZA)
  { name: 'SAPS HQ — Pretoria', type: 'commissariat', address: '231 Pretorius Street, Pretoria 0002', city: 'Pretoria', country: 'ZA', latitude: -25.7479, longitude: 28.2293, phone: '+27 12 3931000', email: 'saps@saps.gov.za', hours: '24h/24', managerName: 'SAPS' },
  { name: 'University of Cape Town', type: 'universite', address: 'Private Bag X3, Rondebosch 7701', city: 'Le Cap', country: 'ZA', latitude: -33.9576, longitude: 18.4606, phone: '+27 21 6509111', email: 'info@uct.ac.za', hours: 'Lun–Ven 8h30–16h30', managerName: 'Student Administration' },
  { name: 'Park Station — Johannesburg', type: 'gare', address: 'Rissik Street, Johannesburg 2001', city: 'Johannesburg', country: 'ZA', latitude: -26.1974, longitude: 28.0415, phone: '+27 11 0134000', email: 'info@prasa.com', hours: 'Tous les jours 5h–21h', managerName: 'PRASA' },

  // Suisse (CH)
  { name: 'Office fédéral de la Police — Berne', type: 'commissariat', address: 'Bundesrain 20, 3003 Berne', city: 'Berne', country: 'CH', latitude: 46.941, longitude: 7.438, phone: '+41 58 4621111', email: 'info@fedpol.admin.ch', hours: 'Lun–Ven 8h–17h', managerName: 'Fedpol' },
  { name: 'ETH Zürich — Zentrum', type: 'universite', address: 'Rämistrasse 101, 8092 Zürich', city: 'Zurich', country: 'CH', latitude: 47.3764, longitude: 8.5476, phone: '+41 44 6321111', email: 'info@ethz.ch', hours: 'Lun–Ven 7h–19h', managerName: 'Student Services' },
  { name: 'Gare Centrale de Berne (SBB)', type: 'gare', address: 'Bahnhofplatz 10A, 3001 Berne', city: 'Berne', country: 'CH', latitude: 46.949, longitude: 7.439, phone: '+41 900 300300', email: 'fundsachen@sbb.ch', hours: 'Tous les jours 6h–22h', managerName: 'SBB CFF' },

  // Togo (TG)
  { name: 'Direction Police Nationale — Lomé', type: 'commissariat', address: 'Avenue de la Libération, Lomé', city: 'Lomé', country: 'TG', latitude: 6.1319, longitude: 1.2228, phone: '+228 22214772', email: 'contact@police.gouv.tg', hours: '24h/24', managerName: 'DGPN Togo' },
  { name: 'Université de Lomé', type: 'universite', address: '01 BP 1515, Lomé', city: 'Lomé', country: 'TG', latitude: 6.172, longitude: 1.214, phone: '+228 22551048', email: 'contact@univ-lome.tg', hours: 'Lun–Ven 7h30–17h', managerName: 'Présidence UL' },
  { name: 'Gare SOTRAL — Lomé', type: 'gare', address: 'Attiégou, Lomé', city: 'Lomé', country: 'TG', latitude: 6.137, longitude: 1.215, phone: '+228 22611231', email: 'contact@sotral.tg', hours: 'Tous les jours 5h–21h', managerName: 'SOTRAL' },

];
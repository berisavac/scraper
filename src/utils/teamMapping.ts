/**
 * Team name mapping utility for matching Flashscore and Mozzart team names.
 * Canonical names are in English (Flashscore style).
 * Aliases include Serbian names, abbreviations, and common variations.
 */

// Canonical English name -> Serbian/abbreviated aliases
export const TEAM_ALIASES: Record<string, string[]> = {
  // England - Premier League
  'Arsenal': ['Arsenal', 'Арсенал'],
  'Aston Villa': ['Aston Vila', 'A. Villa', 'Aston Villa'],
  'Bournemouth': ['Bornmut', 'Bournemouth', 'AFC Bournemouth'],
  'Brentford': ['Brentford', 'Brentfod'],
  'Brighton': ['Brajton', 'Brighton', 'Brighton & Hove Albion'],
  'Chelsea': ['Čelsi', 'Chelsea', 'Челси'],
  'Crystal Palace': ['Kristal Palas', 'Crystal Palace', 'K. Palace'],
  'Everton': ['Everton', 'Евертон'],
  'Fulham': ['Fulam', 'Fulham'],
  'Ipswich': ['Ipswich', 'Ipsvič', 'Ipswich Town'],
  'Leicester': ['Lester', 'Leicester', 'Leicester City'],
  'Liverpool': ['Liverpul', 'Liverpool', 'Ливерпул'],
  'Manchester City': ['Mančester Siti', 'Man City', 'Manchester City', 'Man. City'],
  'Manchester Utd': ['Mančester Junajted', 'Man Utd', 'Manchester United', 'Man. United', 'Man United'],
  'Newcastle': ['Njukasl', 'Newcastle', 'Newcastle United', 'Newcastle Utd'],
  'Nott\'m Forest': ['Notingem Forest', 'Nottingham Forest', 'Nott\'m Forest', 'Nottingham'],
  'Southampton': ['Sautempton', 'Southampton'],
  'Tottenham': ['Totenhem', 'Tottenham', 'Tottenham Hotspur', 'Spurs'],
  'West Ham': ['Vest Hem', 'West Ham', 'West Ham United'],
  'Wolves': ['Vulverhempton', 'Wolverhampton', 'Wolves', 'Wolverhampton Wanderers'],

  // England - Championship
  'Blackburn': ['Blekbern', 'Blackburn', 'Blackburn Rovers'],
  'Bristol City': ['Bristol Siti', 'Bristol City'],
  'Burnley': ['Bernli', 'Burnley'],
  'Cardiff': ['Kardif', 'Cardiff', 'Cardiff City'],
  'Coventry': ['Koventri', 'Coventry', 'Coventry City'],
  'Derby': ['Derbi', 'Derby', 'Derby County'],
  'Hull': ['Hal', 'Hull', 'Hull City'],
  'Leeds': ['Lids', 'Leeds', 'Leeds United'],
  'Luton': ['Luton', 'Luton Town'],
  'Middlesbrough': ['Midlzbro', 'Middlesbrough'],
  'Millwall': ['Milvol', 'Millwall'],
  'Norwich': ['Norvič', 'Norwich', 'Norwich City'],
  'Oxford Utd': ['Oksford', 'Oxford', 'Oxford United'],
  'Plymouth': ['Plimut', 'Plymouth', 'Plymouth Argyle'],
  'Portsmouth': ['Portsmut', 'Portsmouth'],
  'Preston': ['Preston', 'Preston North End'],
  'QPR': ['QPR', 'Queens Park Rangers'],
  'Sheffield Utd': ['Šefild Junajted', 'Sheffield United', 'Sheffield Utd'],
  'Sheffield Wed': ['Šefild Venzdej', 'Sheffield Wednesday', 'Sheffield Wed'],
  'Stoke': ['Stouk', 'Stoke', 'Stoke City'],
  'Sunderland': ['Sanderlend', 'Sunderland'],
  'Swansea': ['Svonsi', 'Swansea', 'Swansea City'],
  'Watford': ['Votford', 'Watford'],
  'West Brom': ['Vest Bromvič', 'West Brom', 'West Bromwich Albion', 'WBA'],

  // Germany - Bundesliga
  'Bayern Munich': ['Bajern', 'Bayern', 'Bayern Minhen', 'Bayern München', 'FC Bayern'],
  'Dortmund': ['Dortmund', 'Borussia Dortmund', 'BVB'],
  'RB Leipzig': ['Lajpcig', 'Leipzig', 'RB Leipzig', 'RasenBallsport Leipzig'],
  'Leverkusen': ['Leverkuzen', 'Bayer Leverkusen', 'B. Leverkusen'],
  'Eintracht Frankfurt': ['Ajntraht Frankfurt', 'Frankfurt', 'Eintracht Frankfurt', 'E. Frankfurt'],
  'Freiburg': ['Frajburg', 'Freiburg', 'SC Freiburg'],
  'Hoffenheim': ['Hofenhajm', 'Hoffenheim', 'TSG Hoffenheim'],
  'Mainz': ['Majnc', 'Mainz', 'Mainz 05'],
  'Monchengladbach': ['Menhengladbah', 'Borussia Monchengladbach', 'B. Monchengladbach', 'Gladbach'],
  'Stuttgart': ['Štutgart', 'Stuttgart', 'VfB Stuttgart'],
  'Union Berlin': ['Union Berlin', 'FC Union Berlin'],
  'Werder Bremen': ['Verder Bremen', 'Werder Bremen', 'Bremen'],
  'Wolfsburg': ['Volfsburg', 'Wolfsburg', 'VfL Wolfsburg'],
  'Augsburg': ['Augzburg', 'Augsburg', 'FC Augsburg'],
  'Bochum': ['Bohum', 'Bochum', 'VfL Bochum'],
  'Heidenheim': ['Hajdenhajm', 'Heidenheim', 'FC Heidenheim'],
  'Holstein Kiel': ['Holštajn Kil', 'Holstein Kiel', 'Kiel'],
  'St. Pauli': ['Sankt Pauli', 'St. Pauli', 'FC St. Pauli'],

  // Spain - La Liga
  'Real Madrid': ['Real Madrid', 'R. Madrid', 'Реал Мадрид'],
  'Barcelona': ['Barselona', 'Barcelona', 'FC Barcelona', 'Барселона'],
  'Atletico Madrid': ['Atletiko Madrid', 'Atletico', 'Atletico Madrid', 'Atl. Madrid'],
  'Sevilla': ['Sevilja', 'Sevilla', 'Севиља'],
  'Real Sociedad': ['Real Sosijedad', 'Real Sociedad', 'R. Sociedad'],
  'Real Betis': ['Real Betis', 'Betis', 'R. Betis'],
  'Villarreal': ['Viljareal', 'Villarreal', 'Villarreal CF'],
  'Athletic Bilbao': ['Atletik Bilbao', 'Athletic', 'Athletic Club', 'Bilbao'],
  'Valencia': ['Valensija', 'Valencia', 'Valencia CF'],
  'Osasuna': ['Osasuna', 'CA Osasuna'],
  'Celta Vigo': ['Selta Vigo', 'Celta', 'Celta Vigo', 'RC Celta'],
  'Rayo Vallecano': ['Rajo Valjekano', 'Rayo', 'Rayo Vallecano'],
  'Mallorca': ['Majorka', 'Mallorca', 'RCD Mallorca'],
  'Getafe': ['Hetafe', 'Getafe', 'Getafe CF'],
  'Alaves': ['Alaves', 'Deportivo Alaves'],
  'Girona': ['Hirona', 'Girona', 'Girona FC'],
  'Las Palmas': ['Las Palmas', 'UD Las Palmas'],
  'Leganes': ['Leganes', 'CD Leganes'],
  'Espanyol': ['Espanjol', 'Espanyol', 'RCD Espanyol'],
  'Valladolid': ['Valjadolid', 'Valladolid', 'Real Valladolid'],

  // Italy - Serie A
  'Juventus': ['Juventus', 'Juve', 'Јувентус'],
  'Inter': ['Inter', 'Inter Milan', 'Internazionale', 'Интер'],
  'AC Milan': ['Milan', 'AC Milan', 'Милан'],
  'Napoli': ['Napoli', 'SSC Napoli', 'Наполи'],
  'Roma': ['Roma', 'AS Roma', 'Рома'],
  'Lazio': ['Lacio', 'Lazio', 'SS Lazio', 'Лацио'],
  'Atalanta': ['Atalanta', 'Аталанта'],
  'Fiorentina': ['Fiorentina', 'ACF Fiorentina', 'Фиорентина'],
  'Bologna': ['Bolonja', 'Bologna', 'FC Bologna'],
  'Torino': ['Torino', 'Toрино'],
  'Udinese': ['Udineze', 'Udinese'],
  'Empoli': ['Empoli', 'FC Empoli'],
  'Sassuolo': ['Sasuolo', 'Sassuolo'],
  'Genoa': ['Đenova', 'Genoa', 'Genoa CFC'],
  'Cagliari': ['Kaljari', 'Cagliari'],
  'Verona': ['Verona', 'Hellas Verona'],
  'Lecce': ['Leče', 'Lecce', 'US Lecce'],
  'Monza': ['Monca', 'Monza', 'AC Monza'],
  'Parma': ['Parma', 'Parma Calcio'],
  'Como': ['Komo', 'Como', 'Como 1907'],
  'Venezia': ['Venecija', 'Venezia', 'Venezia FC'],

  // France - Ligue 1
  'PSG': ['PSG', 'Paris Saint-Germain', 'Paris SG', 'Пари Сен Жермен'],
  'Marseille': ['Marsej', 'Marseille', 'Olympique Marseille', 'OM'],
  'Lyon': ['Lion', 'Lyon', 'Olympique Lyon', 'OL'],
  'Monaco': ['Monako', 'Monaco', 'AS Monaco'],
  'Lille': ['Lil', 'Lille', 'LOSC Lille', 'LOSC'],
  'Lens': ['Lans', 'Lens', 'RC Lens'],
  'Nice': ['Nica', 'Nice', 'OGC Nice'],
  'Rennes': ['Ren', 'Rennes', 'Stade Rennais'],
  'Strasbourg': ['Strazbur', 'Strasbourg', 'RC Strasbourg'],
  'Nantes': ['Nant', 'Nantes', 'FC Nantes'],
  'Montpellier': ['Monpelje', 'Montpellier', 'Montpellier HSC'],
  'Toulouse': ['Tuluz', 'Toulouse', 'Toulouse FC'],
  'Brest': ['Brest', 'Stade Brestois'],
  'Reims': ['Rems', 'Reims', 'Stade de Reims'],
  'Le Havre': ['Le Avr', 'Le Havre', 'Le Havre AC'],
  'Auxerre': ['Oser', 'Auxerre', 'AJ Auxerre'],
  'Angers': ['Anže', 'Angers', 'Angers SCO'],
  'St Etienne': ['Sent Etjen', 'Saint-Etienne', 'St Etienne', 'AS Saint-Etienne'],

  // Belgium - Jupiler Pro League
  'Club Brugge': ['Klub Briž', 'Club Brugge', 'Club Bruges'],
  'Anderlecht': ['Anderlecht', 'RSC Anderlecht'],
  'Genk': ['Genk', 'KRC Genk'],
  'Gent': ['Gent', 'KAA Gent'],
  'Antwerp': ['Antverp', 'Antwerp', 'Royal Antwerp'],
  'Standard Liege': ['Standard Liež', 'Standard Liege', 'Standard'],
  'Union SG': ['Union SG', 'Union Saint-Gilloise', 'Union St. Gilloise'],
  'Cercle Brugge': ['Serkl Briž', 'Cercle Brugge', 'Cercle Bruges'],
  'Mechelen': ['Mehelen', 'Mechelen', 'KV Mechelen'],
  'Charleroi': ['Šarlroa', 'Charleroi', 'Sporting Charleroi'],
  'Westerlo': ['Vesterlo', 'Westerlo', 'KVC Westerlo'],
  'St. Truiden': ['Sint Trajden', 'St. Truiden', 'STVV'],
  'Kortrijk': ['Kortrajk', 'Kortrijk', 'KV Kortrijk'],
  'OH Leuven': ['OH Leven', 'OH Leuven', 'Oud-Heverlee Leuven'],
  'Beerschot': ['Biršot', 'Beerschot'],
  'Dender': ['Dender', 'FCV Dender'],

  // Netherlands - Eredivisie
  'Ajax': ['Ajaks', 'Ajax', 'AFC Ajax'],
  'PSV': ['PSV', 'PSV Eindhoven'],
  'Feyenoord': ['Fajenord', 'Feyenoord'],
  'AZ': ['AZ', 'AZ Alkmaar'],
  'Twente': ['Tvente', 'Twente', 'FC Twente'],
  'Utrecht': ['Utreht', 'Utrecht', 'FC Utrecht'],
  'Heerenveen': ['Herenveen', 'Heerenveen', 'SC Heerenveen'],
  'Groningen': ['Groningen', 'FC Groningen'],
  'Vitesse': ['Vitese', 'Vitesse'],
  'Sparta Rotterdam': ['Sparta Roterdam', 'Sparta Rotterdam', 'Sparta'],
  'NEC': ['NEC', 'NEC Nijmegen'],
  'Go Ahead Eagles': ['Go Ahed Igls', 'Go Ahead Eagles', 'Go Ahead'],
  'Fortuna Sittard': ['Fortuna Sitard', 'Fortuna Sittard'],
  'RKC Waalwijk': ['RKC Valvajk', 'RKC Waalwijk', 'RKC'],
  'Heracles': ['Herakles', 'Heracles', 'Heracles Almelo'],
  'Willem II': ['Vilem II', 'Willem II'],
  'Almere City': ['Almer Siti', 'Almere City', 'Almere City FC'],
  'NAC Breda': ['NAC Breda', 'NAC'],

  // Switzerland - Super League
  'Young Boys': ['Jang Bojs', 'Young Boys', 'BSC Young Boys'],
  'Basel': ['Bazel', 'Basel', 'FC Basel'],
  'Zurich': ['Cirih', 'Zurich', 'FC Zurich', 'Zürich'],
  'Servette': ['Servet', 'Servette', 'Servette FC'],
  'Lugano': ['Lugano', 'FC Lugano'],
  'St. Gallen': ['Sankt Galen', 'St. Gallen', 'FC St. Gallen'],
  'Lausanne': ['Lozana', 'Lausanne', 'Lausanne Sport'],
  'Luzern': ['Lucern', 'Luzern', 'FC Luzern'],
  'Sion': ['Sion', 'FC Sion'],
  'Grasshoppers': ['Grashopersi', 'Grasshoppers', 'Grasshopper Club'],
  'Winterthur': ['Vintertir', 'Winterthur', 'FC Winterthur'],
  'Yverdon': ['Iverdon', 'Yverdon', 'Yverdon Sport'],
};

// Build reverse lookup map
const reverseAliasMap = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(TEAM_ALIASES)) {
  for (const alias of aliases) {
    reverseAliasMap.set(alias.toLowerCase(), canonical);
  }
  // Also map canonical name to itself (lowercase)
  reverseAliasMap.set(canonical.toLowerCase(), canonical);
}

/**
 * Normalize team name to canonical form
 * @param name - Team name from any source
 * @returns Canonical name or null if no match found
 */
export function normalizeTeamName(name: string): string | null {
  if (!name) return null;

  const normalized = name.trim().toLowerCase();
  return reverseAliasMap.get(normalized) || null;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity ratio between two strings (0 to 1)
 */
function similarity(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

/**
 * Check if two team names match using various strategies
 */
function teamsMatch(fsTeam: string, mozTeam: string): boolean {
  if (!fsTeam || !mozTeam) return false;

  const fsLower = fsTeam.toLowerCase().trim();
  const mozLower = mozTeam.toLowerCase().trim();

  // 1. Exact match
  if (fsLower === mozLower) return true;

  // 2. Canonical name match via TEAM_ALIASES lookup
  const fsCanonical = normalizeTeamName(fsTeam);
  const mozCanonical = normalizeTeamName(mozTeam);

  if (fsCanonical && mozCanonical && fsCanonical === mozCanonical) {
    return true;
  }

  // 3. Fuzzy match (Levenshtein similarity >= 0.8)
  if (similarity(fsLower, mozLower) >= 0.8) {
    return true;
  }

  // 4. Substring match (min 4 chars) - check if either contains the other
  if (fsLower.length >= 4 && mozLower.length >= 4) {
    if (fsLower.includes(mozLower) || mozLower.includes(fsLower)) {
      return true;
    }
  }

  return false;
}

/**
 * Match teams from Flashscore and Mozzart
 * @param fsHome - Flashscore home team name
 * @param fsAway - Flashscore away team name
 * @param mozHome - Mozzart home team name
 * @param mozAway - Mozzart away team name
 * @returns true if both teams match
 */
export function matchTeams(
  fsHome: string,
  fsAway: string,
  mozHome: string,
  mozAway: string
): boolean {
  return teamsMatch(fsHome, mozHome) && teamsMatch(fsAway, mozAway);
}

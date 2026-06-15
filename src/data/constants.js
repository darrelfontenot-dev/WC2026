export const GROUPS = {
  A:['MEX','RSA','KOR','CZE'], B:['CAN','SUI','QAT','BIH'],
  C:['BRA','MAR','SCO','HAI'], D:['USA','PAR','AUS','TUR'],
  E:['GER','CUW','CIV','ECU'], F:['NED','JPN','TUN','SWE'],
  G:['BEL','EGY','IRN','NZL'], H:['ESP','URU','KSA','CPV'],
  I:['FRA','SEN','NOR','IRQ'], J:['ARG','AUT','ALG','JOR'],
  K:['POR','COL','UZB','COD'], L:['ENG','CRO','GHA','PAN']
};

export const FLAGS = {
  MEX:'\u{1F1F2}\u{1F1FD}',RSA:'\u{1F1FF}\u{1F1E6}',KOR:'\u{1F1F0}\u{1F1F7}',CZE:'\u{1F1E8}\u{1F1FF}',
  CAN:'\u{1F1E8}\u{1F1E6}',SUI:'\u{1F1E8}\u{1F1ED}',QAT:'\u{1F1F6}\u{1F1E6}',BIH:'\u{1F1E7}\u{1F1E6}',
  BRA:'\u{1F1E7}\u{1F1F7}',MAR:'\u{1F1F2}\u{1F1E6}',SCO:'\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  HAI:'\u{1F1ED}\u{1F1F9}',USA:'\u{1F1FA}\u{1F1F8}',PAR:'\u{1F1F5}\u{1F1FE}',AUS:'\u{1F1E6}\u{1F1FA}',
  TUR:'\u{1F1F9}\u{1F1F7}',GER:'\u{1F1E9}\u{1F1EA}',CUW:'\u{1F1E8}\u{1F1FC}',CIV:'\u{1F1E8}\u{1F1EE}',
  ECU:'\u{1F1EA}\u{1F1E8}',NED:'\u{1F1F3}\u{1F1F1}',JPN:'\u{1F1EF}\u{1F1F5}',TUN:'\u{1F1F9}\u{1F1F3}',
  SWE:'\u{1F1F8}\u{1F1EA}',BEL:'\u{1F1E7}\u{1F1EA}',EGY:'\u{1F1EA}\u{1F1EC}',IRN:'\u{1F1EE}\u{1F1F7}',
  NZL:'\u{1F1F3}\u{1F1FF}',ESP:'\u{1F1EA}\u{1F1F8}',URU:'\u{1F1FA}\u{1F1FE}',KSA:'\u{1F1F8}\u{1F1E6}',
  CPV:'\u{1F1E8}\u{1F1FB}',FRA:'\u{1F1EB}\u{1F1F7}',SEN:'\u{1F1F8}\u{1F1F3}',NOR:'\u{1F1F3}\u{1F1F4}',
  IRQ:'\u{1F1EE}\u{1F1F6}',ARG:'\u{1F1E6}\u{1F1F7}',AUT:'\u{1F1E6}\u{1F1F9}',ALG:'\u{1F1E9}\u{1F1FF}',
  JOR:'\u{1F1EF}\u{1F1F4}',POR:'\u{1F1F5}\u{1F1F9}',COL:'\u{1F1E8}\u{1F1F4}',UZB:'\u{1F1FA}\u{1F1FF}',
  COD:'\u{1F1E8}\u{1F1E9}',ENG:'\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  CRO:'\u{1F1ED}\u{1F1F7}',GHA:'\u{1F1EC}\u{1F1ED}',PAN:'\u{1F1F5}\u{1F1E6}'
};

export const NAMES = {
  MEX:'Mexico',RSA:'South Africa',KOR:'South Korea',CZE:'Czech Republic',
  CAN:'Canada',SUI:'Switzerland',QAT:'Qatar',BIH:'Bosnia and Herzegovina',
  BRA:'Brazil',MAR:'Morocco',SCO:'Scotland',HAI:'Haiti',
  USA:'United States',PAR:'Paraguay',AUS:'Australia',TUR:'Turkey',
  GER:'Germany',CUW:'Curaçao',CIV:"Côte d'Ivoire",ECU:'Ecuador',
  NED:'Netherlands',JPN:'Japan',TUN:'Tunisia',SWE:'Sweden',
  BEL:'Belgium',EGY:'Egypt',IRN:'Iran',NZL:'New Zealand',
  ESP:'Spain',URU:'Uruguay',KSA:'Saudi Arabia',CPV:'Cape Verde',
  FRA:'France',SEN:'Senegal',NOR:'Norway',IRQ:'Iraq',
  ARG:'Argentina',AUT:'Austria',ALG:'Algeria',JOR:'Jordan',
  POR:'Portugal',COL:'Colombia',UZB:'Uzbekistan',COD:'DR Congo',
  ENG:'England',CRO:'Croatia',GHA:'Ghana',PAN:'Panama'
};

export const KO = {
  left_r32: [
    {id:74,info:'Jun 29 3:30pm · Foxborough',home:'1E',away:'3ABCDF'},
    {id:77,info:'Jun 30 4:00pm · East Rutherford',home:'1I',away:'3CDFGH'},
    {id:73,info:'Jun 28 2:00pm · Inglewood',home:'2A',away:'2B'},
    {id:75,info:'Jun 29 8:00pm · Guadalupe',home:'1F',away:'2C'},
    {id:83,info:'Jul 2 6:00pm · Toronto',home:'2K',away:'2L'},
    {id:84,info:'Jul 2 2:00pm · Inglewood',home:'1H',away:'2J'},
    {id:81,info:'Jul 1 7:00pm · Santa Clara',home:'1D',away:'3BEFIJ'},
    {id:82,info:'Jul 1 3:00pm · Seattle',home:'1G',away:'3AEHIJ'},
  ],
  left_r16: [
    {id:89,info:'Jul 4 4:00pm · Philadelphia',home:'W74',away:'W77'},
    {id:90,info:'Jul 4 12:00pm · Houston',home:'W73',away:'W75'},
    {id:93,info:'Jul 6 2:00pm · Arlington',home:'W83',away:'W84'},
    {id:94,info:'Jul 6 7:00pm · Seattle',home:'W81',away:'W82'},
  ],
  left_qf: [
    {id:97,info:'Jul 9 3:00pm · Foxborough',home:'W89',away:'W90'},
    {id:98,info:'Jul 10 2:00pm · Inglewood',home:'W93',away:'W94'},
  ],
  left_sf: [{id:101,info:'Jul 14 2:00pm · Arlington',home:'W97',away:'W98'}],
  right_r32: [
    {id:76,info:'Jun 29 12:00pm · Houston',home:'1C',away:'2F'},
    {id:78,info:'Jun 30 12:00pm · Arlington',home:'2E',away:'2I'},
    {id:79,info:'Jun 30 8:00pm · Mexico City',home:'1A',away:'3CEFHI'},
    {id:80,info:'Jul 1 11:00am · Atlanta',home:'1L',away:'3EHIJK'},
    {id:86,info:'Jul 3 5:00pm · Miami',home:'1J',away:'2H'},
    {id:88,info:'Jul 3 1:00pm · Arlington',home:'2D',away:'2G'},
    {id:85,info:'Jul 2 10:00pm · Vancouver',home:'1B',away:'3EFGIJ'},
    {id:87,info:'Jul 3 8:30pm · Kansas City',home:'1K',away:'3DEIJL'},
  ],
  right_r16: [
    {id:91,info:'Jul 5 3:00pm · East Rutherford',home:'W76',away:'W78'},
    {id:92,info:'Jul 5 7:00pm · Mexico City',home:'W79',away:'W80'},
    {id:95,info:'Jul 7 11:00am · Atlanta',home:'W86',away:'W88'},
    {id:96,info:'Jul 7 3:00pm · Vancouver',home:'W85',away:'W87'},
  ],
  right_qf: [
    {id:99,info:'Jul 11 4:00pm · Miami',home:'W91',away:'W92'},
    {id:100,info:'Jul 11 8:00pm · Kansas City',home:'W95',away:'W96'},
  ],
  right_sf: [{id:102,info:'Jul 15 2:00pm · Atlanta',home:'W99',away:'W100'}],
  final: {id:104,info:'Jul 19 2:00pm · East Rutherford',home:'W101',away:'W102'},
  third: {id:103,info:'Jul 18 4:00pm · Miami',home:'L101',away:'L102'},
};

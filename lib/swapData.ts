// 변경 영웅(교체) 데이터 — 사용자 제공 보충 데이터.
// 시트의 메모(43열)가 비어 있어, 경기 중 영웅 교체 정보를 이 파일로 주입한다.
// 경기 결과·전적·밴·픽(오프닝)은 여전히 시트에서 읽는다. 여기서는 "오프닝 이후 교체"만 보강.
// 형식: 선수(역할): 첫영웅 → 교체1 → 교체2 ...  (교체 없으면 첫영웅만)
// data.ts 의 parseSwapData()/attachSwaps() 가 (날짜·팀·맵·선수) 키로 세트에 매칭한다.

export const SWAP_DATA_RAW = `
■ 06/05  O2 Blast vs ZANSIDE
· Ilios
  [O2 Blast]
    Perr(딜러): Sojourn
    WuTian(딜러): Pharah → Tracer → Symmetra
    Fate(탱커): Wrecking Ball
    Misin(서포터): Ana → Juno
    Faith(서포터): Brigitte
  [ZANSIDE]
    Becky(딜러): Symmetra → Tracer → Echo
    Kilo(딜러): Cassidy
    Void(탱커): Mauga → Hazard
    OPENER(서포터): Lúcio
    iR0NY(서포터): Kiriko → Juno
· Runasapi
  [O2 Blast]
    Perr(딜러): Bastion → Cassidy
    WuTian(딜러): Tracer → Bastion
    SeungAn(탱커): Ramattra
    Misin(서포터): Kiriko → Juno
    Faith(서포터): Jetpack Cat
  [ZANSIDE]
    Becky(딜러): Symmetra → Tracer
    Kilo(딜러): Cassidy → Bastion
    Void(탱커): D.Va → Ramattra
    OPENER(서포터): Lifeweaver → Jetpack Cat
    iR0NY(서포터): Kiriko → Juno
· Suravasa
  [O2 Blast]
    Perr(딜러): Sojourn
    WuTian(딜러): Tracer → Pharah
    SeungAn(탱커): Sigma
    Misin(서포터): Kiriko → Juno
    Faith(서포터): Lifeweaver
  [ZANSIDE]
    Becky(딜러): Mei → Tracer → Pharah
    Kilo(딜러): Sojourn
    Void(탱커): Sigma → D.Va
    OPENER(서포터): Lifeweaver
    iR0NY(서포터): Kiriko → Juno

■ 06/05  T1 vs ZETA
· Antarctic Peninsula
  [T1]
    Proud(딜러): Sojourn
    Zest(딜러): Vendetta
    DONGHAK(탱커): Mauga
    Bliss(서포터): Lúcio
    Skewed(서포터): Kiriko → Juno
  [ZETA]
    Knife(딜러): Symmetra → Reaper
    Proper(딜러): Cassidy → Sojourn → Tracer
    Bernar(탱커): Ramattra → Mauga
    Viol2t(서포터): Juno
    shu(서포터): Mizuki
· King's Row
  [T1]
    Proud(딜러): Sojourn → Cassidy
    Zest(딜러): Vendetta → Symmetra → Tracer
    DONGHAK(탱커): Zarya → D.Va → Sigma
    Bliss(서포터): Wuyang → Mizuki
    Skewed(서포터): Ana → Baptiste → Moira
  [ZETA]
    Knife(딜러): Symmetra → Cassidy → Sojourn
    Proper(딜러): Mei → Reaper → Freja
    Bernar(탱커): Ramattra → Sigma → D.Va
    Viol2t(서포터): Juno → Baptiste → Jetpack Cat
    shu(서포터): Ana → Mizuki → Moira
· New Junk City
  [T1]
    Proud(딜러): Sojourn
    Zest(딜러): Vendetta
    DONGHAK(탱커): Doomfist → Hazard
    Bliss(서포터): Lúcio
    Skewed(서포터): Kiriko → Juno
  [ZETA]
    Knife(딜러): Sojourn → Symmetra → Bastion
    Proper(딜러): Tracer → Bastion
    Mealgaru(탱커): Roadhog → Wrecking Ball → Doomfist
    Viol2t(서포터): Kiriko → Jetpack Cat → Juno
    shu(서포터): Mizuki
· Rialto
  [T1]
    Proud(딜러): Bastion → Cassidy
    Zest(딜러): Reaper → Vendetta → Pharah
    DONGHAK(탱커): Mauga → Wrecking Ball
    Bliss(서포터): Jetpack Cat → Wuyang
    Skewed(서포터): Ana → Kiriko
  [ZETA]
    Knife(딜러): Bastion → Tracer
    Proper(딜러): Tracer → Reaper → Pharah
    Bernar(탱커): Mauga → Sigma
    Viol2t(서포터): Jetpack Cat
    shu(서포터): Kiriko → Mizuki
· Runasapi
  [T1]
    Proud(딜러): Sojourn
    Zest(딜러): Reaper → Vendetta
    DONGHAK(탱커): Mauga → Hazard
    Bliss(서포터): Lúcio
    Skewed(서포터): Kiriko → Juno
  [ZETA]
    Knife(딜러): Cassidy → Sojourn → Tracer
    Proper(딜러): Reaper → Tracer → Symmetra
    Bernar(탱커): Mauga
    Viol2t(서포터): Lúcio → Juno
    shu(서포터): Kiriko → Mizuki

■ 06/05  Team Falcons vs Crazy Raccoon
· Antarctic Peninsula
  [Team Falcons]
    Mer1t(딜러): Bastion → Cassidy → Symmetra
    Checkmate(딜러): Symmetra → Sombra
    SOMEONE(탱커): Sigma → Ramattra
    Fielder(서포터): Kiriko → Mizuki → Juno
    ChiYo(서포터): Mizuki → Juno
  [Crazy Raccoon]
    HeeSang(딜러): Symmetra
    Stalk3r(딜러): Bastion
    MAX(탱커): Sigma
    CH0R0NG(서포터): Mizuki
    vigilante(서포터): Kiriko → Lúcio
· King's Row
  [Team Falcons]
    Mer1t(딜러): Bastion → Sojourn
    Checkmate(딜러): Symmetra → Mei
    SOMEONE(탱커): Sigma → Orisa → Reinhardt
    Fielder(서포터): Kiriko
    ChiYo(서포터): Juno → Mizuki
  [Crazy Raccoon]
    HeeSang(딜러): Symmetra → Mei → Junkrat
    Stalk3r(딜러): Bastion → Sojourn → Mei
    MAX(탱커): Sigma
    CH0R0NG(서포터): Mizuki → Jetpack Cat
    vigilante(서포터): Kiriko → Juno → Lifeweaver
· New Queen Street
  [Team Falcons]
    Mer1t(딜러): Sojourn
    SP1NT(딜러): Anran → Reaper
    Hanbin(탱커): Mauga
    Fielder(서포터): Mizuki → Brigitte
    ChiYo(서포터): Juno
  [Crazy Raccoon]
    HeeSang(딜러): Tracer → Symmetra
    LIP(딜러): Sojourn → Cassidy
    JunBin(탱커): Mauga → D.Va
    CH0R0NG(서포터): Lúcio → Mizuki
    vigilante(서포터): Kiriko → Juno

■ 06/06  POKER FACE vs CHEESEBURGER
· Antarctic Peninsula
  [POKER FACE]
    K4ne(딜러): Sojourn
    D0D0(딜러): Symmetra
    Fearful(탱커): Ramattra
    CARU(서포터): Kiriko
    Sp1nel(서포터): Lúcio
  [CHEESEBURGER]
    Argon(딜러): Symmetra
    M1nut2(딜러): Sojourn
    Gur3um(탱커): Sigma
    WoochaN(서포터): Kiriko
    TenTen(서포터): Lúcio
· Runasapi
  [POKER FACE]
    K4ne(딜러): Bastion → Widowmaker
    D0D0(딜러): Reaper → Tracer
    Fearful(탱커): Mauga
    CARU(서포터): Kiriko → Juno
    Sp1nel(서포터): Jetpack Cat
  [CHEESEBURGER]
    Argon(딜러): Reaper
    M1nut2(딜러): Bastion → Sombra
    Gur3um(탱커): Mauga
    WoochaN(서포터): Kiriko
    TenTen(서포터): Jetpack Cat
· Suravasa
  [POKER FACE]
    K4ne(딜러): Sojourn
    D0D0(딜러): Symmetra → Tracer
    Fearful(탱커): Reinhardt → Ramattra
    CARU(서포터): Kiriko
    Sp1nel(서포터): Lúcio
  [CHEESEBURGER]
    Argon(딜러): Symmetra
    M1nut2(딜러): Sojourn → Bastion
    FARMER(탱커): Mauga
    WoochaN(서포터): Kiriko → Juno
    TenTen(서포터): Mizuki

■ 06/06  T1 vs SuperBad
· Ilios
  [T1]
    Proud(딜러): Widowmaker → Sombra
    Zest(딜러): Tracer → Symmetra
    DONGHAK(탱커): Wrecking Ball
    Bliss(서포터): Jetpack Cat
    Skewed(서포터): Ana
  [SuperBad]
    SORI(딜러): Widowmaker → Bastion → Sombra
    AZENT(딜러): Tracer → Symmetra
    SENTIER(탱커): Wrecking Ball
    Soae(서포터): Jetpack Cat → Lúcio
    Univ2r(서포터): Kiriko → Juno
· New Junk City
  [T1]
    Proud(딜러): Sojourn
    Zest(딜러): Vendetta
    Jasm1ne(탱커): Zarya
    Fleta(서포터): Kiriko → Juno
    Skewed(서포터): Lúcio
  [SuperBad]
    SORI(딜러): Sojourn → Symmetra
    AZENT(딜러): Vendetta
    homerunball(탱커): Zarya
    Dumbbell(서포터): Lúcio
    Univ2r(서포터): Kiriko
· Numbani
  [T1]
    Proud(딜러): Sojourn
    Zest(딜러): Junkrat → Vendetta
    Jasm1ne(탱커): Sigma → Zarya
    Bliss(서포터): Mizuki → Lúcio
    Skewed(서포터): Kiriko
  [SuperBad]
    SORI(딜러): Sojourn → Cassidy → Mei
    Soae(딜러): Symmetra → Mei
    homerunball(탱커): Ramattra → Sigma
    Dumbbell(서포터): Lúcio → Mizuki
    Univ2r(서포터): Kiriko
· Oasis
  [T1]
    Proud(딜러): Widowmaker → Sombra
    Zest(딜러): Tracer → Symmetra
    DONGHAK(탱커): Wrecking Ball
    Bliss(서포터): Jetpack Cat
    Skewed(서포터): Ana
  [SuperBad]
    SORI(딜러): Widowmaker → Bastion → Sombra
    AZENT(딜러): Tracer → Symmetra
    SENTIER(탱커): Wrecking Ball
    Soae(서포터): Jetpack Cat → Lúcio
    Univ2r(서포터): Kiriko → Juno

■ 06/06  ZANSIDE vs Team Falcons
· Oasis
  [ZANSIDE]
    Becky(딜러): Symmetra
    Kilo(딜러): Bastion → Tracer
    Void(탱커): D.Va → Ramattra
    iR0NY(서포터): Kiriko
    OPENER(서포터): Lúcio
  [Team Falcons]
    Mer1t(딜러): Bastion
    SP1NT(딜러): Tracer → Symmetra
    Hanbin(탱커): D.Va
    Fielder(서포터): Kiriko → Juno
    ChiYo(서포터): Jetpack Cat
· Runasapi
  [ZANSIDE]
    Becky(딜러): Symmetra
    Kilo(딜러): Cassidy
    Void(탱커): Ramattra
    iR0NY(서포터): Kiriko → Juno
    OPENER(서포터): Lúcio → Mizuki
  [Team Falcons]
    Mer1t(딜러): Cassidy
    Checkmate(딜러): Symmetra
    SOMEONE(탱커): Ramattra
    Fielder(서포터): Kiriko → Juno
    ChiYo(서포터): Lúcio
· Suravasa
  [ZANSIDE]
    Becky(딜러): Reaper → Symmetra
    Kilo(딜러): Sojourn
    Void(탱커): Mauga → Ramattra
    iR0NY(서포터): Kiriko → Juno
    OPENER(서포터): Lúcio
  [Team Falcons]
    Mer1t(딜러): Sojourn
    SP1NT(딜러): Anran → Reaper → Symmetra
    Hanbin(탱커): Mauga
    Fielder(서포터): Kiriko → Brigitte → Jetpack Cat
    ChiYo(서포터): Juno

■ 06/07  Crazy Raccoon vs POKER FACE
· Ilios
  [Crazy Raccoon]
    HeeSang(딜러): Bastion → Widowmaker → Symmetra
    LIP(딜러): Cassidy
    MAX(탱커): D.Va → Reinhardt
    CH0R0NG(서포터): Jetpack Cat
    vigilante(서포터): Wuyang → Baptiste
  [POKER FACE]
    K4ne(딜러): Bastion → Widowmaker → Cassidy
    D0D0(딜러): Tracer → Reaper → Symmetra
    Fearful(탱커): Hazard → Ramattra → Reinhardt
    CARU(서포터): Kiriko → Juno
    Sp1nel(서포터): Jetpack Cat
· Runasapi
  [Crazy Raccoon]
    Stalk3r(딜러): Tracer
    LIP(딜러): Sojourn
    JunBin(탱커): Wrecking Ball
    CH0R0NG(서포터): Jetpack Cat
    vigilante(서포터): Wuyang
  [POKER FACE]
    K4ne(딜러): Cassidy → Widowmaker
    D0D0(딜러): Tracer → Symmetra
    Fearful(탱커): Wrecking Ball → Mauga
    CARU(서포터): Juno → Kiriko
    Sp1nel(서포터): Brigitte
· Suravasa
  [Crazy Raccoon]
    HeeSang(딜러): Pharah → Tracer → Symmetra
    LIP(딜러): Sojourn
    MAX(탱커): Ramattra → D.Va → Wrecking Ball
    CH0R0NG(서포터): Lúcio
    vigilante(서포터): Kiriko
  [POKER FACE]
    K4ne(딜러): Sojourn
    D0D0(딜러): Pharah → Symmetra → Tracer
    Fearful(탱커): Ramattra
    CARU(서포터): Kiriko
    Sp1nel(서포터): Lúcio

■ 06/07  SuperBad vs O2 Blast
· Hollywood
  [SuperBad]
    SORI(딜러): Cassidy → Sojourn → Bastion
    AZENT(딜러): Symmetra → Pharah → Cassidy
    SENTIER(탱커): Sigma → Doomfist
    Soae(서포터): Mizuki → Jetpack Cat → Lifeweaver
    Univ2r(서포터): Kiriko → Lúcio
  [O2 Blast]
    Perr(딜러): Sojourn → Bastion → Hanzo
    WuTian(딜러): Pharah → Cassidy → Widowmaker
    SeungAn(탱커): Sigma
    Misin(서포터): Kiriko → Zenyatta
    Faith(서포터): Mizuki → Jetpack Cat → Juno
· Oasis
  [SuperBad]
    SORI(딜러): Bastion → Tracer
    AZENT(딜러): Reaper → Symmetra → Tracer
    SENTIER(탱커): Mauga → Wrecking Ball
    Soae(서포터): Jetpack Cat
    Univ2r(서포터): Kiriko
  [O2 Blast]
    Perr(딜러): Bastion
    WuTian(딜러): Reaper → Symmetra
    Fate(탱커): Mauga → Doomfist
    Misin(서포터): Kiriko → Juno → Moira
    Faith(서포터): Jetpack Cat
· Rialto
  [SuperBad]
    SORI(딜러): Cassidy → Bastion
    AZENT(딜러): Tracer → Symmetra → Pharah
    homerunball(탱커): Orisa → D.Va
    Dumbbell(서포터): Mizuki → Brigitte → Lúcio
    Univ2r(서포터): Kiriko
  [O2 Blast]
    Perr(딜러): Bastion → Cassidy
    WuTian(딜러): Tracer → Bastion → Widowmaker
    SeungAn(탱커): Ramattra → D.Va → Sigma
    Misin(서포터): Kiriko → Juno → Zenyatta
    Faith(서포터): Jetpack Cat → Mercy

■ 06/07  ZETA vs CHEESEBURGER
· Dorado
  [ZETA]
    Knife(딜러): Bastion
    Proper(딜러): Tracer → Reaper
    Mealgaru(탱커): Wrecking Ball → Reinhardt
    Viol2t(서포터): Jetpack Cat
    shu(서포터): Ana
  [CHEESEBURGER]
    Argon(딜러): Tracer → Reaper → Hanzo
    M1nut2(딜러): Bastion → Widowmaker
    FARMER(탱커): Mauga → Wrecking Ball
    WoochaN(서포터): Ana
    TenTen(서포터): Jetpack Cat
· Oasis
  [ZETA]
    Knife(딜러): Bastion → Genji
    Proper(딜러): Pharah → Symmetra
    Bernar(탱커): Sigma
    Viol2t(서포터): Kiriko → Juno
    shu(서포터): Mizuki
  [CHEESEBURGER]
    Argon(딜러): Symmetra → Mei → Echo
    M1nut2(딜러): Cassidy → Sojourn → Widowmaker
    Gur3um(탱커): Sigma
    WoochaN(서포터): Kiriko → Juno
    TenTen(서포터): Mizuki → Lúcio
· Runasapi
  [ZETA]
    Knife(딜러): Bastion
    Proper(딜러): Reaper
    Bernar(탱커): D.Va
    Viol2t(서포터): Jetpack Cat
    shu(서포터): Kiriko
  [CHEESEBURGER]
    Argon(딜러): Reaper
    M1nut2(딜러): Bastion → Venture
    Gur3um(탱커): D.Va
    WoochaN(서포터): Kiriko
    TenTen(서포터): Jetpack Cat

■ 06/12  CHEESEBURGER vs SuperBad
· Ilios
  [CHEESEBURGER]
    Argon(딜러): Reaper → Symmetra
    M1nut2(딜러): Cassidy
    FARMER(탱커): Wrecking Ball → Roadhog
    WoochaN(서포터): Kiriko → Juno
    TenTen(서포터): Mizuki
  [SuperBad]
    SORI(딜러): Cassidy
    AZENT(딜러): Tracer → Pharah → Symmetra
    SENTIER(탱커): Wrecking Ball
    Dumbbell(서포터): Mizuki
    Univ2r(서포터): Kiriko → Juno
· King's Row
  [CHEESEBURGER]
    Argon(딜러): Symmetra → Genji → Echo
    M1nut2(딜러): Sojourn → Widowmaker
    Gur3um(탱커): Sigma → Winston
    WoochaN(서포터): Ana → Kiriko
    TenTen(서포터): Mizuki → Wuyang → Jetpack Cat
  [SuperBad]
    SORI(딜러): Sojourn → Tracer → Widowmaker
    Soae(딜러): Symmetra → Mei → Tracer
    homerunball(탱커): Sigma → Zarya → D.Va
    Dumbbell(서포터): Mizuki
    Univ2r(서포터): Kiriko
· New Junk City
  [CHEESEBURGER]
    Argon(딜러): Symmetra
    M1nut2(딜러): Sojourn
    Gur3um(탱커): Sigma
    WoochaN(서포터): Kiriko → Juno
    TenTen(서포터): Mizuki
  [SuperBad]
    SORI(딜러): Sojourn
    Soae(딜러): Symmetra
    homerunball(탱커): Ramattra → Sigma
    Dumbbell(서포터): Lúcio
    Univ2r(서포터): Kiriko

■ 06/12  Crazy Raccoon vs ZANSIDE
· Antarctic Peninsula
  [Crazy Raccoon]
    HeeSang(딜러): Reaper → Pharah → Symmetra
    LIP(딜러): Bastion
    MAX(탱커): Mauga
    CH0R0NG(서포터): Jetpack Cat
    vigilante(서포터): Kiriko → Juno
  [ZANSIDE]
    Becky(딜러): Tracer → Vendetta → Symmetra
    Kilo(딜러): Cassidy
    HEISER(탱커): Mauga → Doomfist
    iR0NY(서포터): Juno
    OPENER(서포터): Kiriko
· Hollywood
  [Crazy Raccoon]
    HeeSang(딜러): Symmetra
    LIP(딜러): Ashe → Cassidy
    MAX(탱커): Sigma → Reinhardt
    CH0R0NG(서포터): Brigitte → Lúcio
    vigilante(서포터): Baptiste
  [ZANSIDE]
    Becky(딜러): Symmetra → Vendetta
    Kilo(딜러): Cassidy → Widowmaker
    Void(탱커): Sigma → D.Va
    iR0NY(서포터): Kiriko → Baptiste → Ana
    OPENER(서포터): Mizuki → Lúcio → Brigitte
· Runasapi
  [Crazy Raccoon]
    HeeSang(딜러): Pharah → Symmetra
    LIP(딜러): Cassidy → Sojourn
    MAX(탱커): Zarya
    CH0R0NG(서포터): Lúcio
    vigilante(서포터): Kiriko → Baptiste
  [ZANSIDE]
    Becky(딜러): Symmetra → Vendetta
    Kilo(딜러): Cassidy
    HEISER(탱커): Hazard → Reinhardt → Ramattra
    iR0NY(서포터): Kiriko → Baptiste
    OPENER(서포터): Lúcio

■ 06/12  O2 Blast vs ZETA
· New Junk City
  [O2 Blast]
    Perr(딜러): Sojourn
    WuTian(딜러): Reaper → Anran → Symmetra
    SeungAn(탱커): Mauga
    Misin(서포터): Kiriko
    Faith(서포터): Lúcio → Juno
  [ZETA]
    Knife(딜러): Symmetra → Reaper
    Proper(딜러): Vendetta → Sojourn
    Bernar(탱커): Mauga
    Viol2t(서포터): Lúcio
    shu(서포터): Kiriko
· Oasis
  [O2 Blast]
    Perr(딜러): Cassidy
    WuTian(딜러): Tracer → Symmetra
    SeungAn(탱커): Sigma → Doomfist
    Misin(서포터): Kiriko → Juno
    Faith(서포터): Mizuki
  [ZETA]
    Knife(딜러): Sojourn → Tracer → Genji
    Proper(딜러): Pharah → Symmetra
    Bernar(탱커): Sigma
    Viol2t(서포터): Kiriko → Juno
    shu(서포터): Mizuki
· Runasapi
  [O2 Blast]
    Perr(딜러): Sojourn
    WuTian(딜러): Reaper → Tracer
    Fate(탱커): Mauga → Ramattra
    Misin(서포터): Kiriko → Juno
    Faith(서포터): Lúcio
  [ZETA]
    Knife(딜러): Sojourn
    Proper(딜러): Pharah → Bastion
    Bernar(탱커): Mauga
    Viol2t(서포터): Lúcio
    shu(서포터): Kiriko

■ 06/13  POKER FACE vs Team Falcons
· Ilios
  [POKER FACE]
    K4ne(딜러): Bastion
    D0D0(딜러): Reaper → Tracer → Symmetra
    Fearful(탱커): Wrecking Ball → Mauga
    CARU(서포터): Kiriko
    Sp1nel(서포터): Jetpack Cat
  [Team Falcons]
    Mer1t(딜러): Bastion
    SP1NT(딜러): Reaper → Symmetra
    Hanbin(탱커): Mauga
    Fielder(서포터): Kiriko
    ChiYo(서포터): Jetpack Cat
· Runasapi
  [POKER FACE]
    K4ne(딜러): Sojourn
    D0D0(딜러): Genji → Anran
    Fearful(탱커): Hazard
    CARU(서포터): Juno
    Sp1nel(서포터): Brigitte
  [Team Falcons]
    Mer1t(딜러): Sojourn → Cassidy
    SP1NT(딜러): Genji
    Hanbin(탱커): Junker Queen
    Fielder(서포터): Mizuki
    ChiYo(서포터): Juno
· Suravasa
  [POKER FACE]
    K4ne(딜러): Sojourn
    D0D0(딜러): Genji → Symmetra
    Fearful(탱커): Hazard
    CARU(서포터): Kiriko
    Sp1nel(서포터): Lúcio
  [Team Falcons]
    Mer1t(딜러): Cassidy → Sojourn
    SP1NT(딜러): Anran → Symmetra
    Hanbin(탱커): Mauga
    Fielder(서포터): Mizuki
    ChiYo(서포터): Juno

■ 06/13  SuperBad vs ZETA
· Antarctic Peninsula
  [SuperBad]
    SORI(딜러): Bastion → Cassidy → Sojourn
    Soae(딜러): Symmetra → Mei
    homerunball(탱커): Sigma → D.Va
    Dumbbell(서포터): Kiriko
    Univ2r(서포터): Mizuki → Jetpack Cat
  [ZETA]
    Knife(딜러): Bastion
    Proper(딜러): Pharah → Symmetra
    Bernar(탱커): Sigma
    Viol2t(서포터): Jetpack Cat
    shu(서포터): Kiriko → Juno → Lúcio
· King's Row
  [SuperBad]
    SORI(딜러): Cassidy → Sojourn → Tracer
    Soae(딜러): Pharah → Mei → Torbjörn
    homerunball(탱커): Sigma → D.Va → Doomfist
    Dumbbell(서포터): Mizuki → Kiriko → Lúcio
    Univ2r(서포터): Kiriko → Mizuki → Juno
  [ZETA]
    Knife(딜러): Cassidy → Sojourn → Tracer
    Proper(딜러): Pharah → Mei
    Bernar(탱커): Sigma → D.Va → Doomfist
    Viol2t(서포터): Wuyang → Lifeweaver → Juno
    shu(서포터): Ana
· New Junk City
  [SuperBad]
    SORI(딜러): Sojourn
    Soae(딜러): Reaper → Symmetra
    homerunball(탱커): Mauga → Ramattra
    Dumbbell(서포터): Lúcio
    Univ2r(서포터): Kiriko
  [ZETA]
    Knife(딜러): Sojourn
    Proper(딜러): Anran
    Bernar(탱커): Mauga
    Viol2t(서포터): Lúcio
    shu(서포터): Kiriko

■ 06/13  T1 vs O2 Blast
· Circuit Royal
  [T1]
    Proud(딜러): Sojourn → Widowmaker
    Zest(딜러): Pharah
    Jasm1ne(탱커): Sigma → Reinhardt
    Bliss(서포터): Juno → Jetpack Cat
    Skewed(서포터): Illari → Juno
  [O2 Blast]
    Perr(딜러): Bastion → Hanzo
    WuTian(딜러): Pharah → Mei → Widowmaker
    SeungAn(탱커): Sigma → Doomfist
    Misin(서포터): Ana → Kiriko → Jetpack Cat
    Faith(서포터): Jetpack Cat → Baptiste → Lifeweaver
· Ilios
  [T1]
    Proud(딜러): Widowmaker
    Zest(딜러): Tracer → Symmetra
    DONGHAK(탱커): Wrecking Ball
    Bliss(서포터): Jetpack Cat
    Skewed(서포터): Kiriko → Juno
  [O2 Blast]
    Perr(딜러): Cassidy → Sojourn → Widowmaker
    WuTian(딜러): Tracer → Reaper → Symmetra
    Fate(탱커): Wrecking Ball → Mauga
    Misin(서포터): Kiriko → Juno
    Faith(서포터): Jetpack Cat → Lúcio
· King's Row
  [T1]
    Proud(딜러): Freja → Sojourn → Cassidy
    Zest(딜러): Pharah → Tracer
    Jasm1ne(탱커): Sigma → D.Va
    Bliss(서포터): Wuyang → Mizuki → Lúcio
    Skewed(서포터): Kiriko
  [O2 Blast]
    Perr(딜러): Cassidy → Hanzo
    WuTian(딜러): Mei → Pharah → Tracer
    SeungAn(탱커): Sigma
    Misin(서포터): Kiriko
    Faith(서포터): Baptiste → Wuyang → Mizuki

■ 06/14  Crazy Raccoon vs CHEESEBURGER
· Oasis
  [Crazy Raccoon]
    Stalk3r(딜러): Symmetra → Sojourn → Sombra
    LIP(딜러): Anran → Cassidy
    MAX(탱커): Mauga → Sigma
    CH0R0NG(서포터): Lúcio → Mizuki
    vigilante(서포터): Kiriko → Juno
  [CHEESEBURGER]
    Argon(딜러): Symmetra
    M1nut2(딜러): Sojourn
    Gur3um(탱커): Sigma → D.Va
    WoochaN(서포터): Kiriko → Juno
    TenTen(서포터): Mizuki
· Runasapi
  [Crazy Raccoon]
    Stalk3r(딜러): Symmetra → Sombra → Mei
    LIP(딜러): Cassidy → Anran → Mei
    MAX(탱커): D.Va → Mauga
    CH0R0NG(서포터): Lúcio
    vigilante(서포터): Kiriko → Juno
  [CHEESEBURGER]
    Argon(딜러): Reaper → Symmetra
    M1nut2(딜러): Bastion
    Gur3um(탱커): Sigma → Ramattra
    WoochaN(서포터): Kiriko → Juno
    TenTen(서포터): Jetpack Cat
· Suravasa
  [Crazy Raccoon]
    Stalk3r(딜러): Anran → Symmetra
    LIP(딜러): Bastion
    MAX(탱커): D.Va → Mauga
    CH0R0NG(서포터): Jetpack Cat → Lúcio
    vigilante(서포터): Kiriko
  [CHEESEBURGER]
    Argon(딜러): Anran → Symmetra
    M1nut2(딜러): Bastion
    FARMER(탱커): Mauga
    WoochaN(서포터): Kiriko → Juno
    TenTen(서포터): Jetpack Cat

■ 06/14  Team Falcons vs T1
· Antarctic Peninsula
  [Team Falcons]
    Mer1t(딜러): Bastion → Tracer
    Checkmate(딜러): Symmetra
    SOMEONE(탱커): Sigma
    Fielder(서포터): Kiriko → Juno
    ChiYo(서포터): Mizuki
  [T1]
    Proud(딜러): Sojourn
    Zest(딜러): Anran
    DONGHAK(탱커): Mauga → Doomfist
    Bliss(서포터): Lúcio
    Skewed(서포터): Kiriko → Juno
· Hollywood
  [Team Falcons]
    Mer1t(딜러): Bastion → Tracer → Widowmaker
    Checkmate(딜러): Symmetra → Tracer → Echo
    SOMEONE(탱커): Sigma → D.Va
    Fielder(서포터): Kiriko
    ChiYo(서포터): Mizuki → Jetpack Cat → Juno
  [T1]
    Proud(딜러): Sojourn → Bastion → Widowmaker
    Zest(딜러): Vendetta → Tracer
    DONGHAK(탱커): Doomfist → D.Va → Hazard
    Bliss(서포터): Lúcio → Jetpack Cat
    Skewed(서포터): Kiriko → Juno
· New Junk City
  [Team Falcons]
    Mer1t(딜러): Sojourn
    SP1NT(딜러): Anran → Reaper
    Hanbin(탱커): Mauga
    Fielder(서포터): Kiriko
    ChiYo(서포터): Lúcio
  [T1]
    Proud(딜러): Sojourn
    Zest(딜러): Anran
    DONGHAK(탱커): Mauga
    Bliss(서포터): Lúcio
    Skewed(서포터): Kiriko → Juno
· Rialto
  [Team Falcons]
    Mer1t(딜러): Bastion
    SP1NT(딜러): Reaper → Pharah
    Hanbin(탱커): Mauga
    Fielder(서포터): Kiriko
    ChiYo(서포터): Jetpack Cat
  [T1]
    Proud(딜러): Bastion → Cassidy
    Zest(딜러): Reaper → Symmetra
    DONGHAK(탱커): Mauga → Sigma → Wrecking Ball
    Bliss(서포터): Jetpack Cat → Mizuki
    Skewed(서포터): Kiriko → Juno
· Runasapi
  [Team Falcons]
    Mer1t(딜러): Sojourn
    SP1NT(딜러): Tracer → Pharah
    Hanbin(탱커): D.Va → Mauga
    Fielder(서포터): Kiriko → Brigitte
    ChiYo(서포터): Juno
  [T1]
    Proud(딜러): Sojourn
    Zest(딜러): Tracer → Pharah → Symmetra
    DONGHAK(탱커): Mauga → D.Va → Winston
    Bliss(서포터): Juno
    Skewed(서포터): Kiriko → Brigitte

■ 06/14  ZANSIDE vs POKER FACE
· Oasis
  [ZANSIDE]
    Becky(딜러): Pharah → Symmetra
    Kilo(딜러): Sojourn
    Void(탱커): Sigma
    iR0NY(서포터): Kiriko
    OPENER(서포터): Mizuki
  [POKER FACE]
    K4ne(딜러): Sojourn
    D0D0(딜러): Echo → Anran → Symmetra
    Fearful(탱커): Hazard
    CARU(서포터): Kiriko
    Sp1nel(서포터): Lúcio
· Runasapi
  [ZANSIDE]
    Becky(딜러): Echo → Tracer
    Kilo(딜러): Sojourn
    Void(탱커): Sigma
    iR0NY(서포터): Kiriko
    OPENER(서포터): Mizuki
  [POKER FACE]
    K4ne(딜러): Sojourn
    D0D0(딜러): Mei → Echo
    Fearful(탱커): Ramattra
    CARU(서포터): Juno
    Sp1nel(서포터): Kiriko
· Suravasa
  [ZANSIDE]
    Becky(딜러): Pharah → Symmetra
    Kilo(딜러): Sojourn
    Void(탱커): Ramattra → Sigma
    iR0NY(서포터): Kiriko
    OPENER(서포터): Lúcio → Mizuki
  [POKER FACE]
    K4ne(딜러): Sojourn
    D0D0(딜러): Genji → Symmetra
    Fearful(탱커): Ramattra
    CARU(서포터): Kiriko
    Sp1nel(서포터): Lúcio

■ 06/19  T1 vs Crazy Raccoon
· Circuit Royal
  [T1]
    Proud(딜러): Sojourn → Freja → Mei
    Zest(딜러): Symmetra → Venture
    Jasm1ne(탱커): Sigma → Ramattra → D.Va
    Bliss(서포터): Mizuki → Lúcio
    Skewed(서포터): Juno → Kiriko
  [Crazy Raccoon]
    HeeSang(딜러): Mei
    Stalk3r(딜러): Sombra → Bastion → Symmetra
    MAX(탱커): Sigma
    CH0R0NG(서포터): Mizuki
    vigilante(서포터): Kiriko → Juno → Jetpack Cat
· Ilios
  [T1]
    Proud(딜러): Cassidy
    Zest(딜러): Symmetra → Bastion
    DONGHAK(탱커): D.Va
    Bliss(서포터): Lúcio → Jetpack Cat
    Skewed(서포터): Kiriko → Juno
  [Crazy Raccoon]
    HeeSang(딜러): Pharah → Shion → Symmetra
    Stalk3r(딜러): Bastion
    JunBin(탱커): Mauga → Roadhog
    CH0R0NG(서포터): Jetpack Cat
    vigilante(서포터): Kiriko
· King's Row
  [T1]
    Proud(딜러): Shion → Sojourn
    Zest(딜러): Vendetta → Symmetra
    Jasm1ne(탱커): Zarya → Sigma
    Bliss(서포터): Lúcio → Mizuki → Jetpack Cat
    Skewed(서포터): Kiriko → Juno
  [Crazy Raccoon]
    HeeSang(딜러): Symmetra
    Stalk3r(딜러): Shion → Widowmaker
    MAX(탱커): Sigma → Reinhardt
    CH0R0NG(서포터): Lúcio → Mizuki
    vigilante(서포터): Kiriko → Baptiste
· New Junk City
  [T1]
    Proud(딜러): Shion
    Zest(딜러): Vendetta
    DONGHAK(탱커): Mauga
    Bliss(서포터): Lúcio
    Skewed(서포터): Kiriko → Juno
  [Crazy Raccoon]
    HeeSang(딜러): Reaper → Symmetra
    Stalk3r(딜러): Shion
    MAX(탱커): Zarya
    CH0R0NG(서포터): Lúcio → Jetpack Cat
    vigilante(서포터): Kiriko

■ 06/19  Team Falcons vs O2 Blast
· Circuit Royal
  [Team Falcons]
    Mer1t(딜러): Sojourn → Shion → Widowmaker
    Checkmate(딜러): Symmetra
    SOMEONE(탱커): Reinhardt
    Fielder(서포터): Kiriko
    ChiYo(서포터): Juno
  [O2 Blast]
    Perr(딜러): Sojourn → Mei → Widowmaker
    WuTian(딜러): Pharah → Mei
    SeungAn(탱커): Sigma → D.Va
    Misin(서포터): Kiriko → Illari → Brigitte
    Faith(서포터): Juno → Wuyang → Baptiste
· Ilios
  [Team Falcons]
    Mer1t(딜러): Sojourn → Cassidy
    SP1NT(딜러): Shion → Symmetra
    Hanbin(탱커): D.Va
    Fielder(서포터): Mizuki
    ChiYo(서포터): Juno
  [O2 Blast]
    Perr(딜러): Sojourn → Shion
    WuTian(딜러): Tracer → Symmetra
    Fate(탱커): Sigma → Wrecking Ball → D.Va
    Misin(서포터): Kiriko → Ana
    Faith(서포터): Mizuki → Lúcio
· Numbani
  [Team Falcons]
    Mer1t(딜러): Bastion → Sojourn → Symmetra
    SP1NT(딜러): Shion
    Hanbin(탱커): Mauga → Doomfist → D.Va
    Fielder(서포터): Mizuki → Kiriko
    ChiYo(서포터): Juno → Lúcio
  [O2 Blast]
    Perr(딜러): Bastion → Symmetra
    WuTian(딜러): Reaper → Torbjörn → Tracer
    SeungAn(탱커): Mauga → Ramattra → Doomfist
    Misin(서포터): Kiriko → Lifeweaver
    Faith(서포터): Jetpack Cat → Juno → Lúcio

■ 06/19  ZANSIDE vs CHEESEBURGER
· Circuit Royal
  [ZANSIDE]
    Becky(딜러): Pharah → Shion → Vendetta
    Kilo(딜러): Bastion → Sojourn → Freja
    Void(탱커): Sigma → D.Va
    iR0NY(서포터): Kiriko
    OPENER(서포터): Jetpack Cat → Wuyang → Mizuki
  [CHEESEBURGER]
    Argon(딜러): Mei → Vendetta
    M1nut2(딜러): Bastion → Sojourn → Shion
    Gur3um(탱커): Sigma → D.Va → Mauga
    WoochaN(서포터): Kiriko
    TenTen(서포터): Jetpack Cat → Wuyang → Mizuki
· Hollywood
  [ZANSIDE]
    Becky(딜러): Vendetta → Mei → Tracer
    Kilo(딜러): Cassidy → Sojourn
    HEISER(탱커): Hazard → D.Va
    iR0NY(서포터): Kiriko
    OPENER(서포터): Lúcio
  [CHEESEBURGER]
    Argon(딜러): Reaper → Mei → Symmetra
    M1nut2(딜러): Bastion → Sojourn → Symmetra
    Gur3um(탱커): Sigma → Ramattra
    WoochaN(서포터): Kiriko
    TenTen(서포터): Jetpack Cat → Mizuki
· Ilios
  [ZANSIDE]
    Becky(딜러): Shion → Pharah → Symmetra
    Kilo(딜러): Cassidy → Bastion
    HEISER(탱커): Wrecking Ball
    iR0NY(서포터): Ana → Kiriko
    OPENER(서포터): Jetpack Cat
  [CHEESEBURGER]
    Argon(딜러): Shion → Symmetra
    M1nut2(딜러): Cassidy → Bastion → Tracer
    FARMER(탱커): Roadhog → Wrecking Ball
    WoochaN(서포터): Kiriko → Juno
    TenTen(서포터): Jetpack Cat → Mizuki
· Runasapi
  [ZANSIDE]
    Becky(딜러): Vendetta
    Kilo(딜러): Sojourn
    HEISER(탱커): Mauga
    iR0NY(서포터): Kiriko
    OPENER(서포터): Lúcio
  [CHEESEBURGER]
    Argon(딜러): Vendetta
    M1nut2(딜러): Shion
    Gur3um(탱커): Mauga
    WoochaN(서포터): Kiriko
    TenTen(서포터): Lúcio

■ 06/20  CHEESEBURGER vs T1
· Oasis
  [CHEESEBURGER]
    Argon(딜러): Mei → Reaper → Vendetta
    M1nut2(딜러): Bastion → Sojourn → Shion
    Gur3um(탱커): Sigma → Hazard → D.Va
    WoochaN(서포터): Kiriko → Juno
    TenTen(서포터): Jetpack Cat → Mizuki → Lúcio
  [T1]
    Proud(딜러): Cassidy
    Zest(딜러): Symmetra
    Jasm1ne(탱커): Sigma
    Bliss(서포터): Mizuki
    Skewed(서포터): Kiriko → Juno
· Rialto
  [CHEESEBURGER]
    Argon(딜러): Shion → Pharah → Tracer
    M1nut2(딜러): Sojourn → Widowmaker → Cassidy
    Gur3um(탱커): D.Va → Sigma
    WoochaN(서포터): Kiriko
    TenTen(서포터): Wuyang
  [T1]
    Proud(딜러): Widowmaker
    Zest(딜러): Pharah
    Jasm1ne(탱커): Sigma
    Bliss(서포터): Wuyang → Mizuki
    Skewed(서포터): Kiriko → Juno
· Suravasa
  [CHEESEBURGER]
    Argon(딜러): Tracer → Reaper → Symmetra
    M1nut2(딜러): Bastion
    FARMER(탱커): Wrecking Ball → Mauga
    WoochaN(서포터): Ana
    TenTen(서포터): Jetpack Cat
  [T1]
    Proud(딜러): Bastion
    Zest(딜러): Tracer → Symmetra
    DONGHAK(탱커): Wrecking Ball
    Bliss(서포터): Jetpack Cat
    Skewed(서포터): Ana

■ 06/20  POKER FACE vs SuperBad
· Antarctic Peninsula
  [POKER FACE]
    K4ne(딜러): Sojourn → Tracer
    D0D0(딜러): Shion → Vendetta → Tracer
    Fearful(탱커): Mauga → Doomfist
    CARU(서포터): Kiriko
    Sp1nel(서포터): Lúcio
  [SuperBad]
    SORI(딜러): Sojourn → Shion → Symmetra
    AZENT(딜러): Mei → Shion → Tracer
    SENTIER(탱커): Sigma
    Soae(서포터): Mizuki → Lúcio
    Univ2r(서포터): Kiriko → Juno
· Circuit Royal
  [POKER FACE]
    K4ne(딜러): Sojourn → Venture
    D0D0(딜러): Shion → Mei → Venture
    Fearful(탱커): Ramattra → Sigma
    CARU(서포터): Kiriko
    Sp1nel(서포터): Mizuki → Lúcio
  [SuperBad]
    SORI(딜러): Sojourn → Widowmaker
    AZENT(딜러): Mei
    homerunball(탱커): Sigma
    Soae(서포터): Moira
    Univ2r(서포터): Kiriko
· Hollywood
  [POKER FACE]
    K4ne(딜러): Cassidy → Tracer → Shion
    D0D0(딜러): Symmetra → Shion
    Fearful(탱커): Ramattra
    CARU(서포터): Kiriko
    Sp1nel(서포터): Lúcio → Mizuki
  [SuperBad]
    SORI(딜러): Cassidy → Widowmaker
    AZENT(딜러): Pharah → Hanzo
    SENTIER(탱커): Ramattra
    Soae(서포터): Mizuki → Mercy
    Univ2r(서포터): Kiriko
· New Junk City
  [POKER FACE]
    K4ne(딜러): Sojourn
    D0D0(딜러): Vendetta → Symmetra
    Fearful(탱커): Mauga
    CARU(서포터): Juno
    Sp1nel(서포터): Kiriko
  [SuperBad]
    SORI(딜러): Sojourn → Shion
    AZENT(딜러): Shion → Tracer → Reaper
    homerunball(탱커): Sigma → D.Va
    Soae(서포터): Mizuki
    Univ2r(서포터): Kiriko
· Runasapi
  [POKER FACE]
    K4ne(딜러): Sojourn
    D0D0(딜러): Shion → Vendetta → Venture
    Fearful(탱커): Doomfist
    CARU(서포터): Kiriko → Juno
    Sp1nel(서포터): Lúcio → Kiriko
  [SuperBad]
    SORI(딜러): Sojourn → Shion
    AZENT(딜러): Tracer → Pharah
    SENTIER(탱커): Sigma → Wrecking Ball
    Soae(서포터): Mizuki
    Univ2r(서포터): Kiriko

■ 06/20  ZETA vs ZANSIDE
· Dorado
  [ZETA]
    Knife(딜러): Bastion → Mei → Genji
    Proper(딜러): Shion → Tracer → Widowmaker
    Mealgaru(탱커): Wrecking Ball
    Viol2t(서포터): Jetpack Cat → Illari
    shu(서포터): Ana
  [ZANSIDE]
    Becky(딜러): Tracer → Reaper → Bastion
    Probe(딜러): Cassidy → Shion → Bastion
    HEISER(탱커): D.Va → Wrecking Ball → Doomfist
    iR0NY(서포터): Ana → Moira → Juno
    OPENER(서포터): Jetpack Cat → Lúcio → Mizuki
· Ilios
  [ZETA]
    Knife(딜러): Reaper → Freja
    Proper(딜러): Shion → Symmetra
    Mealgaru(탱커): Wrecking Ball → Mauga
    Viol2t(서포터): Lúcio
    shu(서포터): Kiriko → Juno
  [ZANSIDE]
    Becky(딜러): Reaper → Vendetta
    Probe(딜러): Shion
    HEISER(탱커): Mauga
    iR0NY(서포터): Kiriko → Juno
    OPENER(서포터): Lúcio
· King's Row
  [ZETA]
    Knife(딜러): Mei → Symmetra → Bastion
    Proper(딜러): Shion → Pharah → Bastion
    Bernar(탱커): Sigma → Ramattra → Winston
    Viol2t(서포터): Baptiste → Illari → Lúcio
    shu(서포터): Kiriko → Mizuki → Lúcio
  [ZANSIDE]
    Becky(딜러): Symmetra → Echo → Vendetta
    Probe(딜러): Shion → Cassidy
    HEISER(탱커): Reinhardt → D.Va → Ramattra
    iR0NY(서포터): Kiriko → Baptiste
    OPENER(서포터): Lúcio
· New Junk City
  [ZETA]
    Knife(딜러): Reaper
    Proper(딜러): Shion
    Bernar(탱커): Mauga → Hazard
    Viol2t(서포터): Lúcio
    shu(서포터): Kiriko
  [ZANSIDE]
    Becky(딜러): Reaper → Symmetra
    Probe(딜러): Shion
    HEISER(탱커): Mauga
    iR0NY(서포터): Kiriko
    OPENER(서포터): Lúcio
· Runasapi
  [ZETA]
    Knife(딜러): Reaper
    Proper(딜러): Shion
    Bernar(탱커): Mauga
    Viol2t(서포터): Lúcio
    shu(서포터): Kiriko
  [ZANSIDE]
    Becky(딜러): Reaper
    Probe(딜러): Shion
    HEISER(탱커): Mauga
    iR0NY(서포터): Kiriko
    OPENER(서포터): Lúcio

■ 06/21  O2 Blast vs Crazy Raccoon
· Circuit Royal
  [O2 Blast]
    Perr(딜러): Cassidy → Sojourn → Widowmaker
    WuTian(딜러): Mei → Freja → Hanzo
    SeungAn(탱커): Ramattra → Sigma → Mauga
    Misin(서포터): Baptiste → Kiriko → Juno
    Faith(서포터): Wuyang → Lúcio → Juno
  [Crazy Raccoon]
    HeeSang(딜러): Mei → Pharah
    LIP(딜러): Bastion → Freja
    MAX(탱커): Sigma
    CH0R0NG(서포터): Jetpack Cat → Illari
    vigilante(서포터): Kiriko → Baptiste
· New Junk City
  [O2 Blast]
    Perr(딜러): Shion
    WuTian(딜러): Reaper → Symmetra
    SeungAn(탱커): Mauga
    Misin(서포터): Kiriko
    Faith(서포터): Lúcio
  [Crazy Raccoon]
    HeeSang(딜러): Reaper → Symmetra
    LIP(딜러): Sojourn
    MAX(탱커): Mauga
    CH0R0NG(서포터): Lúcio
    vigilante(서포터): Kiriko
· New Queen Street
  [O2 Blast]
    Perr(딜러): Sojourn
    WuTian(딜러): Shion
    Fate(탱커): Mauga
    Misin(서포터): Juno → Kiriko
    Faith(서포터): Brigitte
  [Crazy Raccoon]
    HeeSang(딜러): Bastion
    LIP(딜러): Cassidy
    MAX(탱커): D.Va
    CH0R0NG(서포터): Jetpack Cat
    vigilante(서포터): Kiriko → Juno
· Oasis
  [O2 Blast]
    Perr(딜러): Shion
    WuTian(딜러): Reaper → Symmetra → Tracer
    SeungAn(탱커): Mauga
    Misin(서포터): Kiriko
    Faith(서포터): Lúcio
  [Crazy Raccoon]
    HeeSang(딜러): Reaper → Pharah → Symmetra
    LIP(딜러): Shion → Tracer
    MAX(탱커): Mauga → Sigma → Reinhardt
    CH0R0NG(서포터): Lúcio → Mizuki
    vigilante(서포터): Kiriko → Juno → Moira

■ 06/21  Team Falcons vs SuperBad
· Hollywood
  [Team Falcons]
    Mer1t(딜러): Sojourn → Mei
    Checkmate(딜러): Symmetra → Reaper → Shion
    SOMEONE(탱커): Ramattra
    Fielder(서포터): Kiriko
    ChiYo(서포터): Juno
  [SuperBad]
    SORI(딜러): Sojourn → Widowmaker
    AZENT(딜러): Mei → Reaper → Pharah
    SENTIER(탱커): Ramattra → Reinhardt
    Soae(서포터): Kiriko
    Univ2r(서포터): Wuyang
· New Junk City
  [Team Falcons]
    Mer1t(딜러): Sojourn → Shion
    Checkmate(딜러): Mei
    SOMEONE(탱커): Reinhardt
    Fielder(서포터): Kiriko → Juno
    ChiYo(서포터): Juno → Lúcio
  [SuperBad]
    SORI(딜러): Sojourn
    AZENT(딜러): Vendetta → Tracer
    homerunball(탱커): Mauga → D.Va
    Dumbbell(서포터): Lúcio
    Univ2r(서포터): Kiriko → Juno
· Oasis
  [Team Falcons]
    Mer1t(딜러): Bastion
    SP1NT(딜러): Tracer → Pharah → Symmetra
    Hanbin(탱커): D.Va
    Fielder(서포터): Kiriko → Juno → Lifeweaver
    ChiYo(서포터): Jetpack Cat
  [SuperBad]
    SORI(딜러): Cassidy → Mei
    AZENT(딜러): Tracer → Pharah → Symmetra
    SENTIER(탱커): Sigma → D.Va
    Soae(서포터): Mizuki → Lúcio
    Univ2r(서포터): Kiriko

■ 06/21  ZETA vs POKER FACE
· Ilios
  [ZETA]
    Knife(딜러): Cassidy
    Proper(딜러): Shion → Symmetra
    Mealgaru(탱커): Mauga → Wrecking Ball
    Viol2t(서포터): Jetpack Cat
    shu(서포터): Kiriko → Juno
  [POKER FACE]
    K4ne(딜러): Shion
    D0D0(딜러): Reaper → Genji → Tracer
    Fearful(탱커): Mauga → Wrecking Ball
    CARU(서포터): Kiriko
    Sp1nel(서포터): Lúcio
· New Junk City
  [ZETA]
    Knife(딜러): Reaper
    Proper(딜러): Shion
    Bernar(탱커): Hazard
    Viol2t(서포터): Lúcio
    shu(서포터): Kiriko
  [POKER FACE]
    K4ne(딜러): Sojourn
    D0D0(딜러): Reaper → Genji → Anran
    Fearful(탱커): Hazard → Mauga
    CARU(서포터): Kiriko
    Sp1nel(서포터): Lúcio
· Runasapi
  [ZETA]
    Knife(딜러): Reaper
    Proper(딜러): Shion
    Bernar(탱커): Hazard
    Viol2t(서포터): Lúcio
    shu(서포터): Kiriko
  [POKER FACE]
    K4ne(딜러): Sojourn → Tracer
    D0D0(딜러): Vendetta → Venture
    HYEON(탱커): Mauga → Doomfist
    CARU(서포터): Kiriko
    Sp1nel(서포터): Lúcio
`;

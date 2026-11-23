/**
 * Training Recommendations — library of development topics.
 *
 * Each topic asks one question that changes the diagnosis (e.g. which kind of pass fails),
 * because the right attributes differ: through balls lean on Vision, lofted balls on Long Passing,
 * outside-the-box goals on Long Shots — never "Finishing for everything".
 *
 * Goals are measurable when the game gives us the metric (`metric`), otherwise they are marked as
 * self-assessed (no metric) and never auto-evaluated.
 */
import type { AttrKey, PlaystyleKey } from "./game-data";

export type GoalTemplate = { text: string; metric?: string; direction?: "up" | "down"; /** p.p. for % metrics, relative (0.15 = +15%) for rates */ delta?: number };
export type TopicVariant = {
  label: string;
  explanation: string;
  primary: AttrKey[];
  complementary: AttrKey[];
  playstyles: PlaystyleKey[];
  tips: string[];
  goals: GoalTemplate[];
};
export type Topic = {
  key: TopicKey;
  label: string;
  short: string;
  icon: "pass" | "long" | "assist" | "target" | "goal" | "rocket" | "dribble" | "speed" | "shield" | "def" | "pos" | "gk";
  metrics: string[];
  question: string;
  variants: Record<string, TopicVariant>;
};

export const TOPIC_KEYS = ["passes", "longPasses", "assists", "finishing", "goals", "longShots", "dribbling", "pace", "ballLoss", "defending", "positioning", "goalkeeping"] as const;
export type TopicKey = (typeof TOPIC_KEYS)[number];

const passGoal: GoalTemplate = { text: "Subir a precisão de passes em 3 pontos nas próximas 5 partidas", metric: "passAccuracy", direction: "up", delta: 3 };

export const TOPICS: Record<TopicKey, Topic> = {
  passes: {
    key: "passes", label: "Quero acertar mais passes", short: "Passes", icon: "pass", metrics: ["passAccuracy", "passesAttempted"],
    question: "Qual passe você mais erra?",
    variants: {
      short: {
        label: "Passe curto / tabela",
        explanation: "Erros em passes curtos costumam vir de passar sob pressão, com o corpo mal posicionado ou sem olhar a linha de passe antes de receber.",
        primary: ["shortPassing", "vision"], complementary: ["ballControl", "composure", "reactions"],
        playstyles: ["tikiTaka", "pingedPass", "firstTouch", "pressProven"],
        tips: ["Olhe a opção de passe antes de a bola chegar (gire a câmera mentalmente).", "Prefira o passe para o pé do companheiro mais próximo quando estiver pressionado.", "Evite passes contra o corpo do jogador — gire antes de soltar.", "Use o passe de primeira só quando a linha estiver limpa."],
        goals: [passGoal, { text: "Errar no máximo 2 passes curtos por jogo (autoavaliação no replay)" }],
      },
      through: {
        label: "Passe em profundidade (rasteiro)",
        explanation: "Passes em profundidade erram por tempo (soltar cedo/tarde), força excessiva ou leitura errada da corrida. Visão de jogo pesa mais do que Passe curto aqui.",
        primary: ["vision", "shortPassing"], complementary: ["curve", "composure", "reactions"],
        playstyles: ["incisivePass", "pingedPass"],
        tips: ["Espere o atacante iniciar a corrida antes de soltar.", "Dose a força: um toque curto na barra quase sempre basta no rasteiro.", "Mire no espaço à frente do corredor, não nele.", "Combine com um companheiro para sinalizar a infiltração."],
        goals: [passGoal, { text: "Criar pelo menos 1 chance clara por jogo com passe em profundidade (autoavaliação)" }, { text: "Aumentar assistências por jogo em 15% nas próximas 10 partidas", metric: "assists", direction: "up", delta: 0.15 }],
      },
      lofted: {
        label: "Passe elevado / por cima",
        explanation: "Passes por cima dependem de Passe longo e Curva; em distâncias curtas, Visão ajuda a encontrar o alvo certo.",
        primary: ["longPassing", "vision"], complementary: ["curve", "shotPower"],
        playstyles: ["longBallPass", "incisivePass"],
        tips: ["Use o passe elevado só quando a linha rasteira estiver fechada.", "Prefira alvos parados ou correndo em direção à bola.", "Evite elevar contra defensores altos e posicionados."],
        goals: [passGoal],
      },
      pressure: {
        label: "Sob pressão / perdendo a bola no passe",
        explanation: "Quando o erro acontece com marcador colado, o problema é tomada de decisão e proteção, não o passe em si.",
        primary: ["composure", "shortPassing"], complementary: ["ballControl", "strength", "reactions", "agility"],
        playstyles: ["pressProven", "firstTouch", "tikiTaka"],
        tips: ["Proteja a bola com o corpo antes de passar.", "Tenha sempre uma opção de apoio por trás (passe de segurança).", "Passe de primeira para quebrar a pressão quando a linha existir."],
        goals: [passGoal, { text: "Usar o passe de segurança sempre que pressionado por 2+ jogadores (autoavaliação)" }],
      },
    },
  },
  longPasses: {
    key: "longPasses", label: "Quero melhorar meus lançamentos", short: "Lançamentos", icon: "long", metrics: ["passAccuracy"],
    question: "Que tipo de lançamento?",
    variants: {
      switch: {
        label: "Inversão de jogo",
        explanation: "Inversões dependem de Passe longo e Curva para a bola chegar rápida e sem desvio ao lado oposto.",
        primary: ["longPassing", "curve"], complementary: ["vision", "shotPower"],
        playstyles: ["longBallPass", "whippedPass"],
        tips: ["Inverta quando o lado oposto estiver livre de verdade — olhe antes.", "Prefira o lançamento tenso (mais rápido) ao alto.", "O receptor deve estar parado ou indo em direção à bola."],
        goals: [passGoal, { text: "Fazer 2 inversões certas por jogo (autoavaliação)" }],
      },
      behind: {
        label: "Bola nas costas da defesa",
        explanation: "A bola longa nas costas exige Visão (escolher o momento) e Passe longo (precisão na distância).",
        primary: ["vision", "longPassing"], complementary: ["curve", "composure"],
        playstyles: ["longBallPass", "incisivePass"],
        tips: ["Lance quando a defesa estiver adiantada e o atacante em velocidade.", "Mire entre o zagueiro e o goleiro.", "Não force contra defesa recuada — o espaço não existe."],
        goals: [{ text: "Aumentar assistências por jogo em 15% nas próximas 10 partidas", metric: "assists", direction: "up", delta: 0.15 }],
      },
      crosses: {
        label: "Cruzamentos",
        explanation: "Cruzamento é um atributo próprio; Curva melhora a trajetória e o estilo Cruzamento chicote acelera a bola.",
        primary: ["crossing", "curve"], complementary: ["vision", "longPassing"],
        playstyles: ["whippedPass"],
        tips: ["Cruze rasteiro/tenso quando houver atacantes chegando na primeira trave.", "Evite cruzar parado contra defesa posicionada.", "Olhe a área antes de chegar à linha de fundo."],
        goals: [{ text: "Aumentar assistências por jogo em 15% nas próximas 10 partidas", metric: "assists", direction: "up", delta: 0.15 }],
      },
    },
  },
  assists: {
    key: "assists", label: "Quero dar mais assistências", short: "Assistências", icon: "assist", metrics: ["assists", "involvements"],
    question: "De onde você cria mais?",
    variants: {
      center: {
        label: "Pelo meio (meia / segundo atacante)",
        explanation: "Criar pelo meio é sobre ver a infiltração e soltar no tempo certo: Visão, Passe curto e Compostura sob pressão.",
        primary: ["vision", "shortPassing"], complementary: ["composure", "ballControl", "agility"],
        playstyles: ["incisivePass", "tikiTaka", "pressProven"],
        tips: ["Atraia a marcação com condução curta antes de soltar.", "Procure o espaço entre zagueiro e lateral.", "Converse com os pontas para combinarem a infiltração."],
        goals: [{ text: "Aumentar assistências por jogo em 20% nas próximas 10 partidas", metric: "assists", direction: "up", delta: 0.2 }, passGoal],
      },
      wide: {
        label: "Pelos lados (ponta / lateral)",
        explanation: "Pelos lados, as assistências saem de cruzamentos e passes para trás da linha: Cruzamento, Curva e velocidade para chegar ao fundo.",
        primary: ["crossing", "sprintSpeed"], complementary: ["curve", "acceleration", "dribbling"],
        playstyles: ["whippedPass", "rapid"],
        tips: ["Ataque o fundo e passe para trás (cutback) — costuma ser mais eficiente que o cruzamento alto.", "Varie entre cruzar e cortar para dentro."],
        goals: [{ text: "Aumentar assistências por jogo em 20% nas próximas 10 partidas", metric: "assists", direction: "up", delta: 0.2 }],
      },
    },
  },
  finishing: {
    key: "finishing", label: "Quero finalizar melhor", short: "Finalização", icon: "target", metrics: ["conversion", "shots", "shotAccuracy"],
    question: "Que tipo de chance você mais desperdiça?",
    variants: {
      oneOnOne: {
        label: "Cara a cara / dentro da área",
        explanation: "Dentro da área, Finalização e Compostura decidem; Posicionamento ofensivo coloca você no lugar certo.",
        primary: ["finishing", "composure"], complementary: ["attPositioning", "reactions", "ballControl"],
        playstyles: ["finesseShot", "chipShot", "lowDrivenShot"],
        tips: ["No cara a cara, chute colocado no canto oposto ao goleiro.", "Não segure o botão de força dentro da área — finalização curta precisa de precisão.", "Use a cavadinha quando o goleiro sair cedo."],
        goals: [{ text: "Subir a conversão em 5 pontos nas próximas 10 partidas", metric: "conversion", direction: "up", delta: 5 }],
      },
      firstTime: {
        label: "Chute de primeira / voleio",
        explanation: "Finalizações de primeira pedem Voleio e Reação; Posicionamento ofensivo ajuda a chegar no tempo.",
        primary: ["volleys", "reactions"], complementary: ["finishing", "attPositioning", "balance"],
        playstyles: ["acrobatic", "powerShot"],
        tips: ["Ajuste o corpo antes da bola chegar.", "Chute de primeira mirando o chão — rasteiro é mais difícil de defender."],
        goals: [{ text: "Subir a conversão em 5 pontos nas próximas 10 partidas", metric: "conversion", direction: "up", delta: 5 }],
      },
      headers: {
        label: "Cabeceio",
        explanation: "Gols de cabeça dependem de Precisão de cabeceio, Impulsão e Força — não de Finalização.",
        primary: ["headingAccuracy", "jumping"], complementary: ["strength", "attPositioning"],
        playstyles: ["powerHeader", "aerial"],
        tips: ["Ataque a bola em movimento, não parado.", "Cabeceie para baixo, em direção ao chão."],
        goals: [{ text: "Marcar 1 gol de cabeça a cada 5 partidas (autoavaliação)" }],
      },
    },
  },
  goals: {
    key: "goals", label: "Quero marcar mais gols", short: "Gols", icon: "goal", metrics: ["goals", "shots", "conversion"],
    question: "Qual é o seu problema principal?",
    variants: {
      fewChances: {
        label: "Chuto pouco / não recebo a bola",
        explanation: "Se você finaliza pouco, o problema é chegar às chances: movimentação (Posicionamento ofensivo), aceleração e leitura das jogadas.",
        primary: ["attPositioning", "acceleration"], complementary: ["sprintSpeed", "reactions", "finishing"],
        playstyles: ["quickStep", "rapid", "finesseShot"],
        tips: ["Ataque o espaço nas costas do zagueiro, não fique parado entre eles.", "Peça a bola com movimento contrário (vai e volta).", "Esteja dentro da área quando a bola chegar pelos lados."],
        goals: [{ text: "Aumentar finalizações por jogo em 20% nas próximas 10 partidas", metric: "shots", direction: "up", delta: 0.2 }],
      },
      wasteful: {
        label: "Chuto bastante mas não converto",
        explanation: "Muitos chutes e poucos gols apontam para qualidade da finalização ou escolha do chute.",
        primary: ["finishing", "composure"], complementary: ["shotPower", "attPositioning"],
        playstyles: ["finesseShot", "lowDrivenShot", "powerShot"],
        tips: ["Corte chutes de baixa probabilidade (ângulo fechado, muitos defensores à frente).", "Dê um toque a mais para melhorar o ângulo quando houver tempo."],
        goals: [{ text: "Subir a conversão em 5 pontos nas próximas 10 partidas", metric: "conversion", direction: "up", delta: 5 }],
      },
    },
  },
  longShots: {
    key: "longShots", label: "Quero melhorar meus chutes de longe", short: "Chute de longe", icon: "rocket", metrics: ["conversion", "shots"],
    question: "Que chute de fora você usa?",
    variants: {
      finesse: {
        label: "Colocado (curva)",
        explanation: "O chute colocado de fora depende de Chute de longe e Curva; Finalização tem pouco peso nessa distância.",
        primary: ["longShots", "curve"], complementary: ["shotPower", "composure"],
        playstyles: ["finesseShot"],
        tips: ["Abra o ângulo com um toque para o lado do pé bom.", "Mire o ângulo oposto ao goleiro."],
        goals: [{ text: "Marcar 1 gol de fora da área a cada 5 partidas (autoavaliação)" }],
      },
      power: {
        label: "Forte / de chapa",
        explanation: "O chute forte de fora pede Força do chute e Chute de longe; Equilíbrio ajuda a não errar desequilibrado.",
        primary: ["longShots", "shotPower"], complementary: ["balance", "composure"],
        playstyles: ["powerShot", "lowDrivenShot"],
        tips: ["Use quando houver espaço para armar — o chute forte é lento de preparar.", "Evite com marcador colado."],
        goals: [{ text: "Marcar 1 gol de fora da área a cada 5 partidas (autoavaliação)" }],
      },
    },
  },
  dribbling: {
    key: "dribbling", label: "Quero driblar melhor", short: "Drible", icon: "dribble", metrics: [],
    question: "Que drible?",
    variants: {
      tight: {
        label: "Curto / em espaço reduzido",
        explanation: "No drible curto, Agilidade, Equilíbrio e Controle de bola importam mais que velocidade.",
        primary: ["agility", "ballControl"], complementary: ["balance", "dribbling", "reactions"],
        playstyles: ["technical", "firstTouch", "trickster"],
        tips: ["Use a condução fina (botão de drible) perto do marcador.", "Mude de direção quando o defensor se comprometer.", "Proteja a bola de costas antes de girar."],
        goals: [{ text: "Vencer 3 duelos 1×1 por jogo (autoavaliação no replay)" }],
      },
      speed: {
        label: "Em velocidade / arrancada",
        explanation: "Para passar em velocidade, Aceleração, Condução e o estilo Rápido fazem a diferença.",
        primary: ["acceleration", "dribbling"], complementary: ["sprintSpeed", "agility", "ballControl"],
        playstyles: ["rapid", "quickStep", "technical"],
        tips: ["Empurre a bola para o espaço (toque longo) só com campo livre à frente.", "Ataque o lado do pé ruim do defensor."],
        goals: [{ text: "Vencer 3 duelos 1×1 por jogo (autoavaliação no replay)" }],
      },
    },
  },
  pace: {
    key: "pace", label: "Quero ser mais rápido", short: "Velocidade", icon: "speed", metrics: [],
    question: "Em que distância?",
    variants: {
      short: {
        label: "Arrancada curta",
        explanation: "Os primeiros metros dependem de Aceleração (e de altura/peso mais leves na criação do jogador).",
        primary: ["acceleration"], complementary: ["agility", "balance"],
        playstyles: ["quickStep"],
        tips: ["Arranque no momento em que o defensor vira o corpo."],
        goals: [{ text: "Ganhar 2 corridas curtas por jogo contra o marcador (autoavaliação)" }],
      },
      long: {
        label: "Corrida longa",
        explanation: "Em distância, Pique define a velocidade máxima; Fôlego mantém isso ao longo do jogo.",
        primary: ["sprintSpeed"], complementary: ["acceleration", "stamina"],
        playstyles: ["rapid", "relentless"],
        tips: ["Guarde o pique para as transições — correr o jogo todo cansa o jogador."],
        goals: [{ text: "Ganhar 2 corridas em transição por jogo (autoavaliação)" }],
      },
    },
  },
  ballLoss: {
    key: "ballLoss", label: "Quero perder menos bolas", short: "Posse", icon: "shield", metrics: ["passAccuracy"],
    question: "Como você mais perde a bola?",
    variants: {
      tackled: {
        label: "Sendo desarmado na condução",
        explanation: "Perder a bola conduzindo é sobre proteção e equilíbrio: Força, Equilíbrio e Controle de bola.",
        primary: ["strength", "ballControl"], complementary: ["balance", "composure", "agility"],
        playstyles: ["pressProven", "technical"],
        tips: ["Solte a bola antes do segundo marcador chegar.", "Proteja com o corpo entre a bola e o defensor."],
        goals: [{ text: "Perder no máximo 3 bolas conduzindo por jogo (autoavaliação — a EA não publica perdas de posse)" }],
      },
      passing: {
        label: "Errando passes",
        explanation: "Se a perda vem do passe, o foco é escolha e execução do passe.",
        primary: ["shortPassing", "composure"], complementary: ["vision", "reactions"],
        playstyles: ["tikiTaka", "pressProven"],
        tips: ["Prefira o passe seguro quando não houver vantagem clara.", "Reduza passes de risco no próprio campo."],
        goals: [passGoal],
      },
    },
  },
  defending: {
    key: "defending", label: "Quero defender melhor", short: "Defesa", icon: "def", metrics: ["tackles", "tackleSuccess", "interceptions"],
    question: "Onde você tem mais dificuldade?",
    variants: {
      tackling: {
        label: "Desarmes (erro o bote)",
        explanation: "Errar o bote costuma ser timing; Desarme em pé e Noção defensiva ajudam, mas a maior melhora vem de esperar o momento.",
        primary: ["standingTackle", "defAwareness"], complementary: ["reactions", "strength", "slidingTackle"],
        playstyles: ["jockey", "anticipate", "slideTackle"],
        tips: ["Use a contenção e dê o bote quando o atacante tocar a bola longe do pé.", "Não dê carrinho por trás nem com o atacante de frente para o gol."],
        goals: [{ text: "Subir a eficiência dos desarmes em 8 pontos nas próximas 10 partidas", metric: "tackleSuccess", direction: "up", delta: 8 }],
      },
      reading: {
        label: "Leitura de jogo / interceptar",
        explanation: "Interceptar depende de Interceptação e Noção defensiva — você precisa estar na linha do passe antes dele sair.",
        primary: ["interceptions", "defAwareness"], complementary: ["reactions", "acceleration"],
        playstyles: ["intercept", "anticipate", "block"],
        tips: ["Feche a linha de passe em vez de correr para a bola.", "Antecipe olhando para quem vai receber."],
        goals: [{ text: "Aumentar desarmes por jogo em 15% nas próximas 10 partidas", metric: "tackles", direction: "up", delta: 0.15 }],
      },
      aerial: {
        label: "Bolas aéreas",
        explanation: "No jogo aéreo defensivo, Impulsão, Precisão de cabeceio e Força decidem.",
        primary: ["jumping", "headingAccuracy"], complementary: ["strength", "defAwareness"],
        playstyles: ["aerial", "bruiser"],
        tips: ["Posicione-se entre o atacante e o gol antes do cruzamento."],
        goals: [{ text: "Ganhar a maioria das bolas aéreas defensivas (autoavaliação)" }],
      },
    },
  },
  positioning: {
    key: "positioning", label: "Quero melhorar meu posicionamento", short: "Posicionamento", icon: "pos", metrics: ["involvements", "tackles"],
    question: "Em que fase do jogo?",
    variants: {
      attacking: {
        label: "Com a bola (ataque)",
        explanation: "Posicionamento ofensivo é atributo e hábito: estar entre linhas e atacar o espaço certo.",
        primary: ["attPositioning", "reactions"], complementary: ["vision", "acceleration"],
        playstyles: ["quickStep"],
        tips: ["Ocupe o espaço entre zagueiro e volante.", "Não fique na mesma linha de um companheiro."],
        goals: [{ text: "Aumentar participações em gol por jogo em 15% nas próximas 10 partidas", metric: "involvements", direction: "up", delta: 0.15 }],
      },
      defending: {
        label: "Sem a bola (defesa)",
        explanation: "Sem a bola, Noção defensiva e Interceptação definem onde o jogador fica e quanto espaço fecha.",
        primary: ["defAwareness", "interceptions"], complementary: ["reactions", "stamina"],
        playstyles: ["intercept", "anticipate"],
        tips: ["Volte para a linha do time antes de pressionar.", "Pressione em dupla, nunca sozinho longe da linha."],
        goals: [{ text: "Aumentar desarmes por jogo em 15% nas próximas 10 partidas", metric: "tackles", direction: "up", delta: 0.15 }],
      },
    },
  },
  goalkeeping: {
    key: "goalkeeping", label: "Quero jogar melhor como goleiro", short: "Goleiro", icon: "gk", metrics: ["savePct", "saves", "conceded"],
    question: "Onde você mais sofre?",
    variants: {
      shots: {
        label: "Chutes no gol",
        explanation: "Defesas de chute dependem de Reflexos e Elasticidade; Posicionamento (GOL) reduz o ângulo.",
        primary: ["gkReflexes", "gkDiving"], complementary: ["gkPositioning", "gkHandling"],
        playstyles: ["quickReflexes", "farReach"],
        tips: ["Evite mover o goleiro manualmente no último segundo — deixe o posicionamento trabalhar.", "Saia no 1×1 apenas quando o atacante tocar a bola longe."],
        goals: [{ text: "Subir o aproveitamento de defesas em 5 pontos nas próximas 10 partidas", metric: "savePct", direction: "up", delta: 5 }],
      },
      crosses: {
        label: "Cruzamentos e bolas aéreas",
        explanation: "Para sair bem do gol, Manejo e Posicionamento (GOL) importam; o estilo de cruzamento ajuda a segurar a bola.",
        primary: ["gkHandling", "gkPositioning"], complementary: ["jumping", "strength"],
        playstyles: ["crossClaimer", "rushOut"],
        tips: ["Só saia em cruzamentos na pequena área.", "Prefira socar quando houver muitos atacantes."],
        goals: [{ text: "Reduzir gols sofridos por jogo em 15% nas próximas 10 partidas", metric: "conceded", direction: "down", delta: 0.15 }],
      },
      distribution: {
        label: "Reposição / jogo com os pés",
        explanation: "Reposição depende de Chute (GOL) e do estilo de jogo com os pés.",
        primary: ["gkKicking"], complementary: ["shortPassing", "longPassing"],
        playstyles: ["footwork", "farThrow"],
        tips: ["Repõe rápido com as mãos para iniciar contra-ataques.", "Evite chutões quando houver saída curta segura."],
        goals: [passGoal],
      },
    },
  },
};

export function topicVariant(topic: TopicKey, variant?: string | null) {
  const t = TOPICS[topic];
  const key = variant && t.variants[variant] ? variant : Object.keys(t.variants)[0];
  return { topic: t, variantKey: key, variant: t.variants[key] };
}

export const isTopic = (v: unknown): v is TopicKey => typeof v === "string" && (TOPIC_KEYS as readonly string[]).includes(v);

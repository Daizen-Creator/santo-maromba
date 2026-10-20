import { Exercise } from '../../shared/types';
import DIRECT_YOUTUBE_LINKS from './exercise-youtube-links.json';

const BASE_EXERCISES: Exercise[] = [
  // PEITORAL
  {
    id: 'ex-supino-reto',
    name: 'Supino Reto com Barra',
    primaryMuscle: 'peitoral',
    secondaryMuscles: ['triceps', 'ombros'],
    equipment: 'Barra e Banco Reto',
    difficulty: 'intermediario',
    instructions: 'Deite-se no banco, pés firmes no chão, faça a retração e depressão escapular. Desça a barra de forma controlada até encostar no terço inferior do peito. Empurre explosivamente sem perder a retração.',
    commonErrors: 'Abrir excessivamente os cotovelos a 90 graus (risco ao manguito rotador) e perder o arco lombar natural.',
    alternatives: ['Supino com Halteres', 'Flexão de Braços', 'Supino Máquina']
  },
  {
    id: 'ex-supino-inclinado-halteres',
    name: 'Supino Inclinado com Halteres',
    primaryMuscle: 'peitoral',
    secondaryMuscles: ['ombros', 'triceps'],
    equipment: 'Banco 30° a 45° e Halteres',
    difficulty: 'intermediario',
    instructions: 'Ajuste o banco em aproximadamente 30 graus para focar na porção clavicular. Desça os halteres sentindo o alongamento do peitoral superior e pressione estendendo os cotovelos sem bater os pesos.',
    commonErrors: 'Inclinar o banco a mais de 45 graus, transferindo a carga quase toda para os deltoides anteriores.',
    alternatives: ['Supino Inclinado Barra', 'Crucifixo Inclinado']
  },
  {
    id: 'ex-crucifixo-cabo',
    name: 'Crossover na Polia Média/Baixa',
    primaryMuscle: 'peitoral',
    secondaryMuscles: ['ombros'],
    equipment: 'Polia Dupla',
    difficulty: 'iniciante',
    instructions: 'Mantenha os cotovelos levemente flexionados e fixos. Traga as mãos em direção à linha média do corpo esmagando o peitoral na contração de pico.',
    commonErrors: 'Dobrar e estender os braços como se fosse um supino, perdendo a tensão contínua do cabo.',
    alternatives: ['Crucifixo com Halteres', 'Peck Deck']
  },

  // COSTAS
  {
    id: 'ex-puxada-alta',
    name: 'Puxada Frontal na Polia',
    primaryMuscle: 'costas',
    secondaryMuscles: ['biceps', 'antebracos'],
    equipment: 'Polia Alta',
    difficulty: 'iniciante',
    instructions: 'Segure a barra com pegada pronada ligeiramente maior que a largura dos ombros. Inicie o movimento deprimindo as escápulas e puxe a barra em direção ao topo do peitoral.',
    commonErrors: 'Jogar o tronco excessivamente para trás usando impulso e balanço lombar.',
    alternatives: ['Barra Fixa', 'Puxada Triângulo']
  },
  {
    id: 'ex-remada-curvada',
    name: 'Remada Curvada com Barra',
    primaryMuscle: 'costas',
    secondaryMuscles: ['biceps', 'antebracos'],
    equipment: 'Barra Olímpica',
    difficulty: 'avancado',
    instructions: 'Flexione os joelhos levemente e incline o quadril para trás mantendo a coluna ereta em 45 graus. Puxe a barra em direção ao umbigo direcionando os cotovelos para trás.',
    commonErrors: 'Arredondar a coluna lombar por excesso de carga.',
    alternatives: ['Remada Cavalinho', 'Remada Baixa no Cabo', 'Remada Unilateral com Halter']
  },
  {
    id: 'ex-remada-serrote',
    name: 'Remada Unilateral com Halter (Serrote)',
    primaryMuscle: 'costas',
    secondaryMuscles: ['biceps', 'antebracos'],
    equipment: 'Halter e Banco Reto',
    difficulty: 'iniciante',
    instructions: 'Apoie o joelho e mão no banco. Com o outro braço, puxe o halter em direção ao quadril, mantendo o cotovelo próximo ao tronco e esmagando a dorsal.',
    commonErrors: 'Rotacionar o tronco excessivamente no topo da puxada.',
    alternatives: ['Remada Máquina Unilateral']
  },

  // OMBROS
  {
    id: 'ex-desenvolvimento-halteres',
    name: 'Desenvolvimento de Ombros com Halteres',
    primaryMuscle: 'ombros',
    secondaryMuscles: ['triceps'],
    equipment: 'Banco 80° e Halteres',
    difficulty: 'intermediario',
    instructions: 'Sente-se com as costas apoiadas. Segure os halteres na altura das orelhas e empurre verticalmente até a quase extensão dos cotovelos.',
    commonErrors: 'Deixar os halteres caírem muito abaixo dos ombros na descida ou hiperextender a coluna lombar.',
    alternatives: ['Desenvolvimento Militar com Barra', 'Desenvolvimento Máquina']
  },
  {
    id: 'ex-elevacao-lateral',
    name: 'Elevação Lateral com Halteres',
    primaryMuscle: 'ombros',
    secondaryMuscles: [],
    equipment: 'Halteres',
    difficulty: 'iniciante',
    instructions: 'Em pé ou sentado, incline o tronco ligeiramente para a frente. Eleve os braços lateralmente até a altura dos ombros, mantendo o punho alinhado com o cotovelo.',
    commonErrors: 'Usar impulso do quadril e levantar os halteres acima da linha da cabeça ativando excessivamente o trapézio.',
    alternatives: ['Elevação Lateral no Cabo', 'Elevação Lateral na Máquina']
  },

  // BÍCEPS & ANTEBRAÇOS
  {
    id: 'ex-rosca-direta',
    name: 'Rosca Direta com Barra W',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['antebracos'],
    equipment: 'Barra W',
    difficulty: 'iniciante',
    instructions: 'Mantenha os cotovelos colados ao tronco. Flexione os cotovelos subindo a barra sem balançar o corpo e desça controlando a fase excêntrica.',
    commonErrors: 'Balançar o corpo para frente e para trás para iniciar o movimento.',
    alternatives: ['Rosca com Halteres Alternada', 'Rosca Scott']
  },
  {
    id: 'ex-rosca-martelo',
    name: 'Rosca Martelo com Halteres',
    primaryMuscle: 'antebracos',
    secondaryMuscles: ['biceps'],
    equipment: 'Halteres',
    difficulty: 'iniciante',
    instructions: 'Com pegada neutra (palmas voltadas uma para a outra), flexione o cotovelo mantendo o foco no braquiorradial e braquial.',
    commonErrors: 'Afastar os cotovelos para os lados.',
    alternatives: ['Rosca Martelo na Corda (Polia)']
  },

  // TRÍCEPS
  {
    id: 'ex-triceps-corda',
    name: 'Tríceps na Polia com Corda',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: 'Polia Alta e Corda',
    difficulty: 'iniciante',
    instructions: 'Fixe os cotovelos ao lado das costelas. Estenda os braços para baixo e, no final da extensão, afaste as pontas da corda para máxima contração lateral.',
    commonErrors: 'Mover os cotovelos para a frente e para trás na fase excêntrica.',
    alternatives: ['Tríceps Barra Reta', 'Tríceps Testa', 'Tríceps Francês']
  },
  {
    id: 'ex-triceps-testa',
    name: 'Tríceps Testa com Barra W',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: 'Banco Reto e Barra W',
    difficulty: 'intermediario',
    instructions: 'Deitado no banco, posicione os braços ligeiramente inclinados para trás. Flexione apenas os antebraços descendo a barra em direção à testa/topo da cabeça.',
    commonErrors: 'Abrir os cotovelos lateralmente durante a execução.',
    alternatives: ['Tríceps Francês com Halter']
  },

  // QUADRÍCEPS
  {
    id: 'ex-agachamento-livre',
    name: 'Agachamento Livre com Barra',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['gluteos', 'abdomen'],
    equipment: 'Barra e Rack de Agachamento',
    difficulty: 'avancado',
    instructions: 'Apoie a barra no trapézio superior. Pés afastados na largura dos ombros, desça flexionando joelhos e quadril mantendo o peito erguido até pelo menos 90 graus.',
    commonErrors: 'Valgo dinâmico (joelhos colapsando para dentro) e flexão lombar na descida.',
    alternatives: ['Leg Press 45', 'Agachamento Hack', 'Agachamento Goblet']
  },
  {
    id: 'ex-leg-press-45',
    name: 'Leg Press 45 Graus',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['gluteos'],
    equipment: 'Aparelho Leg Press 45',
    difficulty: 'iniciante',
    instructions: 'Posicione os pés na plataforma na largura dos ombros. Destrave o aparelho e desça controladamente até formar um ângulo de 90° nos joelhos sem tirar a lombar do apoio.',
    commonErrors: 'Tirar o glúteo do encosto no ponto mais baixo e travar bruscamente os joelhos na extensão máxima.',
    alternatives: ['Agachamento Hack']
  },
  {
    id: 'ex-cadeira-extensora',
    name: 'Cadeira Extensora',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: [],
    equipment: 'Cadeira Extensora',
    difficulty: 'iniciante',
    instructions: 'Alinhe o eixo da máquina com a articulação do joelho. Estenda as pernas até a contração completa do quadríceps, segurando 1 segundo no topo antes de descer.',
    commonErrors: 'Chutar o peso rapidamente sem controlar a fase negativa.',
    alternatives: ['Agachamento Sissy']
  },

  // POSTERIORES & GLÚTEOS
  {
    id: 'ex-stiff',
    name: 'Stiff com Barra / Halteres',
    primaryMuscle: 'posteriores',
    secondaryMuscles: ['gluteos'],
    equipment: 'Barra ou Halteres',
    difficulty: 'intermediario',
    instructions: 'Joelhos com leve semiflexão estática. Empurre o quadril para trás enquanto desce o tronco com a coluna reta, sentindo o alongamento intenso dos isquiotibiais.',
    commonErrors: 'Curvar as costas para tentar descer o peso mais perto do chão.',
    alternatives: ['Levantamento Terra Romeno (RDL)', 'Mesa Flexora']
  },
  {
    id: 'ex-mesa-flexora',
    name: 'Mesa Flexora Deitada',
    primaryMuscle: 'posteriores',
    secondaryMuscles: [],
    equipment: 'Mesa Flexora',
    difficulty: 'iniciante',
    instructions: 'Deitado de bruços, flexione as pernas puxando o rolo em direção aos glúteos. Mantenha o quadril pressionado contra o banco.',
    commonErrors: 'Elevar o quadril do estofado na fase concêntrica para compensar peso excessivo.',
    alternatives: ['Cadeira Flexora']
  },
  {
    id: 'ex-elevacao-pelvica',
    name: 'Elevação Pélvica com Barra',
    primaryMuscle: 'gluteos',
    secondaryMuscles: ['posteriores'],
    equipment: 'Banco e Barra com Protetor',
    difficulty: 'intermediario',
    instructions: 'Apoie as escápulas no banco. Posicione a barra sobre a linha do quadril e empurre o chão com os calcanhares até o corpo formar uma linha reta entre ombros e joelhos.',
    commonErrors: 'Hiperextender a coluna lombar no topo da subida em vez de contrair os glúteos.',
    alternatives: ['Elevação Pélvica na Máquina']
  },

  // PANTURRILHAS & ABDÔMEN
  {
    id: 'ex-gemeos-em-pe',
    name: 'Elevação de Panturrilha em Pé',
    primaryMuscle: 'panturrilhas',
    secondaryMuscles: [],
    equipment: 'Máquina de Panturrilha ou Step',
    difficulty: 'iniciante',
    instructions: 'Apoie a ponta dos pés na borda. Desça os calcanhares para alongamento total e suba na ponta dos pés mantendo 1 segundo de contração no topo.',
    commonErrors: 'Quicar rapidamente sem explorar a amplitude articular completa.',
    alternatives: ['Panturrilha no Leg Press', 'Panturrilha Sentado']
  },
  {
    id: 'ex-abdominal-infra',
    name: 'Elevação de Pernas na Barra Fixa',
    primaryMuscle: 'abdomen',
    secondaryMuscles: [],
    equipment: 'Barra Fixa ou Paralela',
    difficulty: 'intermediario',
    instructions: 'Pendurado na barra, contraia o abdômen e eleve os joelhos ou pernas estendidas até a linha do quadril, enrolando a pelve.',
    commonErrors: 'Balançar as pernas usando impulso do quadril.',
    alternatives: ['Prancha Abdominal', 'Abdominal Supra na Polia']
  },
  {
    id: 'ex-flexao-inclinada', name: 'Flexão de Braços Inclinada', primaryMuscle: 'peitoral',
    secondaryMuscles: ['triceps', 'ombros'], equipment: 'Banco ou apoio firme', difficulty: 'iniciante',
    instructions: 'Apoie as mãos no banco um pouco além da largura dos ombros. Mantenha cabeça, tronco e quadril alinhados; desça o peito em direção ao apoio e empurre o chão.',
    commonErrors: 'Deixar o quadril cair ou afastar os cotovelos quase a 90 graus.', alternatives: ['Flexão no chão', 'Supino Máquina']
  },
  {
    id: 'ex-supino-maquina', name: 'Supino na Máquina', primaryMuscle: 'peitoral',
    secondaryMuscles: ['triceps', 'ombros'], equipment: 'Máquina de supino', difficulty: 'iniciante',
    instructions: 'Ajuste o assento para as alças ficarem na linha média do peito. Mantenha escápulas apoiadas, empurre sem travar os cotovelos e retorne devagar.',
    commonErrors: 'Usar um assento baixo demais ou deixar os ombros avançarem no final.', alternatives: ['Supino com Halteres', 'Flexão de Braços']
  },
  {
    id: 'ex-crucifixo-halter', name: 'Crucifixo com Halteres', primaryMuscle: 'peitoral',
    secondaryMuscles: ['ombros'], equipment: 'Banco e halteres', difficulty: 'intermediario',
    instructions: 'Deite-se com os pés apoiados. Com cotovelos suavemente flexionados, abra os braços até sentir alongamento confortável e feche sem bater os halteres.',
    commonErrors: 'Descer além da mobilidade do ombro ou transformar o movimento em supino.', alternatives: ['Crossover na Polia', 'Peck Deck']
  },
  {
    id: 'ex-remada-baixa', name: 'Remada Baixa com Triângulo', primaryMuscle: 'costas',
    secondaryMuscles: ['biceps', 'antebracos'], equipment: 'Polia baixa e triângulo', difficulty: 'iniciante',
    instructions: 'Sente-se com o tronco estável. Puxe o triângulo para a região do umbigo, aproximando as escápulas; volte estendendo os braços sem arredondar a lombar.',
    commonErrors: 'Balançar o tronco para roubar a puxada ou elevar os ombros.', alternatives: ['Remada Unilateral', 'Remada Curvada']
  },
  {
    id: 'ex-barra-fixa', name: 'Barra Fixa com Pegada Neutra', primaryMuscle: 'costas',
    secondaryMuscles: ['biceps', 'antebracos'], equipment: 'Barra com pegada neutra', difficulty: 'avancado',
    instructions: 'Segure as alças, firme o abdômen e inicie deprimindo as escápulas. Puxe o peito para as mãos e desça com controle; use elástico se precisar.',
    commonErrors: 'Chutar as pernas ou soltar o ombro no fundo do movimento.', alternatives: ['Puxada Frontal na Polia', 'Barra Fixa Assistida']
  },
  {
    id: 'ex-pullover-cabo', name: 'Pullover na Polia Alta', primaryMuscle: 'costas',
    secondaryMuscles: ['peitoral'], equipment: 'Polia alta e barra reta', difficulty: 'intermediario',
    instructions: 'Fique de frente para a polia com braços quase estendidos. Leve a barra em arco até as coxas mantendo o abdômen firme e retorne sem elevar os ombros.',
    commonErrors: 'Dobrar muito os cotovelos e transformar o exercício em tríceps.', alternatives: ['Pullover com Halter', 'Puxada Frontal']
  },
  {
    id: 'ex-face-pull', name: 'Face Pull com Corda', primaryMuscle: 'costas',
    secondaryMuscles: ['ombros'], equipment: 'Polia alta e corda', difficulty: 'iniciante',
    instructions: 'Ajuste a polia à altura do rosto. Puxe a corda em direção às têmporas separando as pontas e mantendo os cotovelos altos, sem arquear a lombar.',
    commonErrors: 'Usar carga que faça o tronco inclinar para trás.', alternatives: ['Crucifixo Inverso', 'Remada Alta com Corda']
  },
  {
    id: 'ex-desenvolvimento-maquina', name: 'Desenvolvimento na Máquina', primaryMuscle: 'ombros',
    secondaryMuscles: ['triceps'], equipment: 'Máquina de ombros', difficulty: 'iniciante',
    instructions: 'Ajuste o banco para as alças começarem na altura dos ombros. Empurre acima da cabeça sem perder o apoio das costas e desça até amplitude confortável.',
    commonErrors: 'Arquear a lombar ou descer as alças abaixo da mobilidade do ombro.', alternatives: ['Desenvolvimento com Halteres', 'Landmine Press']
  },
  {
    id: 'ex-crucifixo-inverso', name: 'Crucifixo Inverso na Máquina', primaryMuscle: 'ombros',
    secondaryMuscles: ['costas'], equipment: 'Peck deck reverso', difficulty: 'iniciante',
    instructions: 'Sente-se de frente para o encosto, ajuste as alças na linha dos ombros e abra os braços conduzindo o movimento pelos cotovelos.',
    commonErrors: 'Encolher os ombros ou usar impulso do tronco.', alternatives: ['Face Pull', 'Crucifixo Inverso com Halteres']
  },
  {
    id: 'ex-elevacao-frontal', name: 'Elevação Frontal com Halteres', primaryMuscle: 'ombros',
    secondaryMuscles: [], equipment: 'Halteres', difficulty: 'iniciante',
    instructions: 'Em pé, mantenha o abdômen firme e eleve um halter de cada vez até a altura do ombro, com cotovelo levemente flexionado; desça sem embalo.',
    commonErrors: 'Subir acima da cabeça ou inclinar o tronco para ganhar impulso.', alternatives: ['Elevação Frontal com Anilha', 'Desenvolvimento']
  },
  {
    id: 'ex-rosca-scott', name: 'Rosca Scott na Máquina', primaryMuscle: 'biceps',
    secondaryMuscles: ['antebracos'], equipment: 'Banco Scott ou máquina', difficulty: 'iniciante',
    instructions: 'Apoie os braços por completo no encosto. Flexione os cotovelos sem tirar os braços do apoio e retorne lentamente antes de estender totalmente.',
    commonErrors: 'Bater o peso no fim da descida ou tirar os cotovelos do apoio.', alternatives: ['Rosca Scott com Barra W', 'Rosca Alternada']
  },
  {
    id: 'ex-rosca-inclinada', name: 'Rosca Alternada no Banco Inclinado', primaryMuscle: 'biceps',
    secondaryMuscles: ['antebracos'], equipment: 'Banco inclinado e halteres', difficulty: 'intermediario',
    instructions: 'Sente-se com as costas apoiadas e braços pendendo. Flexione um cotovelo por vez sem projetar o ombro para frente e desça controlando.',
    commonErrors: 'Balançar os halteres ou estender o cotovelo com carga excessiva.', alternatives: ['Rosca Direta', 'Rosca Martelo']
  },
  {
    id: 'ex-triceps-frances', name: 'Tríceps Francês com Halter', primaryMuscle: 'triceps',
    secondaryMuscles: ['ombros'], equipment: 'Halter', difficulty: 'intermediario',
    instructions: 'Sentado ou em pé, segure o halter acima da cabeça. Flexione os cotovelos mantendo-os apontados para frente e estenda sem abrir os braços.',
    commonErrors: 'Abrir os cotovelos ou arquear a lombar para ajudar.', alternatives: ['Extensão de Tríceps na Polia', 'Tríceps Testa']
  },
  {
    id: 'ex-mergulho-banco', name: 'Mergulho no Banco', primaryMuscle: 'triceps',
    secondaryMuscles: ['ombros', 'peitoral'], equipment: 'Banco firme', difficulty: 'iniciante',
    instructions: 'Apoie as mãos na borda do banco e mantenha o quadril próximo. Flexione os cotovelos para trás em amplitude confortável e empurre para voltar.',
    commonErrors: 'Descer muito além da mobilidade do ombro ou afastar o quadril do apoio.', alternatives: ['Tríceps Corda', 'Flexão com Mãos Fechadas']
  },
  {
    id: 'ex-triceps-cabo-acima', name: 'Extensão de Tríceps Acima da Cabeça', primaryMuscle: 'triceps',
    secondaryMuscles: [], equipment: 'Polia baixa e corda', difficulty: 'intermediario',
    instructions: 'Fique de costas para a polia, cotovelos junto à cabeça. Estenda os braços à frente sem mover os ombros e retorne devagar.',
    commonErrors: 'Abrir os cotovelos ou movimentar o tronco durante a extensão.', alternatives: ['Tríceps Francês', 'Extensão Unilateral no Cabo']
  },
  {
    id: 'ex-flexao-punho', name: 'Flexão de Punho Sentado', primaryMuscle: 'antebracos',
    secondaryMuscles: ['biceps'], equipment: 'Barra leve ou halteres', difficulty: 'iniciante',
    instructions: 'Apoie os antebraços nas coxas com as palmas para cima. Deixe os punhos ultrapassarem os joelhos e flexione apenas a mão, sem impulso.',
    commonErrors: 'Usar carga alta ou tirar o antebraço do apoio.', alternatives: ['Rosca de Punho com Halteres', 'Rosca Martelo']
  },
  {
    id: 'ex-extensao-punho', name: 'Extensão de Punho Sentado', primaryMuscle: 'antebracos',
    secondaryMuscles: [], equipment: 'Barra leve ou halteres', difficulty: 'iniciante',
    instructions: 'Apoie os antebraços com as palmas voltadas para baixo. Eleve o dorso das mãos usando somente os punhos e retorne com controle.',
    commonErrors: 'Fazer movimentos rápidos ou deixar o cotovelo sair do apoio.', alternatives: ['Extensão de Punho com Halteres', 'Rosca Martelo']
  },
  {
    id: 'ex-agachamento-goblet', name: 'Agachamento Goblet', primaryMuscle: 'quadriceps',
    secondaryMuscles: ['gluteos', 'abdomen'], equipment: 'Halter ou kettlebell', difficulty: 'iniciante',
    instructions: 'Segure o peso junto ao peito. Afaste os pés na largura confortável, desça mantendo o joelho alinhado aos pés e suba empurrando o chão.',
    commonErrors: 'Deixar os joelhos caírem para dentro ou tirar os calcanhares do chão.', alternatives: ['Agachamento Livre', 'Leg Press']
  },
  {
    id: 'ex-afundo', name: 'Afundo Alternado', primaryMuscle: 'quadriceps',
    secondaryMuscles: ['gluteos'], equipment: 'Peso corporal ou halteres', difficulty: 'intermediario',
    instructions: 'Dê um passo confortável à frente e desça os quadris verticalmente. Mantenha o joelho da frente alinhado ao pé e empurre para retornar.',
    commonErrors: 'Passo curto que empurra o joelho para frente ou perda de equilíbrio por pressa.', alternatives: ['Passada Caminhando', 'Agachamento Goblet']
  },
  {
    id: 'ex-hack', name: 'Agachamento Hack', primaryMuscle: 'quadriceps',
    secondaryMuscles: ['gluteos'], equipment: 'Máquina Hack', difficulty: 'intermediario',
    instructions: 'Apoie costas e quadril no encosto e posicione os pés na largura dos ombros. Desça enquanto a lombar permanece apoiada e suba sem travar os joelhos.',
    commonErrors: 'Descer além da mobilidade mantendo o quadril colado ou travar os joelhos no topo.', alternatives: ['Leg Press', 'Agachamento Goblet']
  },
  {
    id: 'ex-bulgaro', name: 'Agachamento Búlgaro', primaryMuscle: 'quadriceps',
    secondaryMuscles: ['gluteos'], equipment: 'Banco e peso corporal ou halteres', difficulty: 'avancado',
    instructions: 'Apoie o peito do pé de trás no banco e mantenha o pé da frente firme. Desça em linha vertical até uma amplitude controlada e suba pelo calcanhar dianteiro.',
    commonErrors: 'Colocar o pé dianteiro muito perto do banco ou perder equilíbrio por excesso de carga.', alternatives: ['Afundo', 'Passada Reversa']
  },
  {
    id: 'ex-flexora-sentada', name: 'Mesa Flexora Sentada', primaryMuscle: 'posteriores',
    secondaryMuscles: [], equipment: 'Cadeira flexora', difficulty: 'iniciante',
    instructions: 'Ajuste os rolos acima dos tornozelos e alinhe o eixo ao joelho. Flexione as pernas até onde controle e volte lentamente sem soltar a carga.',
    commonErrors: 'Elevar o quadril ou deixar a pilha de pesos bater na volta.', alternatives: ['Mesa Flexora Deitada', 'Stiff com Halteres']
  },
  {
    id: 'ex-bom-dia', name: 'Bom Dia com Barra Leve', primaryMuscle: 'posteriores',
    secondaryMuscles: ['gluteos'], equipment: 'Barra leve', difficulty: 'avancado',
    instructions: 'Com a barra apoiada nos trapézios, flexione levemente os joelhos e leve o quadril para trás. Incline o tronco mantendo a coluna neutra e retorne contraindo os glúteos.',
    commonErrors: 'Arredondar a lombar ou usar carga que impeça controlar o movimento.', alternatives: ['Stiff', 'Extensão de Quadril no Cabo']
  },
  {
    id: 'ex-rdl-haltere', name: 'Levantamento Romeno com Halteres', primaryMuscle: 'posteriores',
    secondaryMuscles: ['gluteos'], equipment: 'Halteres', difficulty: 'intermediario',
    instructions: 'Segure os halteres junto às pernas. Empurre o quadril para trás com joelhos semiflexionados e coluna neutra; suba apertando os glúteos.',
    commonErrors: 'Transformar em agachamento ou afastar os halteres do corpo.', alternatives: ['Stiff com Barra', 'Pull-through no Cabo']
  },
  {
    id: 'ex-coice-cabo', name: 'Extensão de Quadril no Cabo', primaryMuscle: 'gluteos',
    secondaryMuscles: ['posteriores'], equipment: 'Polia baixa e tornozeleira', difficulty: 'iniciante',
    instructions: 'Prenda a tornozeleira, incline-se segurando o apoio e estenda a perna para trás sem arquear a lombar. Volte lentamente até o pé ficar sob o quadril.',
    commonErrors: 'Girar o quadril ou ganhar amplitude arqueando a coluna.', alternatives: ['Ponte de Glúteo', 'Elevação Pélvica']
  },
  {
    id: 'ex-abducao', name: 'Abdução de Quadril na Máquina', primaryMuscle: 'gluteos',
    secondaryMuscles: [], equipment: 'Máquina abdutora', difficulty: 'iniciante',
    instructions: 'Sente-se com a lombar apoiada e joelhos nas almofadas. Afaste as pernas em amplitude confortável e retorne sem deixar a carga bater.',
    commonErrors: 'Usar impulso ou abrir além da mobilidade do quadril.', alternatives: ['Abdução com Elástico', 'Caminhada Lateral com Faixa']
  },
  {
    id: 'ex-sumo', name: 'Levantamento Terra Sumô', primaryMuscle: 'gluteos',
    secondaryMuscles: ['quadriceps', 'posteriores'], equipment: 'Barra ou kettlebell', difficulty: 'avancado',
    instructions: 'Afaste os pés e aponte levemente as pontas para fora. Segure o peso entre as pernas, mantenha o peito aberto e empurre o chão para ficar em pé.',
    commonErrors: 'Arredondar as costas ou deixar os joelhos colapsarem para dentro.', alternatives: ['Agachamento Sumô', 'Elevação Pélvica']
  },
  {
    id: 'ex-panturrilha-sentado', name: 'Panturrilha Sentado', primaryMuscle: 'panturrilhas',
    secondaryMuscles: [], equipment: 'Máquina de panturrilha sentada', difficulty: 'iniciante',
    instructions: 'Apoie a parte anterior dos pés na plataforma. Desça os calcanhares até alongar e suba o máximo que conseguir sem quicar.',
    commonErrors: 'Usar amplitude curta e retirar os pés da plataforma.', alternatives: ['Panturrilha em Pé', 'Panturrilha no Leg Press']
  },
  {
    id: 'ex-panturrilha-legpress', name: 'Panturrilha no Leg Press', primaryMuscle: 'panturrilhas',
    secondaryMuscles: [], equipment: 'Leg press', difficulty: 'iniciante',
    instructions: 'Com a plataforma travada, apoie apenas a parte da frente dos pés. Flexione os tornozelos para descer e estenda controlando, mantendo os joelhos quase imóveis.',
    commonErrors: 'Destravar os joelhos ou descer a plataforma além do controle.', alternatives: ['Panturrilha Sentado', 'Panturrilha em Pé']
  },
  {
    id: 'ex-prancha', name: 'Prancha Frontal', primaryMuscle: 'abdomen',
    secondaryMuscles: ['ombros'], equipment: 'Colchonete', difficulty: 'iniciante',
    instructions: 'Apoie antebraços e pontas dos pés. Contraia abdômen e glúteos, mantendo cabeça, tronco e quadris alinhados; respire sem prender o ar.',
    commonErrors: 'Deixar a lombar afundar ou elevar demais o quadril.', alternatives: ['Dead Bug', 'Prancha com Joelhos Apoiados']
  },
  {
    id: 'ex-crunch-polia', name: 'Abdominal Crunch na Polia', primaryMuscle: 'abdomen',
    secondaryMuscles: [], equipment: 'Polia alta e corda', difficulty: 'intermediario',
    instructions: 'Ajoelhe-se diante da polia com a corda junto à cabeça. Flexione o tronco aproximando costelas e quadril, sem puxar com os braços.',
    commonErrors: 'Sentar sobre os calcanhares ou transformar o exercício em puxada de braço.', alternatives: ['Abdominal Supra', 'Crunch no Solo']
  },
  {
    id: 'ex-dead-bug', name: 'Dead Bug', primaryMuscle: 'abdomen',
    secondaryMuscles: [], equipment: 'Colchonete', difficulty: 'iniciante',
    instructions: 'Deite-se com braços apontados para cima e quadris e joelhos a 90 graus. Estenda devagar uma perna e o braço oposto mantendo a lombar estável.',
    commonErrors: 'Afastar a lombar do chão ou acelerar antes de dominar o controle.', alternatives: ['Prancha Frontal', 'Bird Dog']
  },
  {
    id: 'ex-pallof', name: 'Pallof Press', primaryMuscle: 'abdomen',
    secondaryMuscles: ['ombros'], equipment: 'Polia ou faixa elástica', difficulty: 'iniciante',
    instructions: 'Fique de lado para a polia, segure a alça junto ao peito e afaste as mãos à frente. Resista à rotação e retorne mantendo quadris nivelados.',
    commonErrors: 'Girar o tronco em direção à polia ou deslocar os pés durante a extensão.', alternatives: ['Prancha Lateral', 'Prancha Frontal']
  }
];

type ExerciseSeedRow = [
  id: string,
  name: string,
  primaryMuscle: Exercise['primaryMuscle'],
  equipment: string,
  difficulty: Exercise['difficulty'],
  instructions: string,
  executionTips: string,
  secondaryMuscles?: NonNullable<Exercise['secondaryMuscles']>
];

const EXERCISE_EXPANSION_ROWS: ExerciseSeedRow[] = [
  ['ex-supino-declinado-barra', 'Supino Declinado com Barra', 'peitoral', 'Banco declinado e barra', 'intermediario', 'Deite no banco declinado, fixe os pés e desça a barra até a parte inferior do peito antes de empurrar.', 'Use um observador, mantenha as escápulas apoiadas e não quique a barra no peito.', ['triceps', 'ombros']],
  ['ex-supino-declinado-halteres', 'Supino Declinado com Halteres', 'peitoral', 'Banco declinado e halteres', 'intermediario', 'Desça os halteres ao lado do peito em uma trajetória confortável e pressione sem bater os pesos.', 'Comece com carga leve para posicionar os halteres com segurança.', ['triceps', 'ombros']],
  ['ex-supino-maquina-reto', 'Supino Reto na Máquina', 'peitoral', 'Máquina de chest press', 'iniciante', 'Ajuste o assento para as alças ficarem na linha média do peito e empurre até quase estender os cotovelos.', 'Mantenha as costas apoiadas e controle o retorno sem deixar as placas baterem.', ['triceps', 'ombros']],
  ['ex-peck-deck', 'Crucifixo na Máquina Peck Deck', 'peitoral', 'Máquina peck deck', 'iniciante', 'Apoie as costas e aproxime os braços à frente do peito com cotovelos levemente flexionados.', 'Use amplitude sem desconforto no ombro e mantenha o mesmo ângulo dos cotovelos.', ['ombros']],
  ['ex-crucifixo-cabo-alto', 'Crossover de Cima para Baixo', 'peitoral', 'Polias altas e puxadores', 'iniciante', 'Traga os puxadores para baixo e à frente do tronco, aproximando as mãos sem arredondar os ombros.', 'Dê um passo à frente para estabilizar o corpo e evite usar impulso.', ['ombros']],
  ['ex-flexao-maos-elevadas', 'Flexão de Braços com Mãos Elevadas', 'peitoral', 'Banco ou apoio firme', 'iniciante', 'Apoie as mãos em um banco, alinhe o corpo e aproxime o peito do apoio antes de empurrar.', 'Mantenha quadril e tronco alinhados; use um apoio mais baixo conforme ganhar força.', ['triceps', 'ombros']],
  ['ex-flexao-declinada', 'Flexão de Braços com Pés Elevados', 'peitoral', 'Banco ou caixa firme', 'avancado', 'Eleve os pés, apoie as mãos no chão e faça a flexão mantendo o tronco firme.', 'Evite deixar a lombar arquear; reduza a altura do apoio se perder o controle.', ['triceps', 'ombros']],
  ['ex-crucifixo-cabo-unilateral', 'Crucifixo Unilateral na Polia', 'peitoral', 'Polia ajustável', 'intermediario', 'Posicione-se de lado para a polia e conduza a mão à frente do peito sem girar o tronco.', 'Mantenha o ombro baixo e use carga que permita controlar a volta.', ['ombros']],
  ['ex-pullover-corda', 'Pullover na Polia com Corda', 'costas', 'Polia alta e corda', 'intermediario', 'Com braços quase estendidos, leve a corda em direção às coxas usando a extensão dos ombros.', 'Mantenha costelas e pelve estáveis; não transforme o movimento em tríceps na polia.', ['antebracos']],
  ['ex-remada-baixa-triangulo', 'Remada Baixa com Triângulo', 'costas', 'Polia baixa e triângulo', 'iniciante', 'Puxe o triângulo em direção ao abdômen, mantendo o peito aberto e os cotovelos próximos ao corpo.', 'Evite balançar o tronco para iniciar cada repetição.', ['biceps', 'antebracos']],
  ['ex-puxada-supinada', 'Puxada Frontal com Pegada Supinada', 'costas', 'Polia alta e barra', 'iniciante', 'Puxe a barra em direção à parte alta do peito com as palmas voltadas para você.', 'Não puxe a barra atrás da nuca; mantenha os punhos alinhados aos antebraços.', ['biceps', 'antebracos']],
  ['ex-puxada-articulada', 'Puxada Articulada na Máquina', 'costas', 'Máquina articulada', 'iniciante', 'Ajuste o apoio das coxas e puxe os braços da máquina para baixo até os cotovelos chegarem ao tronco.', 'Inicie deprimindo as escápulas e retorne sem perder o controle.', ['biceps']],
  ['ex-remada-cavalinho', 'Remada Cavalinho com Barra', 'costas', 'Barra T ou landmine', 'intermediario', 'Incline o tronco com coluna neutra e puxe a barra em direção ao abdômen.', 'Mantenha o peso próximo do corpo e evite arredondar a lombar.', ['biceps', 'antebracos']],
  ['ex-remada-maquina-peito-apoiado', 'Remada na Máquina com Peito Apoiado', 'costas', 'Máquina de remada', 'iniciante', 'Apoie o peito, puxe as alças até o tronco e retorne estendendo os braços de forma controlada.', 'Não eleve os ombros durante a puxada.', ['biceps']],
  ['ex-pulldown-bracos-retos', 'Pulldown com Braços Estendidos', 'costas', 'Polia alta e barra reta', 'iniciante', 'Com cotovelos levemente flexionados, leve a barra da altura dos olhos até as coxas.', 'Mantenha o tronco firme e evite dobrar os cotovelos para puxar com o tríceps.', ['antebracos']],
  ['ex-barra-fixa-pronada', 'Barra Fixa com Pegada Pronada', 'costas', 'Barra fixa', 'avancado', 'Pendure-se com pegada pronada e eleve o corpo até o queixo ultrapassar a barra.', 'Comece com assistência se necessário e evite chutar as pernas para ganhar impulso.', ['biceps', 'antebracos']],
  ['ex-remada-baixa-aberta', 'Remada Baixa com Pegada Aberta', 'costas', 'Polia baixa e barra aberta', 'intermediario', 'Puxe a barra em direção à parte alta do abdômen mantendo cotovelos afastados moderadamente.', 'Não force a abertura dos cotovelos além da mobilidade do ombro.', ['biceps', 'ombros']],
  ['ex-remada-unilateral-polia', 'Remada Unilateral na Polia', 'costas', 'Polia ajustável e puxador', 'iniciante', 'Puxe o cotovelo em direção ao quadril sem girar o tronco.', 'Use a mão livre como apoio e mantenha a escápula móvel, sem encolher o ombro.', ['biceps']],
  ['ex-desenvolvimento-arnold', 'Desenvolvimento Arnold', 'ombros', 'Banco e halteres', 'intermediario', 'Parta com halteres à frente dos ombros e gire as palmas para fora ao empurrar acima da cabeça.', 'Use amplitude confortável e não arqueie a lombar para completar a repetição.', ['triceps']],
  ['ex-elevacao-lateral-cabo', 'Elevação Lateral na Polia', 'ombros', 'Polia baixa e puxador', 'iniciante', 'Eleve o braço lateralmente até próximo da altura do ombro contra a resistência do cabo.', 'Inicie com carga leve e mantenha o punho neutro.', []],
  ['ex-crucifixo-inverso-halteres', 'Crucifixo Inverso com Halteres', 'ombros', 'Halteres e banco inclinado', 'iniciante', 'Com o peito apoiado e braços abaixo dos ombros, abra os braços até a linha do tronco.', 'Use carga baixa para não transformar o movimento em balanço.', ['costas']],
  ['ex-desenvolvimento-ombros-maquina', 'Desenvolvimento de Ombros na Máquina', 'ombros', 'Máquina de desenvolvimento', 'iniciante', 'Ajuste o assento, empurre as alças acima da cabeça e retorne até uma posição confortável.', 'Mantenha as costas apoiadas e não bloqueie os cotovelos com força.', ['triceps']],
  ['ex-elevacao-frontal-anilha', 'Elevação Frontal com Anilha', 'ombros', 'Anilha', 'iniciante', 'Eleve a anilha à frente do corpo até a altura dos ombros e desça devagar.', 'Evite inclinar o tronco ou elevar acima da amplitude controlada.', []],
  ['ex-remada-alta-corda', 'Remada Alta na Polia com Corda', 'ombros', 'Polia baixa e corda', 'intermediario', 'Puxe a corda em direção à parte alta do peito com cotovelos conduzindo o movimento.', 'Interrompa a subida antes de qualquer pinçamento no ombro.', []],
  ['ex-rotacao-externa-cabo', 'Rotação Externa do Ombro na Polia', 'ombros', 'Polia baixa e puxador', 'iniciante', 'Com cotovelo junto ao tronco, gire o antebraço para fora contra a resistência leve.', 'Mantenha o cotovelo dobrado a 90 graus e não gire o tronco.', []],
  ['ex-rosca-scott-halter', 'Rosca Scott com Halter', 'biceps', 'Banco Scott e halter', 'iniciante', 'Apoie o braço no banco e flexione o cotovelo sem tirar o ombro do suporte.', 'Não estenda o cotovelo com impacto no final da descida.', ['antebracos']],
  ['ex-rosca-cabo', 'Rosca Direta na Polia', 'biceps', 'Polia baixa e barra', 'iniciante', 'Flexione os cotovelos contra o cabo mantendo os braços junto ao tronco.', 'Evite deixar os cotovelos avançarem no topo.', ['antebracos']],
  ['ex-rosca-concentrada', 'Rosca Concentrada', 'biceps', 'Halter', 'iniciante', 'Sentado, apoie o braço na parte interna da coxa e flexione o cotovelo com controle.', 'Mantenha o ombro quieto e use amplitude sem dor.', []],
  ['ex-rosca-inversa', 'Rosca Inversa com Barra W', 'antebracos', 'Barra W', 'intermediario', 'Segure a barra com pegada pronada e flexione os cotovelos sem mover os punhos.', 'Use carga menor que na rosca tradicional e mantenha os punhos alinhados.', ['biceps']],
  ['ex-rosca-punho', 'Flexão de Punhos com Barra', 'antebracos', 'Barra e banco', 'iniciante', 'Apoie os antebraços nas coxas e flexione os punhos para elevar a barra.', 'Faça o movimento apenas nos punhos e reduza a carga se houver desconforto.', []],
  ['ex-triceps-frances-halter', 'Tríceps Francês com Halter', 'triceps', 'Halter', 'iniciante', 'Segure um halter acima da cabeça e flexione os cotovelos para baixar o peso atrás da nuca.', 'Mantenha os cotovelos apontados para cima e use amplitude confortável.', ['ombros']],
  ['ex-triceps-corda-acima', 'Extensão de Tríceps Acima da Cabeça com Corda', 'triceps', 'Polia baixa e corda', 'intermediario', 'De costas para a polia, estenda os cotovelos à frente da cabeça sem mover os braços.', 'Evite abrir excessivamente as costelas e controle o retorno.', ['ombros']],
  ['ex-supino-fechado', 'Supino Fechado com Barra', 'triceps', 'Banco reto e barra', 'intermediario', 'Segure a barra um pouco mais estreita que os ombros e desça controlando até o peito.', 'Mantenha os punhos sobre os cotovelos e use um observador.', ['peitoral', 'ombros']],
  ['ex-triceps-coice', 'Tríceps Coice com Halteres', 'triceps', 'Halteres', 'iniciante', 'Incline o tronco, mantenha o braço junto ao corpo e estenda o cotovelo para trás.', 'Não balance o braço; a carga deve permitir extensão completa e controlada.', []],
  ['ex-triceps-unilateral-cabo', 'Extensão Unilateral de Tríceps na Polia', 'triceps', 'Polia alta e puxador', 'iniciante', 'Com o cotovelo ao lado do corpo, estenda o braço até contrair o tríceps.', 'Mantenha o ombro estável e faça cada lado com a mesma amplitude.', []],
  ['ex-hack-squat', 'Agachamento Hack', 'quadriceps', 'Máquina hack squat', 'intermediario', 'Apoie costas e ombros na máquina, flexione os joelhos e empurre a plataforma para voltar.', 'Mantenha os joelhos acompanhando a direção dos pés.', ['gluteos']],
  ['ex-agachamento-bulgaro', 'Agachamento Búlgaro', 'quadriceps', 'Banco e halteres opcionais', 'intermediario', 'Apoie o peito do pé atrás, desça o joelho traseiro e empurre pelo pé da frente.', 'Comece sem carga para ajustar equilíbrio e distância do banco.', ['gluteos']],
  ['ex-agachamento-frontal', 'Agachamento Frontal com Barra', 'quadriceps', 'Rack e barra', 'avancado', 'Apoie a barra na frente dos ombros e agache mantendo o tronco alto.', 'Use carga conservadora e prenda a barra no rack antes de iniciar.', ['costas', 'gluteos']],
  ['ex-passada-halteres', 'Passada Caminhando com Halteres', 'quadriceps', 'Halteres', 'intermediario', 'Dê um passo à frente, flexione ambos os joelhos e avance alternando as pernas.', 'Mantenha o joelho alinhado ao pé e escolha um espaço livre.', ['gluteos']],
  ['ex-terra-romeno', 'Levantamento Terra Romeno', 'posteriores', 'Barra ou halteres', 'intermediario', 'Leve o quadril para trás com joelhos levemente flexionados e desça o peso próximo às pernas.', 'Pare quando sentir alongamento mantendo a coluna neutra; não transforme em agachamento.', ['gluteos', 'costas']],
  ['ex-stiff-halter', 'Stiff com Halteres', 'posteriores', 'Halteres', 'intermediario', 'Desça os halteres ao lado das pernas enquanto o quadril recua e retorne contraindo os glúteos.', 'Use pouca flexão de joelho e mantenha os pesos próximos ao corpo.', ['gluteos']],
  ['ex-cadeira-flexora', 'Cadeira Flexora Sentada', 'posteriores', 'Máquina flexora sentada', 'iniciante', 'Ajuste o apoio das coxas e flexione os joelhos levando os calcanhares para baixo do assento.', 'Mantenha o quadril apoiado e faça a extensão lentamente.', []],
  ['ex-flexora-em-pe', 'Flexora Unilateral em Pé', 'posteriores', 'Máquina flexora em pé', 'iniciante', 'Flexione um joelho por vez sem inclinar o tronco ou girar o quadril.', 'Apoie as mãos na máquina e equalize a amplitude entre os lados.', []],
  ['ex-good-morning', 'Good Morning com Barra', 'posteriores', 'Rack e barra leve', 'avancado', 'Com a barra apoiada nas costas, leve o quadril para trás e incline o tronco mantendo a coluna neutra.', 'Comece com carga muito leve e interrompa antes de perder a posição lombar.', ['gluteos']],
  ['ex-nordic-curl', 'Flexão Nórdica de Joelhos', 'posteriores', 'Colchonete e apoio para os pés', 'avancado', 'Ajoelhe-se com os tornozelos fixos e incline o corpo à frente resistindo à queda.', 'Use assistência das mãos ou elástico enquanto desenvolve força; não force a amplitude.', []],
  ['ex-hip-thrust', 'Elevação Pélvica com Barra', 'gluteos', 'Banco e barra', 'intermediario', 'Apoie as escápulas no banco, empurre o chão e eleve o quadril até alinhar tronco e coxas.', 'Finalize contraindo os glúteos sem hiperestender a lombar.', ['posteriores']],
  ['ex-abducao-maquina', 'Abdução de Quadril na Máquina', 'gluteos', 'Máquina abdutora', 'iniciante', 'Com as costas apoiadas, afaste os joelhos contra a resistência e retorne devagar.', 'Evite impulsos e use amplitude sem desconforto no quadril.', []],
  ['ex-coice-polia', 'Extensão de Quadril na Polia', 'gluteos', 'Polia baixa e tornozeleira', 'iniciante', 'Com o tronco estável, leve a perna para trás sem arquear a lombar.', 'Mantenha a pelve alinhada e prefira uma carga leve.', ['posteriores']],
  ['ex-panturrilha-em-pe-maquina', 'Panturrilha em Pé na Máquina', 'panturrilhas', 'Máquina de panturrilha em pé', 'iniciante', 'Apoie a parte anterior dos pés, desça os calcanhares e suba até a contração completa.', 'Use uma pausa breve embaixo e em cima, sem quicar.', []],
  ['ex-panturrilha-unilateral', 'Panturrilha Unilateral no Degrau', 'panturrilhas', 'Degrau ou step', 'iniciante', 'Apoie uma mão para equilíbrio, desça o calcanhar e eleve o corpo usando uma perna.', 'Comece com peso corporal e mantenha o tornozelo alinhado.', []],
  ['ex-panturrilha-donkey', 'Panturrilha Donkey', 'panturrilhas', 'Máquina donkey ou apoio', 'intermediario', 'Incline o tronco com apoio estável e faça flexão plantar completa dos dois tornozelos.', 'Não use balanço do tronco para iniciar o movimento.', []],
  ['ex-elevacao-pernas', 'Elevação de Joelhos na Barra', 'abdomen', 'Barra fixa', 'intermediario', 'Pendure-se e eleve os joelhos em direção ao abdômen sem balançar o corpo.', 'Comece com joelhos flexionados e reduza o balanço entre repetições.', []],
  ['ex-crunch-reverso', 'Abdominal Crunch Reverso', 'abdomen', 'Colchonete', 'iniciante', 'Deitado, aproxime os joelhos do tronco elevando levemente o quadril e retorne devagar.', 'Evite embalar as pernas; inicie o movimento contraindo o abdômen.', []],
  ['ex-prancha-lateral', 'Prancha Lateral', 'abdomen', 'Colchonete', 'iniciante', 'Apoie antebraço e lateral do pé, eleve o quadril e mantenha o corpo alinhado.', 'Se necessário, apoie os joelhos no chão e mantenha o ombro longe da orelha.', ['ombros']],
  ['ex-abdominal-bicicleta', 'Abdominal Bicicleta Controlado', 'abdomen', 'Colchonete', 'iniciante', 'Deitado, aproxime cotovelo e joelho opostos alternadamente sem puxar a cabeça.', 'Gire o tronco com controle e mantenha a lombar confortável no chão.', []],
  ['ex-hollow-hold', 'Hollow Hold', 'abdomen', 'Colchonete', 'intermediario', 'Deite-se e eleve braços e pernas mantendo o abdômen contraído e a lombar apoiada.', 'Dobre os joelhos ou mantenha os braços ao lado do corpo para reduzir a dificuldade.', []],
  ['ex-woodchop', 'Rotação de Tronco na Polia', 'abdomen', 'Polia ajustável e puxador', 'intermediario', 'Puxe o cabo em diagonal através do tronco com os pés firmes e movimento controlado.', 'Não force a lombar; ajuste a rotação a partir do tronco e quadril.', ['ombros']],
  ['ex-farmer-walk', 'Caminhada do Fazendeiro', 'antebracos', 'Halteres ou kettlebells', 'intermediario', 'Segure os pesos ao lado do corpo e caminhe em passos curtos mantendo o tronco alto.', 'Escolha um trajeto livre e pare antes de perder a pegada ou a postura.', ['ombros', 'abdomen']],
  ['ex-dead-hang', 'Suspensão na Barra', 'antebracos', 'Barra fixa', 'iniciante', 'Segure a barra com pegada confortável e mantenha o corpo imóvel pelo tempo planejado.', 'Use apoio para entrar e sair da posição; interrompa se sentir dor no ombro.', ['costas']]
];

const EXERCISE_IMAGE_BY_MUSCLE: Record<Exercise['primaryMuscle'], { url: string; credit: string }> = {
  peitoral: { url: 'https://wger.de/media/exercise-images/192/Bench-press-1.png', credit: 'Everkinetic · CC BY-SA 3.0 · wger.de' },
  costas: { url: 'https://wger.de/media/exercise-images/81/a751a438-ae2d-4751-8d61-cef0e9292174.png', credit: 'Franpol · CC BY-SA 4.0 · wger.de' },
  ombros: { url: 'https://wger.de/media/exercise-images/256/b7def5bc-2352-499b-b9e5-fff741003831.png', credit: 'philip · CC BY-SA 4.0 · wger.de' },
  biceps: { url: 'https://wger.de/media/exercise-images/74/Bicep-curls-1.png', credit: 'Everkinetic · CC BY-SA 3.0 · wger.de' },
  antebracos: { url: 'https://wger.de/media/exercise-images/193/Preacher-curl-3-1.png', credit: 'Everkinetic · CC BY-SA 3.0 · wger.de' },
  triceps: { url: 'https://wger.de/media/exercise-images/50/695ced5c-9961-4076-add2-cb250d01089e.png', credit: 'Franpol · CC BY-SA 4.0 · wger.de' },
  quadriceps: { url: 'https://wger.de/media/exercise-images/203/1c052351-2af0-4227-aeb0-244008e4b0a8.jpeg', credit: 'philip · CC BY-SA 4.0 · wger.de' },
  posteriores: { url: 'https://wger.de/media/exercise-images/154/lying-leg-curl-machine-large-1.png', credit: 'Wger · CC BY-SA 4.0 · autor não informado' },
  gluteos: { url: 'https://wger.de/media/exercise-images/12/4a42cc6f-648d-40cc-a72a-c49dd47e1667.webp', credit: 'Wger · CC BY-SA 4.0 · autor não informado' },
  panturrilhas: { url: 'https://wger.de/media/exercise-images/146/8b284904-d072-4381-a256-4c81d8fd9c1f.png', credit: 'Wger · CC BY-SA 4.0 · autor não informado' },
  abdomen: { url: 'https://wger.de/media/exercise-images/91/Crunches-1.png', credit: 'Wger · CC BY-SA 3.0 · autor não informado' }
};

const DIRECT_YOUTUBE_URLS: Record<string, string> = DIRECT_YOUTUBE_LINKS;

const EXERCISE_EXPANSION: Exercise[] = EXERCISE_EXPANSION_ROWS.map(([
  id, name, primaryMuscle, equipment, difficulty, instructions, executionTips, secondaryMuscles = []
]) => ({
  id,
  name,
  primaryMuscle,
  secondaryMuscles,
  equipment,
  difficulty,
  description: instructions,
  instructions,
  executionTips,
  commonErrors: 'Reduza a carga se não conseguir manter a amplitude e o controle descritos.',
  alternatives: [],
  imageUrl: EXERCISE_IMAGE_BY_MUSCLE[primaryMuscle].url,
  imageCredit: EXERCISE_IMAGE_BY_MUSCLE[primaryMuscle].credit
}));

function makeExerciseYoutubeUrl(exercise: Exercise): string {
  return DIRECT_YOUTUBE_URLS[exercise.id]
    || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise.name} execução correta`)}`;
}

export const INITIAL_EXERCISES: Exercise[] = [...BASE_EXERCISES, ...EXERCISE_EXPANSION].map(exercise => ({
  ...exercise,
  description: exercise.description || exercise.instructions,
  executionTips: exercise.executionTips || exercise.commonErrors || 'Execute com controle e mantenha uma amplitude confortável.',
  imageUrl: exercise.imageUrl || EXERCISE_IMAGE_BY_MUSCLE[exercise.primaryMuscle].url,
  imageCredit: exercise.imageCredit || EXERCISE_IMAGE_BY_MUSCLE[exercise.primaryMuscle].credit,
  youtubeUrl: exercise.youtubeUrl || makeExerciseYoutubeUrl(exercise)
}));

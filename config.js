const API_URL = "https://script.google.com/macros/s/AKfycbxWfIp7kCSRHq89YysevQRLs6IiecdxdyYHmRu0jxP8iqf9nJPfCZWDdDKv1cOmmQI/exec";
const ATUALIZAR_A_CADA = 0; // segundos entre atualizações automáticas; 0 = desligado

const PESQUISA = {
  titulo: "Inteligência artificial e práticas de estudo",
  descricao: "Levantamento sobre como estudantes universitários usam ferramentas de IA nos estudos: com que frequência, para quê, com que cuidado de verificação e com que percepção de benefícios e riscos.",
  pergunta: "Existe relação entre o tempo dedicado ao uso de IA e a forma como os estudantes desenvolvem suas práticas de estudo?",
  hipotese: "Quem usa IA com mais frequência percebe mais facilidade para compreender conteúdos, tirar dúvidas e fazer atividades, e mais produtividade.",
  objetivo: "Descrever frequência, finalidade e conferência das respostas da IA, e comparar a percepção entre grupos de uso.",
  metodo: "Questionário online (Google Forms) com 15 perguntas, respondido por estudantes (amostra por conveniência).",
};

const FREQ = ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"];
const CONC = ["Discordo totalmente", "Discordo", "Nem concordo nem discordo", "Concordo", "Concordo totalmente"];
const SN = ["Sim", "Não"];

const Q = [
  { id: "q1", s: "Curso", match: "seu curso", open: true, t: "Qual é o seu curso?" },
  { id: "q2", s: "Período", match: "período/semestre", order: ["1º", "2º", "3º", "4º", "5º", "6º", "7º", "8º", "9º ou mais"], t: "Em qual período/semestre você está?" },
  { id: "q3", s: "Usa IA para estudar", match: "como apoio aos seus estudos", order: SN, t: "Você utiliza ferramentas de IA como apoio aos seus estudos?" },
  { id: "q4", s: "Frequência de uso", match: "frequência você utiliza Inteligência Artificial para estudar", order: ["Todos os dias", "Várias vezes por semana", "Uma vez por semana", "Algumas vezes por mês", "Raramente"], t: "Com que frequência você utiliza IA para estudar?" },
  { id: "ia", s: "IA mais usada", match: "qual i.a", poda: true, order: ["ChatGPT", "Gemini", "NotebookLM", "Claude", "Microsoft Copilot", "DeepSeek", "Perplexity", "Grok", "Meta AI", "Outra"], t: "Qual IA você mais costuma utilizar?" },
  { id: "q5", s: "Horas por semana", match: "quanto tempo por semana", order: ["Menos de 1 hora", "1 a 2 horas", "3 a 5 horas", "6 a 10 horas", "Mais de 10 horas"], t: "Quanto tempo por semana você usa IA em atividades de estudo?" },
  { id: "q6", s: "Atividades", match: "para quais atividades", multi: true, order: ["Tirar dúvidas", "Compreender conteúdos", "Resumir textos", "Resolver exercícios", "Pesquisar informações", "Estudar para provas", "Criar questões ou simulados", "Corrigir ou revisar textos", "Auxiliar em programação", "Realizar trabalhos e atividades", "Outra"], t: "Para quais atividades você usa IA durante os estudos? (várias respostas possíveis)" },
  { id: "q7", s: "Usa IA para aprender o que não entendeu", match: "aprender um conteúdo", order: FREQ, t: "Frequência de uso de IA para aprender um conteúdo que não compreendeu" },
  { id: "q8", s: "Usa IA para resolver exercícios", match: "resolver exercícios ou questões", order: FREQ, t: "Frequência de uso de IA para resolver exercícios ou questões" },
  { id: "q9", s: "Confere as respostas da IA", match: "verifica ou confere", order: FREQ, t: "Frequência com que verifica as informações fornecidas pela IA" },
  { id: "q11", s: "Rotina de estudos", match: "comparando com a forma", order: ["Melhorou muito", "Melhorou", "Permaneceu praticamente igual", "Piorou", "Piorou muito", "Não utilizava Inteligência Artificial anteriormente"], t: "Rotina de estudos hoje, comparada à anterior ao uso de IA" },
  { id: "q12", s: "Principal benefício", match: "principal benefício", order: ["Compreender conteúdos", "Esclarecer dúvidas", "Economizar tempo", "Aumentar a produtividade", "Resolver exercícios", "Auxiliar na preparação para provas", "Auxiliar na realização de trabalhos", "Outro"], t: "Principal benefício associado ao uso de IA nos estudos" },
  { id: "q13", s: "Principal risco", match: "principal dificuldade", order: ["Receber informações incorretas", "Tornar-se dependente da ferramenta", "Reduzir o esforço próprio durante os estudos", "Ter dificuldade para identificar erros nas respostas", "Plágio ou problemas de autoria", "Não compreender realmente o conteúdo", "Não percebo dificuldades ou riscos relevantes", "Outro"], t: "Principal dificuldade ou risco associado ao uso de IA nos estudos" },
  { id: "q14", s: "Avaliação geral", match: "de modo geral", order: ["Muito positivo", "Positivo", "Neutro", "Negativo", "Muito negativo", "Não tenho opinião formada", "Não utilizo Inteligência Artificial para estudar"], t: "Avaliação geral do uso de IA como apoio aos estudos" },
];

const LIK = [
  { match: "Facilita a compreensão", label: "Facilita a compreensão dos conteúdos" },
  { match: "esclarecer minhas dúvidas", label: "Ajuda a esclarecer minhas dúvidas" },
  { match: "Aumenta minha produtividade", label: "Aumenta minha produtividade" },
  { match: "Reduz o tempo necessário", label: "Reduz o tempo das atividades acadêmicas" },
  { match: "Contribui para minha preparação", label: "Contribui para a preparação para provas" },
];

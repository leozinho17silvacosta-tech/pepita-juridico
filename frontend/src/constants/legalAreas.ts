export interface LegalAreaGroup {
  group: string;
  options: string[];
}

export const LEGAL_AREA_GROUPS: LegalAreaGroup[] = [
  {
    group: "Trabalhista",
    options: [
      "Reclamação Trabalhista",
      "Rescisão Indireta",
      "Reversão de Justa Causa",
      "Reconhecimento de Vínculo / Pejotização",
      "Horas Extras e Banco de Horas",
      "Adicional de Insalubridade / Periculosidade",
      "Acidente de Trabalho / Doença Ocupacional",
      "Estabilidade Provisória (Gestante / CIPA / Acidente)",
      "Assédio Moral / Assédio Sexual / Dano Moral Trabalhista",
      "Defesa / Contestação Trabalhista (Empresa)",
      "Execução Trabalhista / Cumprimento de Sentença",
      "Recursos Trabalhistas (RO / RR / Agravo)",
      "Acordo Extrajudicial Trabalhista",
      "Equiparação Salarial / Acúmulo de Função",
      "Verbas Rescisórias / FGTS / Seguro-Desemprego",
    ],
  },
  {
    group: "Cível",
    options: [
      "Ação de Cobrança / Execução de Título",
      "Indenização por Danos Morais / Materiais",
      "Direito do Consumidor",
      "Revisão / Rescisão Contratual",
      "Usucapião / Direito Imobiliário / Despejo",
      "Obrigação de Fazer / Não Fazer",
      "Processo Extrajudicial",
    ],
  },
  {
    group: "Família e Sucessões",
    options: [
      "Divórcio (Consensual / Litigioso)",
      "Inventário e Partilha (Judicial / Extrajudicial)",
      "Pensão Alimentícia / Revisão / Execução de Alimentos",
      "Guarda e Regulamentação de Visitas",
      "Reconhecimento / Dissolução de União Estável",
      "Interdição / Curatela",
    ],
  },
  {
    group: "Previdenciário",
    options: [
      "Aposentadoria (Idade / Tempo / Especial / Invalidez)",
      "BPC / LOAS",
      "Auxílio-Doença / Auxílio-Acidente",
      "Pensão por Morte",
      "Revisão de Benefício / Planejamento Previdenciário",
    ],
  },
  {
    group: "Outros",
    options: ["Outro (Especificar no título)"],
  },
];

export const ALL_LEGAL_CASE_TYPES: string[] = LEGAL_AREA_GROUPS.flatMap(
  (g) => g.options,
);
